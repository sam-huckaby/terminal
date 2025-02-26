import "zod-openapi/extend";
import { mysqlTable, unique, int, json } from "drizzle-orm/mysql-core";
import { cardTable } from "../card/card.sql";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";
import { productVariantTable } from "../product/product.sql";
import { userTable } from "../user/user.sql";
import { z } from "zod";
import { addressTable } from "../address/address.sql";

export const subscriptionTable = mysqlTable(
  "subscription",
  {
    ...id,
    ...timestamps,
    timeNext: timestamp("time_next"),
    userID: ulid("user_id")
      .references(() => userTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    schedule: json("schedule").$type<SubscriptionSchedule>(),
    productVariantID: ulid("product_variant_id")
      .references(() => productVariantTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    quantity: int("quantity").notNull(),
    addressID: ulid("shipping_id")
      .references(() => addressTable.id)
      .notNull(),
    cardID: ulid("card_id")
      .references(() => cardTable.id)
      .notNull(),
  },
  (table) => ({
    unique: unique("unique").on(table.userID, table.productVariantID),
  }),
);

export const SubscriptionSchedule = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("fixed"),
    })
    .openapi({ title: "fixed" }),
  z
    .object({
      type: z.literal("weekly"),
      interval: z.number().int().min(1),
    })
    .openapi({ title: "weekly" }),
]);
export type SubscriptionSchedule = z.infer<typeof SubscriptionSchedule>;
