import { handle } from "hono/aws-lambda";
import { create } from "opencontrol";
import { tool } from "opencontrol/tool";
import { z } from "zod";

import { db } from "@terminal/core/drizzle/index";
import { Inventory } from "@terminal/core/inventory/index";
import { Stripe } from "@terminal/core/stripe";
import { Resource } from "sst";

const database = tool({
  name: "database_query_readonly",
  description:
    "Readonly database query for MySQL, use this if there are no direct tools",
  args: z.object({ query: z.string() }),
  async run(input) {
    return db.transaction(async (tx) => tx.execute(input.query), {
      accessMode: "read only",
      isolationLevel: "read committed",
    });
  },
});

const inventory = tool({
  name: "inventory_record",
  description: "Record new inventory event to track in or out amounts",
  args: Inventory.record.schema,
  async run(input) {
    return Inventory.record(input);
  },
});

const stripe = tool({
  name: "stripe",
  description: "make a call to the stripe api",
  args: z.object({
    url: z.string().describe("Full url to call included query params"),
    method: z.string().optional().describe("HTTP method to use"),
    contentType: z
      .string()
      .optional()
      .describe("HTTP content type to use if not GET"),
    body: z
      .string()
      .optional()
      .describe("HTTP body to use, do not include for GET"),
  }),
  async run(input) {
    const response = await fetch(input.url, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${Resource.StripeSecret.value}`,
        "Content-Type": input.contentType,
      },
      body: input.body,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
});

const app = create({
  key: process.env.OPENCONTROL_KEY,
  tools: [database, inventory, stripe],
});

// @ts-ignore
export const handler = handle(app);
