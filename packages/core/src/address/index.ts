import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { addressTable } from "./address.sql";
import { Common } from "../common";
import { Examples } from "../examples";
import { Shippo } from "../shippo";
import { cartTable } from "../cart/cart.sql";
import { subscriptionTable } from "../subscription/subscription.sql";
import { VisibleError, ErrorCodes } from "../error";
import { Actor } from "../actor";

export namespace Address {
  export const Inner = z
    .object({
      name: z.string().openapi({
        description: "The recipient's name.",
        example: Examples.Shipping.name,
      }),
      street1: z.string().openapi({
        description: "Street of the address.",
        example: Examples.Shipping.street1,
      }),
      street2: z.string().optional().openapi({
        description: "Apartment, suite, etc. of the address.",
        example: Examples.Shipping.street2,
      }),
      city: z.string().openapi({
        description: "City of the address.",
        example: Examples.Shipping.city,
      }),
      province: z.string().optional().openapi({
        description: "Province or state of the address.",
        example: Examples.Shipping.province,
      }),
      country: z
        .string()
        .length(2, "Country must be a 2 character country code (ISO 3166-1)")
        .openapi({
          description: "ISO 3166-1 alpha-2 country code of the address.",
          example: Examples.Shipping.country,
        }),
      zip: z.string().openapi({
        description: "Zip code of the address.",
        example: Examples.Shipping.zip,
      }),
      phone: z.string().optional().openapi({
        description: "Phone number of the recipient.",
        example: Examples.Shipping.phone,
      }),
    })
    .openapi({
      description: "Address information.",
      example: Examples.Address,
    });

  export type Inner = z.infer<typeof Inner>;

  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.Shipping.id,
      }),
      ...Inner.shape,
    })
    .openapi({
      ref: "Address",
      description: "Physical address associated with a Terminal shop user.",
      example: Examples.Shipping,
    });

  export type Info = z.infer<typeof Info>;

  export function list() {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(addressTable)
        .where(eq(addressTable.userID, Actor.userID()))
        .execute()
        .then((rows) => rows.map(serialize)),
    );
  }

  export const create = fn(Inner, (input) =>
    useTransaction(async (tx) => {
      await Shippo.assertValidAddress(input);
      const id = createID("userShipping");
      await tx.insert(addressTable).values({
        id,
        userID: Actor.userID(),
        address: input,
      });
      return id;
    }),
  );

  export const remove = fn(z.string(), (input) =>
    useTransaction(async (tx) => {
      const subscriptions = await tx
        .select()
        .from(subscriptionTable)
        .where(eq(subscriptionTable.addressID, input));
      if (subscriptions.length > 0) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.IN_USE,
          "Address is in use by a subscription, please cancel the subscription first.",
          "id",
        );
      }

      await tx
        .update(cartTable)
        .set({ addressID: null })
        .where(eq(cartTable.addressID, input));
      const response = await tx
        .delete(addressTable)
        .where(
          and(
            eq(addressTable.id, input),
            eq(addressTable.userID, Actor.userID()),
          ),
        );
      if (response.rowsAffected === 0) {
        throw new VisibleError(
          "not_found",
          ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
          "Address not found",
        );
      }
    }),
  );

  export const fromID = fn(Info.shape.id, (id) =>
    useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(addressTable)
        .where(
          and(eq(addressTable.id, id), eq(addressTable.userID, Actor.userID())),
        )
        .limit(1);
      return rows.map(serialize).at(0);
    }),
  );

  function serialize(
    input: typeof addressTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      name: input.address.name,
      street1: input.address.street1,
      street2: input.address.street2,
      city: input.address.city,
      province: input.address.province,
      country: input.address.country,
      zip: input.address.zip,
      phone: input.address.phone,
    };
  }
}
