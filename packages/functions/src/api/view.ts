import { z } from "zod";
import { Result, ErrorResponses, authRequired } from "./common";
import { User } from "@terminal/core/user/index";
import { Actor } from "@terminal/core/actor";
import { Cart } from "@terminal/core/cart/index";
import { Product } from "@terminal/core/product/index";
import { Card } from "@terminal/core/card/index";
import { Subscription } from "@terminal/core/subscription/subscription";
import { Order } from "@terminal/core/order/order";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { Examples } from "@terminal/core/examples";
import { Address } from "@terminal/core/address/index";
import { ProfileApi } from "./profile";
import { Api } from "@terminal/core/api/api";
import { ProductFilter } from "@terminal/core/product/filter";

export module ViewApi {
  export const route = new Hono().get(
    "/init",
    describeRoute({
      tags: ["Miscellaneous"],
      summary: "Get app data",
      description:
        "Get initial app data, including user, products, cart, addresses, cards, subscriptions, and orders.",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: Result(
                z
                  .object({
                    profile: ProfileApi.Profile,
                    products: Product.Info.array(),
                    cart: Cart.Info,
                    addresses: Address.Info.array(),
                    cards: Card.Info.array(),
                    subscriptions: Subscription.Info.array(),
                    orders: Order.Info.array(),
                    tokens: Api.Personal.Info.array(),
                    apps: Api.Client.Info.array(),
                    region: ProductFilter.Region,
                  })
                  .openapi({
                    description: "Initial app data.",
                    examples: [
                      {
                        profile: Examples.Profile,
                        products: [Examples.Product],
                        cart: Examples.Cart,
                        addresses: [Examples.Shipping],
                        cards: [Examples.Card],
                        subscriptions: [Examples.Subscription],
                        orders: [Examples.Order],
                        tokens: [Examples.Token],
                        apps: [Examples.App],
                        region: "na",
                      },
                    ],
                  }),
              ),
              example: {
                data: {
                  profile: Examples.Profile,
                  products: [Examples.Product],
                  cart: Examples.Cart,
                  addresses: [Examples.Shipping],
                  cards: [Examples.Card],
                  subscriptions: [Examples.Subscription],
                  orders: [Examples.Order],
                  tokens: [Examples.Token],
                  apps: [Examples.App],
                  region: "na",
                },
              },
            },
          },
          description: "Initial app data.",
        },
        401: ErrorResponses[401],
        429: ErrorResponses[429],
        500: ErrorResponses[500],
      },
    }),
    authRequired,
    async (c) => {
      const [
        user,
        products,
        cart,
        addresses,
        cards,
        subscriptions,
        orders,
        tokens,
        apps,
      ] = await Promise.all([
        User.fromID(Actor.userID()),
        Product.list(),
        Cart.get(),
        Address.list(),
        Card.list(),
        Subscription.list(),
        Order.list(),
        Api.Personal.list(),
        Api.Client.list(),
      ]);
      // Get the current region from the ProductFilter context
      const filterContext = ProductFilter.use();
      const region = filterContext.region || "na";

      return c.json(
        {
          data: {
            profile: { user },
            products,
            cart,
            addresses,
            cards,
            subscriptions,
            orders,
            tokens,
            apps,
            region,
          },
        },
        200,
      );
    },
  );
}
