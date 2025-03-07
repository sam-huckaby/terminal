import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "./common";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { Api } from "@terminal/core/api/api";
import { ErrorCodes, VisibleError } from "@terminal/core/error";

export module TokenApi {
  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Token"],
        summary: "List tokens",
        description: "List the current user's personal access tokens.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Api.Personal.Info.array().openapi({
                    description: "List of personal access tokens.",
                    example: [Examples.Token],
                  }),
                ),
              },
            },
            description: "List of personal access tokens.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const tokens = await Api.Personal.list();
        return c.json({ data: tokens }, 200);
      },
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Token"],
        summary: "Get token",
        description: "Get the personal access token with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Api.Personal.Info.openapi({
                    description: "Personal access token.",
                    example: Examples.Token,
                  }),
                ),
              },
            },
            description: "Personal access token.",
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
            description: "ID of the personal token to get.",
            example: Examples.Token.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        const token = await Api.Personal.fromID(param.id);
        if (!token)
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Personal token not found",
          );
        return c.json({ data: token }, 200);
      },
    )
    .post(
      "/",
      describeRoute({
        tags: ["Token"],
        summary: "Create token",
        description: "Create a personal access token.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    id: Api.Personal.Info.shape.id.openapi({
                      description: "Personal token ID.",
                      example: Examples.Token.id,
                    }),
                    token: Api.Personal.Info.shape.token.openapi({
                      description:
                        "Personal access token. Include this in the Authorization header (`Bearer <token>`) when accessing the Terminal API.",
                      example: Examples.Token.token,
                    }),
                  }),
                ),
              },
            },
            description: "Personal access token ID and value.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const token = await Api.Personal.create();
        return c.json({ data: token }, 200);
      },
    )
    .delete(
      "/:id",
      describeRoute({
        tags: ["Token"],
        summary: "Delete token",
        description: "Delete the personal access token with the given ID.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.literal("ok")),
              },
            },
            description: "Personal access token was deleted successfully.",
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
          id: Api.Personal.Info.shape.id.openapi({
            description: "ID of the personal token to delete.",
            example: Examples.Token.id,
          }),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param");
        await Api.Personal.remove(param.id);
        return c.json({ data: "ok" as const }, 200);
      },
    );
}
