import { z } from "zod";
import { createTransaction, useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { cartItemTable, cartTable } from "./cart.sql";
import { createID } from "../util/id";
import { productTable, productVariantTable } from "../product/product.sql";
import { and, eq, getTableColumns, sql, sum } from "drizzle-orm";
import { useUserID } from "../actor";
import { cardTable } from "../card/card.sql";
import { Shippo } from "../shippo/";
import { ErrorCodes, VisibleError } from "../error";
import { Common } from "../common";
import { Examples } from "../examples";
import { addressTable } from "../address/address.sql";
import { Address } from "../address";
import { GiftCard } from "../giftcard";

export module Cart {
  export const Item = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.CartItem.id,
      }),
      productVariantID: z.string().openapi({
        description:
          "ID of the product variant for this item in the current user's cart.",
        example: Examples.CartItem.productVariantID,
      }),
      quantity: z.number().int().min(0).openapi({
        description: "Quantity of the item in the current user's cart.",
        example: Examples.CartItem.quantity,
      }),
      subtotal: z.number().int().openapi({
        description:
          "Subtotal of the item in the current user's cart, in cents (USD).",
        example: Examples.CartItem.subtotal,
      }),
    })
    .openapi({
      ref: "CartItem",
      description: "An item in the current Terminal shop user's cart.",
      example: Examples.CartItem,
    });

  export type Item = z.infer<typeof Item>;

  export const Info = z
    .object({
      items: z.array(Item).openapi({
        description: "An array of items in the current user's cart.",
        example: Examples.Cart.items,
      }),
      subtotal: z.number().int().min(0).openapi({
        description:
          "The subtotal of all items in the current user's cart, in cents (USD).",
        example: Examples.Cart.subtotal,
      }),
      addressID: z.string().optional().openapi({
        description:
          "ID of the shipping address selected on the current user's cart.",
        example: Examples.Cart.addressID,
      }),
      cardID: z.string().optional().openapi({
        description: "ID of the card selected on the current user's cart.",
        example: Examples.Cart.cardID,
      }),
      giftCardID: z.string().optional().openapi({
        description: "ID of the gift card applied to the current user's cart.",
      }),
      amount: z
        .object({
          subtotal: z.number().int().openapi({
            description: "Subtotal of the current user's cart, in cents (USD).",
            example: Examples.Cart.amount.subtotal,
          }),
          shipping: z.number().int().optional().openapi({
            description:
              "Shipping amount of the current user's cart, in cents (USD).",
            example: Examples.Cart.amount.shipping,
          }),
          giftCard: z.number().int().optional().openapi({
            description:
              "Amount applied from gift card on the current user's cart, in cents (USD).",
          }),
          total: z.number().int().optional().openapi({
            description:
              "Total amount after gift card applied, in cents (USD).",
          }),
        })
        .openapi({
          description:
            "The subtotal and shipping amounts for the current user's cart.",
          example: Examples.Cart.amount,
        }),
      shipping: z
        .object({
          service: z.string().optional().openapi({
            description: "Shipping service name.",
            example: Examples.Cart.shipping.service,
          }),
          timeframe: z.string().optional().openapi({
            description: "Shipping timeframe provided by the shipping carrier.",
            example: Examples.Cart.shipping.timeframe,
          }),
        })
        .optional()
        .openapi({
          description: "Shipping information for the current user's cart.",
          example: Examples.Cart.shipping,
        }),
    })
    .openapi({
      ref: "Cart",
      description: "The current Terminal shop user's cart.",
      example: Examples.Cart,
    });

  export type Info = z.infer<typeof Info>;

  export async function get() {
    return createTransaction(async (tx): Promise<Info> => {
      const cart = await tx
        .select({
          cardID: cardTable.id,
          addressID: addressTable.id,
          giftCardID: cartTable.giftCardID,
          giftCardAmount: cartTable.giftCardAmount,
          shippingAmount: cartTable.shippingAmount,
          shippingService: cartTable.shippingService,
          shippingDeliveryEstimate: cartTable.shippingDeliveryEstimate,
        })
        .from(cartTable)
        .leftJoin(cardTable, eq(cartTable.cardID, cardTable.id))
        .leftJoin(addressTable, eq(cartTable.addressID, addressTable.id))
        .where(eq(cartTable.userID, useUserID()))
        .then((rows) => rows[0]);
      if (!cart)
        return {
          items: [],
          amount: {
            shipping: 0,
            subtotal: 0,
          },
          subtotal: 0,
        };
      const items = await list();
      const subtotal = items.reduce((acc, item) => item.subtotal + acc, 0);

      // Calculate the total after applying gift card amount
      const shippingAmount = cart.shippingAmount ?? 0;
      const giftCardAmount = cart.giftCardAmount ?? 0;
      const total = Math.max(0, subtotal + shippingAmount - giftCardAmount);

      return {
        items,
        subtotal,
        amount: {
          subtotal,
          shipping: shippingAmount || undefined,
          giftCard: giftCardAmount || undefined,
          total: total || undefined,
        },
        cardID: cart.cardID || undefined,
        addressID: cart.addressID || undefined,
        giftCardID: cart.giftCardID || undefined,
        shipping: {
          service: cart.shippingService || undefined,
          timeframe: cart.shippingDeliveryEstimate || undefined,
        },
      };
    });
  }

  const FREE_SHIPPING_THRESHOLD = 40 * 100;
  export async function calculateShipping(
    subtotal: number,
    ounces: number,
    address: Address.Inner,
  ) {
    if (ounces === 0) return undefined;
    const rate = await Shippo.createShipmentRate({ ounces, address, subtotal });
    if (address.country === "US") {
      return {
        ...rate,
        shippingAmount: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 800,
      };
    }
    return rate;
  }

  export const list = () =>
    useTransaction(async (tx) => {
      return tx
        .select({
          cartItem: getTableColumns(cartItemTable),
          productVariant: getTableColumns(productVariantTable),
          subtotal: sql<string>`(${cartItemTable.quantity} * ${productVariantTable.price})`,
        })
        .from(cartItemTable)
        .innerJoin(
          productVariantTable,
          eq(cartItemTable.productVariantID, productVariantTable.id),
        )
        .where(eq(cartItemTable.userID, useUserID()))
        .then((rows): Item[] =>
          rows.map((row) => ({
            id: row.cartItem.id,
            productVariantID: row.productVariant.id,
            quantity: row.cartItem.quantity,
            subtotal: parseInt(row.subtotal, 10),
          })),
        );
    });

  export const setAddress = fn(z.string(), async (addressID) => {
    const shippingInfo = await useTransaction(async (tx) => {
      const response = await tx
        .select({
          count: sum(cartItemTable.quantity).mapWith(Number),
          subtotal:
            sql`sum(${productVariantTable.price} * ${cartItemTable.quantity})`.mapWith(
              Number,
            ),
          weight:
            sql`sum(${productVariantTable.weight} * ${cartItemTable.quantity})`.mapWith(
              Number,
            ),
          address: addressTable.address,
        })
        .from(cartItemTable)
        .innerJoin(
          productVariantTable,
          eq(productVariantTable.id, cartItemTable.productVariantID),
        )
        .innerJoin(addressTable, eq(addressTable.id, addressID))
        .where(eq(cartItemTable.userID, useUserID()))
        .then((rows) => rows[0]);
      if (!response) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Address not found.",
        );
      }

      const weight = response.weight;
      const address = response.address;
      return await calculateShipping(response.subtotal, weight, address);
    });

    await useTransaction(async (tx) => {
      const id = await tx
        .select({
          addressID: addressTable.id,
        })
        .from(addressTable)
        .where(eq(addressTable.id, addressID))
        .then((rows) => rows[0]!.addressID);
      await tx
        .insert(cartTable)
        .values({
          userID: useUserID(),
          addressID: id,
          ...shippingInfo,
          id: createID("cart"),
        })
        .onDuplicateKeyUpdate({
          set: {
            addressID,
            ...shippingInfo,
          },
        });
    });
  });

  export const setCard = fn(z.string(), (input) =>
    useTransaction(async (tx) => {
      const cardID = await tx
        .select({
          cardID: cardTable.id,
        })
        .from(cardTable)
        .where(and(eq(cardTable.id, input), eq(cardTable.userID, useUserID())))
        .then((rows) => rows[0]?.cardID);
      if (!cardID) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Card not found.",
        );
      }
      await tx
        .insert(cartTable)
        .values({
          userID: useUserID(),
          cardID: cardID,
          id: createID("cart"),
        })
        .onDuplicateKeyUpdate({
          set: {
            cardID,
          },
        });
    }),
  );

  export const setItem = fn(
    z.object({
      id: z.string().optional(),
      productVariantID: Item.shape.productVariantID,
      quantity: Item.shape.quantity,
    }),
    async (input) => {
      return useTransaction(async (tx) => {
        const userID = useUserID();
        const id = input.id || createID("cartItem");
        const variant = await tx
          .select({
            id: productVariantTable.id,
            susbcription: productTable.subscription,
          })
          .from(productVariantTable)
          .innerJoin(
            productTable,
            eq(productVariantTable.productID, productTable.id),
          )
          .where(eq(productVariantTable.id, input.productVariantID))
          .then((rows) => rows[0]);
        if (!variant) {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_PARAMETER,
            "Product variant not found.",
          );
        }
        if (input.quantity <= 0) {
          await tx
            .delete(cartItemTable)
            .where(
              and(
                eq(cartItemTable.productVariantID, variant.id),
                eq(cartItemTable.userID, userID),
              ),
            );
          return;
        }
        if (variant.susbcription === "required") {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_STATE,
            "This product cannot be added to a cart, it must be purchased via a subscription.",
          );
        }
        await tx
          .insert(cartItemTable)
          .values({
            id,
            quantity: input.quantity,
            productVariantID: variant.id,
            userID,
          })
          .onDuplicateKeyUpdate({
            set: { quantity: input.quantity },
          });
        await tx
          .insert(cartTable)
          .ignore()
          .values({
            userID,
            id: createID("cart"),
          });
      });
    },
  );

  export async function clear() {
    return useTransaction(async (tx) =>
      tx.delete(cartItemTable).where(eq(cartItemTable.userID, useUserID())),
    );
  }

  export const redeemGiftCard = fn(z.string(), async (giftCardID) => {
    return createTransaction(async (tx) => {
      // Verify the gift card exists and has available balance
      const giftCard = await GiftCard.fromID(giftCardID);

      if (!giftCard) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Gift card not found.",
        );
      }

      if (giftCard.balance <= 0) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          "Gift card has zero balance.",
        );
      }

      // Get the cart information
      const cartInfo = await tx
        .select({
          id: cartTable.id,
          subtotal: sql<string>`(
              SELECT SUM(ci.quantity * pv.price)
              FROM cart_item ci
              JOIN product_variant pv ON ci.product_variant_id = pv.id
              WHERE ci.user_id = ${useUserID()}
            )`,
          shippingAmount: cartTable.shippingAmount,
        })
        .from(cartTable)
        .where(eq(cartTable.userID, useUserID()))
        .then((rows) => rows[0]);

      if (!cartInfo) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          "No active cart found.",
        );
      }

      // Calculate the total amount to pay
      const subtotal = cartInfo.subtotal ? parseInt(cartInfo.subtotal, 10) : 0;
      const shipping = cartInfo.shippingAmount || 0;
      const totalBeforeDiscount = subtotal + shipping;

      // Calculate the amount to apply from gift card (min of balance and total)
      const amountToApply = Math.min(giftCard.balance, totalBeforeDiscount);

      // Update the gift card balance
      const newBalance = giftCard.balance - amountToApply;
      await GiftCard.updateBalance({
        id: giftCardID,
        newBalance,
      });

      // Update the cart with gift card information
      await tx
        .update(cartTable)
        .set({
          giftCardID,
          giftCardAmount: amountToApply,
        })
        .where(eq(cartTable.id, cartInfo.id));

      return {
        giftCardID,
        appliedAmount: amountToApply,
        remainingBalance: newBalance,
      };
    });
  });

  export const removeGiftCard = fn(z.void(), async () => {
    return useTransaction(async (tx) => {
      const cartWithGiftCard = await tx
        .select({
          giftCardID: cartTable.giftCardID,
          giftCardAmount: cartTable.giftCardAmount,
        })
        .from(cartTable)
        .where(eq(cartTable.userID, useUserID()))
        .then((rows) => rows[0]);
      if (!cartWithGiftCard?.giftCardID)
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          "Cart does not have a gift card.",
        );
      const giftCard = await GiftCard.fromID(cartWithGiftCard.giftCardID);
      if (!giftCard)
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Could not find gift card.",
        );
      await GiftCard.updateBalance({
        id: cartWithGiftCard.giftCardID,
        newBalance: giftCard.balance + (cartWithGiftCard.giftCardAmount ?? 0),
      });
      await tx
        .update(cartTable)
        .set({
          giftCardID: null,
          giftCardAmount: null,
        })
        .where(eq(cartTable.userID, useUserID()));
    });
  });
}
