import { z } from "zod";
import { authRequired, ErrorResponses, Result, validator } from "./common";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { Api } from "@terminal/core/api/api";
import { ErrorCodes, VisibleError } from "@terminal/core/error";

export namespace AppApi {
  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["App (OAuth)"],
        summary: "List apps",
        description: "List the current user's registered apps.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Api.Client.Info.array().openapi({
                    description: "List of apps.",
                    example: [Examples.App],
                  }),
                ),
                example: { data: [Examples.App] },
              },
            },
            description: "List of apps.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const apps = await Api.Client.list();
        return c.json({ data: apps }, 200);
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["App (OAuth)"],
        summary: "Get app",
        description: "Get the app with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Api.Client.Info.openapi({
                    description: "App.",
                    example: Examples.App,
                  }),
                ),
                example: { data: Examples.App },
              },
            },
            description: "App.",
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
            description: "ID of the app to get.",
            example: Examples.App.id,
          }),
        }),
      ),
      async (c) => {
        const data = await Api.Client.fromID(c.req.valid("param").id);
        if (!data) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "App not found",
          );
        }
        return c.json({ data }, 200);
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["App (OAuth)"],
        summary: "Create app",
        description: "Create an app.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    id: Api.Client.Info.shape.id.openapi({
                      description: "OAuth 2.0 client ID.",
                      example: Examples.App.id,
                    }),
                    secret: z.string().openapi({
                      description: "OAuth 2.0 client secret.",
                      example: Examples.App.secret,
                    }),
                  }),
                ),
                example: {
                  data: { id: Examples.App.id, secret: Examples.App.secret },
                },
              },
            },
            description: "OAuth 2.0 client ID and secret.",
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
        z.object({ name: z.string(), redirectURI: z.string() }).openapi({
          description: "Basic app information.",
          example: {
            name: Examples.App.name,
            redirectURI: Examples.App.redirectURI,
          },
        }),
      ),
      async (c) => {
        const app = await Api.Client.create(c.req.valid("json"));
        return c.json({ data: app }, 200);
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["App (OAuth)"],
        summary: "Delete app",
        description: "Delete the app with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
                example: { data: "ok" },
              },
            },
            description: "App was deleted successfully.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          403: ErrorResponses[403],
          404: ErrorResponses[404],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      validator(
        "param",
        z.object({
          id: Api.Client.Info.shape.id.openapi({
            description: "ID of the app to delete.",
            example: Examples.App.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        await Api.Client.remove(param.id);
        return c.json({ data: "ok" as const }, 200);
      },
    );
}
