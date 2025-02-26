import { z } from "zod";
import { isNull, lt } from "drizzle-orm";
import {
  SubscriptionFrequency,
  SubscriptionSchedule,
  subscriptionTable,
} from "./subscription.sql";
import { useTransaction } from "../drizzle/transaction";
import { and, eq, sql } from "drizzle-orm";
import { ActorContext, useUserID } from "../actor";
import { createID } from "../util/id";
import { fn } from "../util/fn";
import { productTable, productVariantTable } from "../product/product.sql";
import { Common } from "../common";
import { Examples } from "../examples";
import { DateTime } from "luxon";
import { Order } from "../order/order";
import { filter, groupBy, pipe, values } from "remeda";

export module Subscription {
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
      frequency: SubscriptionFrequency.openapi({
        description: "Frequency of the subscription.",
        example: Examples.Subscription.frequency,
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

  export const list = () =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(subscriptionTable)
        .where(eq(subscriptionTable.userID, useUserID()))
        .then((rows) =>
          rows.map(
            (r): Info => ({
              id: r.id,
              cardID: r.cardID,
              quantity: r.quantity,
              frequency: r.frequency,
              addressID: r.addressID,
              productVariantID: r.productVariantID,
              next: r.timeNext || undefined,
              schedule: r.schedule || undefined,
            }),
          ),
        ),
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
      if (!product) throw new Error("Product variant not found");
      // if (!product?.subscription) {
      //   throw new Error("Product variant does not allow subscriptions");
      // }
      if (product.subscription === "required" && input.frequency !== "fixed") {
        throw new Error(
          "Subscription frequency must be 'fixed' for this product",
        );
      }
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
          userID: useUserID(),
          productVariantID: input.productVariantID,
          quantity: input.quantity,
          addressID: input.addressID,
          cardID: input.cardID,
          frequency: input.frequency,
          schedule:
            input.frequency === "fixed"
              ? {
                  type: "fixed",
                }
              : input.schedule,
        })
        .onDuplicateKeyUpdate({
          set: {
            quantity: sql`VALUES(quantity)`,
            addressID: sql`VALUES(shipping_id)`,
            cardID: sql`VALUES(card_id)`,
            frequency: sql`VALUES(frequency)`,
            schedule: sql`VALUES(schedule)`,
            timeDeleted: null,
          },
        });
    }),
  );

  export const next = fn(
    z.object({
      schedule: SubscriptionSchedule,
      last: z.date(),
    }),
    (input) => {
      if (input.schedule.type === "fixed") return undefined;
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
            lt(subscriptionTable.timeNext, DateTime.now().toUTC().toJSDate()),
            isNull(subscriptionTable.timeDeleted),
          ),
        ),
    );

    console.log("processing", subs.length, "subscriptions");
    const grouped = pipe(
      subs,
      filter((s) => s.schedule?.type === "weekly"),
      groupBy((s) => s.productVariantID),
      values(),
    );
    for (const group of grouped) {
      await ActorContext.with(
        {
          type: "user",
          properties: {
            userID: group[0].userID,
          },
        },
        async () => {
          console.log("creating order for", group[0].userID);
          const order = await Order.create({
            addressID: group[0].addressID,
            cardID: group[0].cardID,
            variants: Object.fromEntries(
              group.map((s) => [s.productVariantID, s.quantity] as const),
            ),
          }).catch((ex) => {
            console.log("error creating order");
            console.error(ex);
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

  export const remove = fn(z.string(), (input) =>
    useTransaction(async (tx) => {
      await tx
        .delete(subscriptionTable)
        .where(
          and(
            eq(subscriptionTable.id, input),
            eq(subscriptionTable.userID, useUserID()),
          ),
        );
    }),
  );
}
