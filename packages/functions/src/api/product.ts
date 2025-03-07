import { z } from "zod";
import { Result, ErrorResponses, validator } from "./common";
import { Product } from "@terminal/core/product/index";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";

export module ProductApi {
  export const route = new Hono()
    .get(
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
          429: ErrorResponses[429],
          500: ErrorResponses[500],
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
    )
    .get(
      "/:id",
      describeRoute({
        tags: ["Product"],
        summary: "Get product",
        description: "Get a product by ID from the Terminal shop.",
        security: [],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  Product.Info.openapi({
                    description: "The requested product.",
                    example: Examples.Product,
                  }),
                ),
              },
            },
            description: "The requested product.",
          },
          404: ErrorResponses[404],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      validator(
        "param",
        z.object({
          id: Product.Info.shape.id.openapi({
            description: "ID of the product to get.",
            example: Examples.Product.id,
          }),
        }),
      ),
      async (c) => {
        const product = await Product.fromID(c.req.valid("param").id);
        if (!product) {
          return c.json(
            {
              type: "not_found",
              code: "resource_not_found",
              message: "Product not found",
            },
            404,
          );
        }
        return c.json({ data: product }, 200);
      },
    );
}
