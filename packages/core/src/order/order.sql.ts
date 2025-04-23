import {
  int,
  json,
  mysqlTable,
  text,
  unique,
  char,
} from "drizzle-orm/mysql-core";
import {
  address,
  dollar,
  id,
  ulid,
  timestamp,
  timestamps,
} from "../drizzle/types";
import { userTable } from "../user/user.sql";
import { productVariantTable } from "../product/product.sql";
import { Card } from "../card";
import { subscriptionTable } from "../subscription/subscription.sql";

export const orderTable = mysqlTable("order", {
  ...id,
  ...timestamps,
  email: text("email"),
  stripePaymentIntentID: text("stripe_payment_intent_id"),
  userID: ulid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
  shippingAddress: address("shipping_address").notNull(),
  shippingAmount: dollar("shipping_amount").notNull(),
  card: json("card").$type<Omit<Card.Info, "id" | "created">>(),
  trackingNumber: text("tracking_number"),
  trackingURL: text("tracking_url"),
  trackingStatus: text("tracking_status"),
  trackingStatusDetails: text("tracking_status_details"),
  trackingStatusUpdatedAt: timestamp("tracking_status_updated_at"),
  labelURL: text("label_url"),
  shippoRateID: text("shippo_rate_id"),
  shippoOrderID: text("shippo_order_id"),
  shippoLabelID: text("shippo_label_id"),
  timePrinted: timestamp("time_printed"),
  fulfiller: char("fulfiller", { length: 2 }).$type<"qc" | "lp">(),
});

export const orderItemTable = mysqlTable(
  "order_item",
  {
    ...id,
    ...timestamps,
    orderID: ulid("order_id")
      .references(() => orderTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    productVariantID: ulid("product_variant_id").references(
      () => productVariantTable.id,
      {
        onDelete: "cascade",
      },
    ),
    subscriptionID: ulid("subscription_id").references(() => subscriptionTable.id),
    description: text("description"),
    quantity: int("quantity").notNull(),
    amount: dollar("amount").notNull(),
    timeInventoryTracked: timestamp("time_inventory_tracked"),
  },
  (table) => ({
    unique: unique("unique").on(table.orderID, table.productVariantID),
  }),
);
