import { z } from "zod";
import { Result, validator, ErrorResponses, authRequired } from "./common";
import { User } from "@terminal/core/user/index";
import { useUserID } from "@terminal/core/actor";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";

export module ProfileApi {
  export const Profile = z
    .object({
      user: User.Info,
    })
    .openapi({
      ref: "Profile",
      description: "A Terminal shop user's profile. (We have users, btw.)",
      example: Examples.Profile,
    });

  export const route = new Hono()
    .get(
      "/",
      describeRoute({
        tags: ["Profile"],
        summary: "Get profile",
        description: "Get the current user's profile.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Profile.openapi({
                    description: "User profile information.",
                    example: Examples.Profile,
                  }),
                ),
              },
            },
            description: "User profile information.",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      async (c) => {
        const user = await User.fromID(useUserID());
        return c.json({ data: { user } }, 200);
      },
    )
    .put(
      "/",
      describeRoute({
        tags: ["Profile"],
        summary: "Update profile",
        description: "Update the current user's profile.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Profile.openapi({
                    description: "Updated user profile information.",
                    example: Examples.Profile,
                  }),
                ),
              },
            },
            description: "Updated user profile information.",
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
        z.object({ name: z.string(), email: z.string().email() }).openapi({
          description: "The user's updated profile information.",
          example: { name: Examples.User.name, email: Examples.User.email },
        }),
      ),
      async (c) => {
        const id = useUserID();
        await User.update({ id, ...c.req.valid("json") });
        const user = await User.fromID(id);
        return c.json({ data: { user } }, 200);
      },
    );
}
