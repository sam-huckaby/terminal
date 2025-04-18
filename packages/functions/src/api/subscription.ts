import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "./common";
import { Subscription } from "@terminal/core/subscription/subscription";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { ErrorCodes, VisibleError } from "@terminal/core/error";
import { SubscriptionSchedule } from "@terminal/core/subscription/subscription.sql";

export namespace SubscriptionApi {
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
        Subscription.Info.omit({ id: true, created: true }).openapi({
          description: "Subscription information.",
          example: {
            ...Examples.Subscription,
            // @ts-ignore
            id: undefined,
            next: undefined,
            // @ts-ignore
            created: undefined,
          },
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
    )
    .put(
      "/:id",
      describeRoute({
        tags: ["Subscription"],
        summary: "Update subscription",
        description:
          "Update card, address, or interval for an existing subscription.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Subscription.Info.openapi({
                    description: "Updated subscription information.",
                    example: Examples.Subscription,
                  }),
                ),
                example: { data: Examples.Subscription },
              },
            },
            description: "Updated subscription information.",
          },
          400: ErrorResponses[400],
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
            description: "ID of the subscription to update.",
            example: Examples.Subscription.id,
          }),
        }),
      ),
      validator(
        "json",
        z
          .object({
            cardID: Subscription.Info.shape.cardID.optional().openapi({
              description: "New payment method ID for the subscription.",
              example: Examples.Subscription.cardID,
            }),
            addressID: Subscription.Info.shape.addressID.optional().openapi({
              description: "New shipping address ID for the subscription.",
              example: Examples.Subscription.addressID,
            }),
            schedule: SubscriptionSchedule.optional().openapi({
              description: "New schedule for the subscription.",
              example: Examples.Subscription.schedule,
            }),
          })
          .refine(
            (data) =>
              data.cardID !== undefined ||
              data.addressID !== undefined ||
              data.schedule !== undefined,
            { message: "At least one field must be provided for update" },
          ),
      ),
      async (c) => {
        const param = c.req.valid("param");
        const json = c.req.valid("json");
        await Subscription.update({
          id: param.id,
          cardID: json.cardID,
          addressID: json.addressID,
          schedule: json.schedule,
        });
        const subscription = await Subscription.fromID(param.id);
        return c.json({ data: subscription }, 200);
      },
    );
}
