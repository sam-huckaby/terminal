import { z } from "zod";
import { Result, validator, ErrorResponses } from "./common";
import { EmailOctopus } from "@terminal/core/email-octopus";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";

export module EmailApi {
  export const route = new Hono().post(
    "/",
    describeRoute({
      tags: ["Miscellaneous"],
      summary: "Subscribe email",
      description: "Subscribe to email updates from Terminal.",
      security: [],
      responses: {
        200: {
          content: {
            "application/json": {
              schema: Result(z.literal("ok")),
              example: { data: "ok" },
            },
          },
          description: "Email subscription was created.",
        },
        400: ErrorResponses[400],
        429: ErrorResponses[429],
        500: ErrorResponses[500],
      },
    }),
    validator(
      "json",
      z.object({
        email: z.string().email().min(1).openapi({
          description: "Email address to subscribe to Terminal updates with.",
          example: Examples.User.email,
        }),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      await EmailOctopus.subscribe({ email: body.email });
      return c.json({ data: "ok" as const }, 200);
    },
  );
}
