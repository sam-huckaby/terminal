import { z } from "zod";
import { Result } from "./common";
import { Card } from "@terminal/core/card/index";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { Examples } from "@terminal/core/examples";
import { Resource } from "sst";
import { Link } from "@terminal/core/link/index";
import { User } from "@terminal/core/user/index";
import { useUserID } from "@terminal/core/actor";

export module CardApi {
  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Card"],
        summary: "List cards",
        description: "List the credit cards associated with the current user.",
        responses: {
          200: {
            description: "List of cards associated with the user.",
            content: {
              "application/json": {
                schema: Result(
                  Card.Info.array().openapi({
                    example: [Examples.Card],
                    description: "List of cards associated with the user.",
                  }),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(
          {
            data: await Card.list(),
          },
          200,
        );
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Card"],
        summary: "Create card",
        description:
          "Attach a credit card (tokenized via Stripe) to the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.string().openapi({
                    example: Examples.Card.id,
                    description: "ID of the card.",
                  }),
                ),
              },
            },
            description: "ID of the card.",
          },
        },
      }),
      validator(
        "json",
        z.object({
          token: z.string().openapi({
            description:
              "Stripe card token. Learn how to [create one here](https://docs.stripe.com/api/tokens/create_card).",
            example: "tok_1N3T00LkdIwHu7ixt44h1F8k",
            externalDocs: {
              description: "Learn how to create a new Stripe card token here.",
              url: "https://docs.stripe.com/api/tokens/create_card",
            },
          }),
        }),
      ),
      async (c) => {
        const data = await Card.create(c.req.valid("json"));
        return c.json({ data }, 200);
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Card"],
        summary: "Delete card",
        description: "Delete a credit card associated with the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
              },
            },
            description: "Card was deleted successfully.",
          },
        },
      }),
      validator(
        "param",
        z.object({
          id: z.string().openapi({
            description: "ID of the card to delete.",
            example: Examples.Card.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        await Card.remove(param.id);
        return c.json({ data: "ok" as const }, 200);
      },
    )
    .post(
      "/collect",
      describeRoute({
        tags: ["Card"],
        summary: "Collect card",
        description:
          "Create a temporary URL for collecting credit card information for the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z
                    .object({
                      url: z.string().url().openapi({
                        example: Examples.Collect.url,
                        description:
                          "Temporary URL that allows a user to enter credit card details over https at terminal.shop.",
                      }),
                    })
                    .openapi({
                      example: { url: Examples.Collect.url },
                      description: "URL for collecting card information.",
                    }),
                ),
              },
            },
            description: "URL for collecting card information.",
          },
        },
      }),
      async (c) => {
        const authorization = c.req.header("authorization");
        const token = authorization?.replace("Bearer ", "");
        const user = await User.fromID(useUserID());
        const url = `${Resource.Urls.site}/pay?name=${user?.name?.split(" ")[0]}#${token}`;
        const id = await Link.create(url);
        return c.json({ data: { url: `${Resource.Urls.short}/${id}` } }, 200);
      },
    );
}
