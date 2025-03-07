import { z } from "zod";
import { Result, ErrorResponses, validator, authRequired } from "./common";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { Address } from "@terminal/core/address/index";
import { ErrorCodes, VisibleError } from "@terminal/core/error";

export module AddressApi {
  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Address"],
        summary: "Get addresses",
        description:
          "Get the shipping addresses associated with the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Address.Info.array().openapi({
                    description: "Shipping addresses.",
                    example: [Examples.Shipping],
                  }),
                ),
              },
            },
            description: "Shipping addresses.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const data = await Address.list();
        return c.json({ data }, 200);
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Address"],
        summary: "Get address",
        description: "Get the shipping address with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Address.Info.openapi({
                    description: "Shipping address.",
                    example: Examples.Shipping,
                  }),
                ),
              },
            },
            description: "Shipping address.",
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
          id: Address.Info.shape.id.openapi({
            description: "ID of the shipping address to get.",
            example: Examples.Shipping.id,
          }),
        }),
      ),
      async (c) => {
        const data = await Address.fromID(c.req.valid("param").id);
        if (!data) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Address not found",
          );
        }
        return c.json({ data }, 200);
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Address"],
        summary: "Create address",
        description: "Create and add a shipping address to the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Address.Info.shape.id.openapi({
                    description: "Shipping address ID.",
                    example: Examples.Shipping.id,
                  }),
                ),
              },
            },
            description: "Shipping address ID.",
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
        Address.Inner.openapi({
          description: "Address information.",
          example: Examples.Address,
        }),
      ),
      async (c) => {
        const addressID = await Address.create(c.req.valid("json"));
        return c.json({ data: addressID }, 200);
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Address"],
        summary: "Delete address",
        description: "Delete a shipping address from the current user.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
              },
            },
            description: "Shipping address was deleted successfully.",
          },
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
          id: Address.Info.shape.id.openapi({
            description: "ID of the shipping address to delete.",
            example: Examples.Shipping.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        await Address.remove(param.id);
        return c.json({ data: "ok" as const }, 200);
      },
    );
}
