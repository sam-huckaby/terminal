import { char, mysqlTable, text } from "drizzle-orm/mysql-core";
import { timestamp, timestamps, ulid } from "../drizzle/types";
import { userTable } from "../user/user.sql";

export const linkTable = mysqlTable("link", {
  id: char("id", { length: 8 }).primaryKey(),
  ...timestamps,
  timeExpired: timestamp("time_expired").notNull(),
  url: text("url").notNull(),
  userID: ulid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
});
