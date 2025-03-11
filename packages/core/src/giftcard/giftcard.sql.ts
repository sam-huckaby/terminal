import {
  decimal,
  mysqlTable,
  text,
} from "drizzle-orm/mysql-core";
import {
  dollar,
  id,
  timestamps,
  ulid,
} from "../drizzle/types";
import { orderTable } from "../order/order.sql";

export const giftCardTable = mysqlTable("gift_card", {
  ...id,
  ...timestamps,
  orderID: ulid("order_id")
    .references(() => orderTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  value: dollar("value").notNull(),
  balance: dollar("balance").notNull(),
  recipientEmail: text("recipient_email").notNull(),
});