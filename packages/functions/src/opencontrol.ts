import { db } from "@terminal/core/drizzle/index";
import { handle } from "hono/aws-lambda";
import { create } from "opencontrol";
import { tool } from "opencontrol/tool";
import { z } from "zod";

const app = create({
  key: process.env.OPENCONTROL_KEY,
  tools: [
    tool({
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
    }),
  ],
});

// @ts-ignore
export const handler = handle(app);
