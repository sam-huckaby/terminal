import { z } from "zod";
import { isNotNull, isNull, lt } from "drizzle-orm";
import { SubscriptionSchedule, subscriptionTable } from "./subscription.sql";
import { useTransaction, afterTx } from "../drizzle/transaction";
import { and, eq, sql } from "drizzle-orm";
import { Actor } from "../actor";
import { createID } from "../util/id";
import { fn } from "../util/fn";
import { productTable, productVariantTable } from "../product/product.sql";
import { Common } from "../common";
import { Examples } from "../examples";
import { DateTime } from "luxon";
import { Order } from "../order/order";
import { filter, groupBy, pipe, values } from "remeda";
import { ErrorCodes, VisibleError } from "../error";
import { Log } from "../util/log";
import { defineEvent } from "../event";
import { bus } from "sst/aws/bus";
import { Resource } from "sst";

export namespace Subscription {
  const log = Log.create({ namespace: "subscription" });
  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.Subscription.id,
      }),
      productVariantID: z.string().openapi({
        description: "ID of the product variant being subscribed to.",
        example: Examples.Subscription.productVariantID,
      }),
      quantity: z.number().int().openapi({
        description: "Quantity of the subscription.",
        example: Examples.Subscription.quantity,
      }),
      addressID: z.string().openapi({
        description: "ID of the shipping address used for the subscription.",
        example: Examples.Subscription.addressID,
      }),
      cardID: z.string().openapi({
        description: "ID of the card used for the subscription.",
        example: Examples.Subscription.cardID,
      }),
      schedule: SubscriptionSchedule.optional().openapi({
        description: "Schedule of the subscription.",
        example: Examples.Subscription.schedule,
      }),
      next: z.date().optional().openapi({
        description: "Next shipment and billing date for the subscription.",
        example: Examples.Subscription.next,
      }),
    })
    .openapi({
      ref: "Subscription",
      description: "Subscription to a Terminal shop product.",
      example: Examples.Subscription,
    });

  export type Info = z.infer<typeof Info>;

  export const Event = {
    Created: defineEvent(
      "subscription.created",
      z.object({
        subscriptionID: Info.shape.id,
      }),
    ),
  };

  export const list = () =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(subscriptionTable)
        .where(eq(subscriptionTable.userID, Actor.userID()))
        .then((rows) => rows.map(serialize)),
    );

  export const create = fn(Info.omit({ id: true }), async (input) =>
    useTransaction(async (tx) => {
      const id = createID("subscription");
      const product = await tx
        .select({
          subscription: productTable.subscription,
        })
        .from(productVariantTable)
        .innerJoin(
          productTable,
          eq(productVariantTable.productID, productTable.id),
        )
        .where(eq(productVariantTable.id, input.productVariantID))
        .then((rows) => rows[0]);
      if (!product)
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Product variant not found",
        );
      // if (!product?.subscription) {
      //   throw new Error("Product variant does not allow subscriptions");
      // }
      await tx
        .insert(subscriptionTable)
        .values({
          id,
          timeNext: input.schedule
            ? next({
                schedule: input.schedule,
                last: new Date(),
              })
            : undefined,
          userID: Actor.userID(),
          productVariantID: input.productVariantID,
          quantity: input.quantity,
          addressID: input.addressID,
          cardID: input.cardID,
          schedule: input.schedule,
        })
        .onDuplicateKeyUpdate({
          set: {
            quantity: sql`VALUES(quantity)`,
            addressID: sql`VALUES(shipping_id)`,
            cardID: sql`VALUES(card_id)`,
            schedule: sql`VALUES(schedule)`,
            timeDeleted: null,
          },
        });
      const subscription = await tx
        .select({
          id: subscriptionTable.id,
        })
        .from(subscriptionTable)
        .where(
          and(
            eq(subscriptionTable.userID, Actor.userID()),
            eq(subscriptionTable.productVariantID, input.productVariantID),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]!);

      await afterTx(() =>
        bus.publish(Resource.Bus, Event.Created, {
          subscriptionID: subscription.id,
        }),
      );

      return subscription.id;
    }),
  );

  export const remove = fn(z.string(), (input) =>
    useTransaction(async (tx) => {
      const response = await tx
        .delete(subscriptionTable)
        .where(
          and(
            eq(subscriptionTable.id, input),
            eq(subscriptionTable.userID, Actor.userID()),
          ),
        );
      if (response.rowsAffected === 0) {
        throw new VisibleError(
          "not_found",
          ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
          "Subscription not found",
        );
      }
    }),
  );

  export const fromID = fn(Info.shape.id, (id) =>
    useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(subscriptionTable)
        .where(
          and(
            eq(subscriptionTable.id, id),
            eq(subscriptionTable.userID, Actor.userID()),
          ),
        )
        .limit(1);
      return rows.map(serialize).at(0);
    }),
  );

  function serialize(
    input: typeof subscriptionTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      cardID: input.cardID,
      quantity: input.quantity,
      addressID: input.addressID,
      productVariantID: input.productVariantID,
      next: input.timeNext || undefined,
      schedule: input.schedule || undefined,
    };
  }

  export const next = fn(
    z.object({
      schedule: SubscriptionSchedule,
      last: z.date(),
    }),
    (input) => {
      if (input.schedule.type === "fixed") return null;
      return DateTime.fromJSDate(input.last)
        .toUTC()
        .startOf("week")
        .plus({ weeks: input.schedule.interval })
        .toJSDate();
    },
  );

  export async function process() {
    const subs = await useTransaction((tx) =>
      tx
        .select()
        .from(subscriptionTable)
        .where(
          and(
            isNotNull(subscriptionTable.timeNext),
            lt(subscriptionTable.timeNext, DateTime.now().toUTC().toJSDate()),
            isNull(subscriptionTable.timeDeleted),
          ),
        ),
    );

    log.info("processing", { subscriptions: subs.length });
    const grouped = pipe(
      subs,
      groupBy((s) => s.addressID),
      values(),
    );
    for (const group of grouped) {
      await Actor.provide(
        "system",
        {
          userID: group[0].userID,
        },
        async () => {
          log.info("creating order");
          const order = await Order.create({
            addressID: group[0].addressID,
            cardID: group[0].cardID,
            variants: Object.fromEntries(
              group.map(
                (item) => [item.productVariantID, item.quantity] as const,
              ),
            ),
          }).catch((ex) => {
            log.error(ex);
          });
          if (!order) return;
          for (const sub of group) {
            const n = next({
              schedule: sub.schedule!,
              last: sub.timeNext || new Date(),
            });

            await useTransaction(async (tx) => {
              await tx
                .update(subscriptionTable)
                .set({
                  timeNext: n,
                })
                .where(eq(subscriptionTable.id, sub.id));
            });
          }
        },
      );
    }
  }
}
