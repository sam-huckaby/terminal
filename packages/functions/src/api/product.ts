import { z } from "zod";
import { Result } from "./common";
import { Product } from "@terminal/core/product/index";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";

export module ProductApi {
  export const route = new Hono().get(
    "/",
    describeRoute({
      tags: ["Product"],
      summary: "List products",
      description: "List all products for sale in the Terminal shop.",
      security: [],
      responses: {
        200: {
          content: {
            "application/json": {
              schema: Result(
                Product.Info.array().openapi({
                  description: "A list of products.",
                  example: [Examples.Product],
                }),
              ),
            },
          },
          description: "A list of products.",
        },
      },
    }),
    async (c) => {
      return c.json(
        {
          data: await Product.list(),
        },
        200,
      );
    },
  );
}
