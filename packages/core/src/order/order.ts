import {
  afterTx,
  createTransaction,
  useTransaction,
} from "../drizzle/transaction";
import { createID } from "../util/id";
import { orderItemTable, orderTable } from "./order.sql";
import { Actor } from "../actor";
import { userTable } from "../user/user.sql";
import {
  and,
  eq,
  getTableColumns,
  inArray,
  isNotNull,
  isNull,
  sql,
  sum,
  desc,
} from "drizzle-orm";
import { cartItemTable, cartTable } from "../cart/cart.sql";
import {
  productTable,
  productVariantInventoryTable,
  productVariantTable,
} from "../product/product.sql";
import { z } from "zod";
import { fn } from "../util/fn";
import { cardTable } from "../card/card.sql";
import { defineEvent } from "../event";
import { bus } from "sst/aws/bus";
import { Resource } from "sst";
import { stripe } from "../stripe";
import { Stripe } from "stripe";
import { Shippo } from "../shippo/index";
import { ErrorCodes, VisibleError } from "../error";
import { inventoryRecordTable } from "../inventory/inventory.sql";
import { pipe, groupBy, values, map } from "remeda";
import { Common } from "../common";
import { Examples } from "../examples";
import { Address } from "../address";
import { addressTable } from "../address/address.sql";
import { ProductFilter } from "../product/filter";
import { Log } from "../util/log";
import { Shipping } from "../shipping";

export namespace Order {
  const log = Log.create({ namespace: "order" });
  export const Item = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.OrderItem.id,
      }),
      description: z.string().optional().openapi({
        description: "Description of the item in the order.",
      }),
      amount: z.number().int().openapi({
        description: "Amount of the item in the order, in cents (USD).",
        example: Examples.OrderItem.amount,
      }),
      quantity: z.number().int().min(0).openapi({
        description: "Quantity of the item in the order.",
        example: Examples.OrderItem.quantity,
      }),
      productVariantID: z.string().optional().openapi({
        description: "ID of the product variant of the item in the order.",
        example: Examples.OrderItem.productVariantID,
      }),
    })
    .openapi({ ref: "OrderItem", example: Examples.OrderItem });

  export const Info = z
    .object({
      id: z.string().openapi({
        description: Common.IdDescription,
        example: Examples.Order.id,
      }),
      index: z.number().int().optional().openapi({
        description: "Zero-based index of the order for this user only.",
        example: Examples.Order.index,
      }),
      shipping: Address.Inner.openapi({
        description: "Shipping address of the order.",
        example: Examples.Order.shipping,
      }),
      amount: z
        .object({
          shipping: z.number().int().openapi({
            description: "Shipping amount of the order, in cents (USD).",
            example: Examples.Order.amount.shipping,
          }),
          subtotal: z.number().int().openapi({
            description: "Subtotal amount of the order, in cents (USD).",
            example: Examples.Order.amount.subtotal,
          }),
        })
        .openapi({
          description: "The subtotal and shipping amounts of the order.",
          example: Examples.Order.amount,
        }),
      tracking: z
        .object({
          service: z.string().optional().openapi({
            description: "Shipping service of the order.",
            example: Examples.Order.tracking.service,
          }),
          number: z.string().optional().openapi({
            description: "Tracking number of the order.",
            example: Examples.Order.tracking.number,
          }),
          url: z.string().optional().openapi({
            description: "Tracking URL of the order.",
            example: Examples.Order.tracking.url,
          }),
          status: z.string().optional().openapi({
            description: "Current tracking status of the shipment.",
            example: Examples.Order.tracking.status,
          }),
          statusDetails: z.string().optional().openapi({
            description: "Additional details about the tracking status.",
            example: Examples.Order.tracking.statusDetails,
          }),
          statusUpdatedAt: z.coerce.date().optional().openapi({
            description: "When the tracking status was last updated.",
            example: Examples.Order.tracking.statusUpdatedAt,
          }),
        })
        .openapi({
          description: "Tracking information of the order.",
          example: Examples.Order.tracking,
        }),
      items: Item.array().openapi({
        description: "Items in the order.",
        example: Examples.Order.items,
      }),
    })
    .openapi({
      ref: "Order",
      description: "An order from the Terminal shop.",
      example: Examples.Order,
    });

  export type Info = z.infer<typeof Info>;

  export const Event = {
    Created: defineEvent(
      "order.created",
      z.object({
        orderID: Info.shape.id,
      }),
    ),
  };

  export const list = () =>
    useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(orderTable)
        .innerJoin(cartTable, eq(orderTable.userID, cartTable.userID))
        .leftJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderID))
        .leftJoin(
          productVariantTable,
          eq(orderItemTable.productVariantID, productVariantTable.id),
        )
        .where(eq(orderTable.userID, Actor.userID()))
        .orderBy(desc(orderTable.id));
      const result = pipe(
        rows,
        groupBy((x) => x.order.id),
        values(),
        map(
          (group): Info => ({
            id: group[0].order.id,
            // index: group[0].order.index,
            shipping: group[0].order.shippingAddress,
            amount: {
              shipping: group[0].order.shippingAmount,
              subtotal: group.reduce(
                (acc, row) => acc + row.order_item!.amount,
                0,
              ),
            },
            tracking: {
              service: group[0].cart.shippingService || undefined,
              number: group[0].order.trackingNumber || undefined,
              url: group[0].order.trackingURL || undefined,
              status: group[0].order.trackingStatus || undefined,
              statusDetails: group[0].order.trackingStatusDetails || undefined,
              statusUpdatedAt:
                group[0].order.trackingStatusUpdatedAt || undefined,
            },
            items: group.map((row) => ({
              id: row.order_item!.id,
              amount: row.order_item!.amount,
              quantity: row.order_item!.quantity,
              productVariantID: row.order_item!.productVariantID!,
            })),
          }),
        ),
      );
      return result as Info[];
    });

  export const fromID = fn(Info.shape.id, (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(orderTable)
        .innerJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderID))
        .leftJoin(
          productVariantTable,
          eq(orderItemTable.productVariantID, productVariantTable.id),
        )
        .where(eq(orderTable.id, input))
        .then((rows): Info | undefined =>
          rows.length === 0
            ? undefined
            : {
                id: rows[0]!.order.id,
                shipping: rows[0]!.order.shippingAddress,
                amount: {
                  shipping: rows[0]!.order.shippingAmount,
                  subtotal: rows.reduce(
                    (acc, row) => acc + row.order_item.amount,
                    0,
                  ),
                },
                tracking: {
                  number: rows[0]!.order.trackingNumber || undefined,
                  url: rows[0]!.order.trackingURL || undefined,
                  status: rows[0]!.order.trackingStatus || undefined,
                  statusDetails:
                    rows[0]!.order.trackingStatusDetails || undefined,
                  statusUpdatedAt:
                    rows[0]!.order.trackingStatusUpdatedAt || undefined,
                },
                items: rows.map((row) => ({
                  id: row.order_item.id,
                  amount: row.order_item.amount,
                  quantity: row.order_item.quantity,
                  productVariantID: row.product_variant?.id,
                })),
              },
        ),
    ),
  );

  export async function convertCart() {
    log.info("converting cart");
    const userID = Actor.userID();
    const { items, cart } = await useTransaction(async (tx) => {
      const items = await tx
        .select()
        .from(cartItemTable)
        .where(eq(cartItemTable.userID, userID));
      const cart = await tx
        .select()
        .from(cartTable)
        .where(eq(cartTable.userID, userID))
        .then((rows) => rows[0]);
      return { items, cart };
    });
    if (!cart?.addressID)
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "No shipping address added to cart.",
      );
    if (!cart?.cardID)
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "No card added to cart.",
      );
    const orderID = await create({
      addressID: cart.addressID,
      cardID: cart.cardID,
      variants: items.reduce(
        (acc, item) => {
          acc[item.productVariantID] = item.quantity;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });
    await createTransaction(async (tx) => {
      await tx.delete(cartItemTable).where(eq(cartItemTable.userID, userID));
    });
    return orderID;
  }

  export const create = fn(
    z.object({
      variants: z.record(z.number().int()),
      cardID: z.string(),
      addressID: z.string(),
    }),
    async (input) => {
      log.info("creating order");
      const userID = Actor.userID();
      if (Object.keys(input.variants).length === 0) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "No items in order",
        );
      }
      const match = await useTransaction(async (tx) =>
        tx
          .select({
            shipping: addressTable.address,
            card: getTableColumns(cardTable),
            stripeCustomerID: userTable.stripeCustomerID,
            email: userTable.email,
          })
          .from(userTable)
          .innerJoin(addressTable, eq(addressTable.id, input.addressID))
          .innerJoin(cardTable, eq(cardTable.id, input.cardID))
          .where(eq(userTable.id, userID))
          .then((rows) => rows[0]),
      );
      if (!match)
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Card or address not found.",
        );
      const items = await useTransaction(async (tx) =>
        tx
          .select({
            tags: productTable.tags,
            id: productVariantTable.id,
            price: productVariantTable.price,
            productID: productTable.id,
            weight: productVariantTable.weight,
          })
          .from(productVariantTable)
          .where(inArray(productVariantTable.id, Object.keys(input.variants)))
          .innerJoin(
            productTable,
            eq(productVariantTable.productID, productTable.id),
          )
          .then((rows) =>
            rows.map((row) => ({
              id: row.id,
              productID: row.productID,
              tags: row.tags || {},
              price: row.price * (input.variants[row.id] ?? 0),
              quantity: input.variants[row.id] ?? 0,
              weight: row.weight * (input.variants[row.id] ?? 0),
            })),
          ),
      );

      const filterCtx = {
        ...ProductFilter.use(),
        region: undefined,
        country: match.shipping.country,
      };
      for (const item of items) {
        if (!ProductFilter.run(filterCtx, item.tags || {}))
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_PARAMETER,
            "This product cannot be purchased.",
          );
      }

      const orderID = createID("order");
      const subtotal = items.reduce((acc, item) => acc + item.price, 0);
      const shipping = await Shipping.calculate(subtotal, match.shipping);
      if (!shipping)
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Cannot ship to this address",
        );

      const shippingAmount = shipping.shippingAmount || 0;
      const totalChargeAmount = subtotal + shippingAmount;
      const needsPayment = ![
        "usr_01J1JGH7NH2HZ6DGAGT8SK2KE3",
        "usr_01J1KHKPA8QK82MBHQDBQP78XK",
        "usr_01J1KHPJ88QEFEQ6K27QA9C4WN",
        "usr_01JG4BDDCKTY6CYWF6JXKVPNNT",
      ].includes(userID);

      try {
        let result: Stripe.Response<Stripe.PaymentIntent> | undefined;

        // Only create a payment intent if we need to charge the customer
        if (needsPayment) {
          result = await stripe.paymentIntents.create({
            amount: totalChargeAmount,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never",
            },
            confirm: true,
            currency: "usd",
            shipping: {
              name: match.shipping.name,
              address: {
                city: match.shipping.city,
                line1: match.shipping.street1,
                line2: match.shipping.street2,
                postal_code: match.shipping.zip,
                state: match.shipping.province,
                country: match.shipping.country,
              },
            },
            customer: match.stripeCustomerID,
            metadata: {
              orderID,
            },
            payment_method: match.card.stripePaymentMethodID,
          });
        }

        await createTransaction(async (tx) => {
          await tx.insert(orderTable).values({
            id: orderID,
            email: match.email,
            fulfiller: shipping.fulfiller,
            stripePaymentIntentID: result?.id,
            shippingAmount: shipping.shippingAmount || 0,
            shippingAddress: match.shipping,
            card: {
              brand: match.card.brand,
              last4: match.card.last4,
              expiration: {
                month: match.card.expirationMonth,
                year: match.card.expirationYear,
              },
            },
            userID,
          });

          for (const item of items) {
            await tx.insert(orderItemTable).values({
              id: createID("cartItem"),
              amount: item.price,
              productVariantID: item.id,
              quantity: item.quantity,
              orderID,
            });
          }

          await afterTx(() =>
            bus.publish(Resource.Bus, Event.Created, { orderID }),
          );
        });
      } catch (ex) {
        if (ex instanceof Stripe.errors.StripeCardError) {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.INVALID_STATE,
            ex.message,
            "cardID",
          );
        }
        throw new VisibleError(
          "internal",
          ErrorCodes.Server.INTERNAL_ERROR,
          "Payment failed.",
        );
      }

      return orderID;
    },
  );

  export const createInternal = fn(
    z.object({
      email: z.string().email(),
      items: z.record(z.number().int()),
      address: Address.Inner,
    }),
    async (input) => {
      await Shippo.assertValidAddress(input.address);
      const shippingInfo = await Shippo.createShipmentRate({
        ounces: 0,
        address: input.address,
        subtotal: 0,
      });
      return await useTransaction(async (tx) => {
        const orderID = createID("order");
        await tx.insert(orderTable).values({
          id: orderID,
          email: input.email,
          shippingAmount: 0,
          shippingAddress: input.address,
          shippoRateID: shippingInfo.shippoRateID,
        });
        for (const [productVariantID, quantity] of Object.entries(
          input.items,
        )) {
          if (quantity < 1) throw new Error("Invalid quantity");
          await tx.insert(orderItemTable).values({
            id: createID("cartItem"),
            amount: 0,
            productVariantID,
            quantity,
            orderID,
          });
        }
        await afterTx(() =>
          bus.publish(Resource.Bus, Event.Created, { orderID }),
        );
        return orderID;
      });
    },
  );

  export const setPrinted = fn(Info.shape.id, async (input) => {
    await Actor.assertFlag("printer");
    await useTransaction(async (tx) =>
      tx
        .update(orderTable)
        .set({
          timePrinted: sql`CURRENT_TIMESTAMP(3)`,
        })
        .where(eq(orderTable.id, input)),
    );
  });

  export async function getNextLabel() {
    await Actor.assertFlag("printer");
    const result = await useTransaction((tx) =>
      tx
        .select({
          id: orderTable.id,
          label: orderTable.labelURL,
        })
        .from(orderTable)
        .where(
          and(isNull(orderTable.timePrinted), isNotNull(orderTable.labelURL)),
        )
        .orderBy(orderTable.id)
        .limit(1)
        .then((rows) => rows[0]),
    );
    if (!result) return;
    return result;
  }

  export const setFulfiller = fn(
    z.object({
      orderId: z.string(),
      fulfiller: z.enum(["qc", "lp"]),
    }),
    async (input) => {
      await useTransaction((tx) =>
        tx
          .update(orderTable)
          .set({
            fulfiller: input.fulfiller,
          })
          .where(eq(orderTable.id, input.orderId)),
      );
    },
  );

  export async function trackInventory() {
    await createTransaction(async (tx) => {
      const items = await tx
        .select({
          quantity: sum(orderItemTable.quantity).mapWith(parseInt),
          inventoryID: productVariantInventoryTable.inventoryID,
        })
        .from(orderItemTable)
        .innerJoin(orderTable, eq(orderItemTable.orderID, orderTable.id))
        .innerJoin(
          productVariantInventoryTable,
          eq(
            orderItemTable.productVariantID,
            productVariantInventoryTable.productVariantID,
          ),
        )
        .where(
          and(
            isNull(orderItemTable.timeInventoryTracked),
            isNotNull(orderTable.timePrinted),
          ),
        )
        .groupBy(productVariantInventoryTable.inventoryID);
      if (items.length === 0) {
        log.info("No inventory to track");
        return;
      }
      await tx.insert(inventoryRecordTable).values(
        items.map((item) => ({
          quantity: item.quantity * -1,
          inventoryID: item.inventoryID,
          id: createID("inventoryRecord"),
          notes: "automated",
        })),
      );

      const updated = await tx
        .select({
          id: orderItemTable.id,
        })
        .from(orderTable)
        .innerJoin(orderItemTable, eq(orderItemTable.orderID, orderTable.id))
        .where(
          and(
            isNull(orderItemTable.timeInventoryTracked),
            isNotNull(orderTable.timePrinted),
          ),
        );
      const result = await tx
        .update(orderItemTable)
        .set({
          timeInventoryTracked: sql`CURRENT_TIMESTAMP(3)`,
        })
        .where(
          inArray(
            orderItemTable.id,
            updated.map((row) => row.id),
          ),
        );
      log.info("Tracked inventory", { count: result.rowsAffected });
    }, "repeatable read");
  }
}
