import { create } from "opencontrol";
import { tool } from "opencontrol/tool";

import { handle } from "hono/aws-lambda";
import { z } from "zod";
import { tools } from "sst/opencontrol";
import { db } from "@terminal/core/drizzle/index";
import { Inventory } from "@terminal/core/inventory/index";
import { Resource } from "sst";
import { createAnthropic } from "@ai-sdk/anthropic";
import { bedrock } from "@ai-sdk/amazon-bedrock";

const databaseRead = tool({
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

const databaseWrite = tool({
  name: "database_query_write",
  description:
    "DANGEROUS operation that writes to the database. You MUST triple check with the user before using this tool - show them the query you are about to run.",
  args: z.object({ query: z.string() }),
  async run(input) {
    return db.transaction(async (tx) => tx.execute(input.query), {
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
    method: z.string().describe("HTTP method to use"),
    path: z.string().describe("Path to call"),
    query: z.record(z.string()).optional().describe("Query params"),
    contentType: z.string().optional().describe("HTTP content type to use"),
    body: z.string().optional().describe("HTTP body to use if it is not GET"),
  }),
  async run(input) {
    const url = new URL("https://api.stripe.com" + input.path);
    if (input.query) url.search = new URLSearchParams(input.query).toString();
    const response = await fetch(url.toString(), {
      method: input.method,
      headers: {
        Authorization: `Bearer ${Resource.StripeSecret.value}`,
        "Content-Type": input.contentType,
      },
      body: input.body ? input.body : undefined,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.text();
  },
});

const app = create({
  model: bedrock("us.anthropic.claude-3-7-sonnet-20250219-v1:0"),
  tools: [databaseRead, databaseWrite, inventory, stripe, ...tools],
});

export const handler = handle(app);
