import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "./common";
import { Subscription } from "@terminal/core/subscription/subscription";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { ErrorCodes, VisibleError } from "@terminal/core/error";

export module SubscriptionApi {
  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Subscription"],
        summary: "List subscriptions",
        description: "List the subscriptions associated with the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Subscription.Info.array().openapi({
                    description: "List of subscriptions.",
                    example: [Examples.Subscription],
                  }),
                ),
                example: { data: [Examples.Subscription] },
              },
            },
            description: "List of subscriptions.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const data = await Subscription.list();
        return c.json(
          {
            data,
          },
          200,
        );
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Subscription"],
        summary: "Get subscription",
        description: "Get the subscription with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Subscription.Info.openapi({
                    description: "Subscription information.",
                    example: Examples.Subscription,
                  }),
                ),
                example: { data: Examples.Subscription },
              },
            },
            description: "Subscription information.",
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
          id: Subscription.Info.shape.id.openapi({
            description: "ID of the subscription to get.",
            example: Examples.Subscription.id,
          }),
        }),
      ),
      async (c) => {
        const data = await Subscription.fromID(c.req.valid("param").id);
        if (!data) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Subscription not found",
          );
        }
        return c.json({ data }, 200);
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Subscription"],
        summary: "Subscribe",
        description: "Create a subscription for the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
                example: { data: "ok" },
              },
            },
            description: "Subscription was created successfully.",
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
        Subscription.Info.omit({ id: true }).openapi({
          description: "Subscription information.",
          // @ts-ignore
          example: { ...Examples.Subscription, id: undefined, next: undefined },
        }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        await Subscription.create(body);
        return c.json({ data: "ok" as const }, 200);
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Subscription"],
        summary: "Cancel",
        description: "Cancel a subscription for the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
                example: { data: "ok" },
              },
            },
            description: "Subscription was cancelled successfully.",
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
          id: Subscription.Info.shape.id.openapi({
            description: "ID of the subscription to cancel.",
            example: Examples.Subscription.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        await Subscription.remove(param.id);
        return c.json({ data: "ok" as const }, 200);
      },
    );
}
