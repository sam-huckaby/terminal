import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "./common";
import { Card } from "@terminal/core/card/index";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";

import { Examples } from "@terminal/core/examples";
import { Resource } from "sst";
import { Link } from "@terminal/core/link/index";
import { User } from "@terminal/core/user/index";
import { useUserID } from "@terminal/core/actor";
import { ErrorCodes, VisibleError } from "@terminal/core/error";

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
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        return c.json(
          {
            data: await Card.list(),
          },
          200,
        );
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Card"],
        summary: "Get card",
        description:
          "Get a credit card by ID associated with the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Card.Info.openapi({
                    description: "Credit card.",
                    example: Examples.Card,
                  }),
                ),
              },
            },
            description: "Credit card details.",
          },
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator(
        "param",
        z.object({
          id: z.string().openapi({
            description: "ID of the card to get.",
            example: Examples.Card.id,
          }),
        }),
      ),
      async (c) => {
        const data = await Card.fromID(c.req.valid("param").id);
        if (!data) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Card not found",
          );
        }
        return c.json({ data }, 200);
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
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
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
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          403: ErrorResponses[403],
          404: ErrorResponses[404],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
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
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
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
