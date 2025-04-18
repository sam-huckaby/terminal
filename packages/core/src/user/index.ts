import { eq, and, getTableColumns, isNull, asc, inArray } from "drizzle-orm";
import { db } from "../drizzle";
import { userFingerprintTable, userTable } from "./user.sql";
import { z } from "zod";
import { fn } from "../util/fn";
import { stripe } from "../stripe";
import { createID } from "../util/id";
import {
  createTransaction,
  afterTx,
  useTransaction,
} from "../drizzle/transaction";
import { defineEvent } from "../event";
import { bus } from "sst/aws/bus";
import { Resource } from "sst";
import { Card } from "../card";
import { orderTable } from "../order/order.sql";
import { subscriptionTable } from "../subscription/subscription.sql";
import { Common } from "../common";
import { Examples } from "../examples";
import { addressTable } from "../address/address.sql";

export namespace User {
  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.User.id,
      }),
      name: z.string().nullable().openapi({
        description: "Name of the user.",
        example: Examples.User.name,
      }),
      email: z.string().nullable().openapi({
        description: "Email address of the user.",
        example: Examples.User.email,
      }),
      fingerprint: z.string().nullable().openapi({
        description:
          "The user's fingerprint, derived from their public SSH key.",
        example: Examples.User.fingerprint,
      }),
      stripeCustomerID: z.string().openapi({
        description: "Stripe customer ID of the user.",
        example: Examples.User.stripeCustomerID,
      }),
    })
    .openapi({
      ref: "User",
      description: "A Terminal shop user. (We have users, btw.)",
      example: Examples.User,
    });

  export const Events = {
    Created: defineEvent(
      "user.created",
      z.object({
        userID: Info.shape.id,
      }),
    ),
    Updated: defineEvent(
      "user.updated",
      z.object({
        userID: Info.shape.id,
      }),
    ),
  };

  export const create = fn(
    z.object({
      fingerprint: Info.shape.fingerprint.optional(),
      email: z.string().optional(),
    }),
    async (input) => {
      const id = createID("user");
      const customer = await stripe.customers.create({
        email: input.email,
        metadata: {
          userID: id,
        },
      });
      await createTransaction(async (tx) => {
        await tx.insert(userTable).values({
          id,
          email: input.email ?? customer?.email,
          name: customer?.name,
          stripeCustomerID: customer!.id,
        });
        if (input.fingerprint)
          await tx.insert(userFingerprintTable).values({
            userID: id,
            fingerprint: input.fingerprint,
          });
        await afterTx(() =>
          bus.publish(Resource.Bus, Events.Created, { userID: id }),
        );
        await Card.sync(customer!.id);
      });
      return id;
    },
  );

  export const merge = fn(z.string().array(), async (ids) => {
    const primary = ids.shift();
    if (!primary) throw new Error("No primary user");
    await useTransaction(async (tx) => {
      await tx
        .update(userFingerprintTable)
        .set({
          userID: primary,
        })
        .where(inArray(userFingerprintTable.userID, ids));

      await tx
        .update(orderTable)
        .set({
          userID: primary,
        })
        .where(inArray(orderTable.userID, ids));

      await tx
        .update(addressTable)
        .set({
          userID: primary,
        })
        .where(inArray(addressTable.userID, ids));

      // do not merge cards for now
      // await tx
      //   .update(cardTable)
      //   .set({
      //     userID: primary,
      //   })
      //   .where(inArray(cardTable.userID, ids));

      await tx
        .update(subscriptionTable)
        .set({
          userID: primary,
        })
        .where(inArray(subscriptionTable.userID, ids));

      await tx
        .update(userTable)
        .set({
          timeDeleted: new Date(),
        })
        .where(inArray(userTable.id, ids));
    });

    return primary;
  });

  export const update = fn(
    Info.pick({ name: true, email: true, id: true }).partial({
      name: true,
      email: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        await afterTx(() =>
          bus.publish(Resource.Bus, Events.Updated, {
            userID: input.id,
          }),
        );
        await tx
          .update(userTable)
          .set({
            name: input.name,
            email: input.email,
          })
          .where(eq(userTable.id, input.id));
      }),
  );

  export const fromFingerprint = fn(z.string(), async (fingerprint) =>
    db
      .select(getTableColumns(userTable))
      .from(userFingerprintTable)
      .innerJoin(userTable, eq(userTable.id, userFingerprintTable.userID))
      .where(eq(userFingerprintTable.fingerprint, fingerprint))
      .then((rows) => rows.map(serialize).at(0)),
  );

  export const fromID = fn(Info.shape.id, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  export const fromEmail = fn(z.string(), async (email) =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.email, email), isNull(userTable.timeDeleted)))
        .orderBy(asc(userTable.timeCreated))
        .then((rows) => rows.map(serialize)),
    ),
  );

  export const fromCustomerID = fn(Info.shape.stripeCustomerID, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.stripeCustomerID, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  function serialize(
    input: typeof userTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      name: input.name,
      email: input.email,
      fingerprint: input.fingerprint,
      stripeCustomerID: input.stripeCustomerID,
    };
  }
}
