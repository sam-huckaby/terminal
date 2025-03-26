import { Address } from "../address";
import { Shippo } from "../shippo";
import { useTransaction } from "../drizzle/transaction";
import { orderTable, orderItemTable } from "../order/order.sql";
import { eq, and, isNull } from "drizzle-orm";
import { productVariantTable, productTable } from "../product/product.sql";
import { Email } from "../email";
import { Log } from "../util/log";
import { stringify } from "csv-stringify/sync";

export namespace Shipping {
  const log = Log.create({ namespace: "shipping" });
  const eu = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ];
  export const countries = ["US", ...eu];

  export type Fulfiller = "qc" | "lp";

  const FREE_SHIPPING_THRESHOLD = 40 * 100;
  const FLAT_SHIPPING_COST = 800;
  export async function calculate(subtotal: number, address: Address.Inner) {
    log.info("calculating shipping", {
      subtotal,
      address: JSON.stringify(address),
    });
    if (address.country === "US") {
      return {
        fulfiller: "qc" as const,
        shippingAmount:
          subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST,
      };
    }

    if (eu.includes(address.country)) {
      return {
        fulfiller: "lp" as const,
        shippingAmount:
          subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST,
      };
    }
    return;
  }

  export async function fulfillOrder(orderID: string) {
    const order = await useTransaction((tx) =>
      tx
        .select({
          shippingAddress: orderTable.shippingAddress,
          fulfiller: orderTable.fulfiller,
        })
        .from(orderTable)
        .where(eq(orderTable.id, orderID))
        .execute()
        .then((results) => results[0]),
    );
    if (!order) throw new Error("Order not found");
    if (order.fulfiller === "qc") await Shippo.createShipment(orderID);
  }

  export async function fulfill(fulfiller: Fulfiller) {
    if (fulfiller === "qc") return;
    const orders = await useTransaction((tx) =>
      tx
        .select({
          id: orderTable.id,
          shippingAddress: orderTable.shippingAddress,
          fulfiller: orderTable.fulfiller,
          email: orderTable.email,
        })
        .from(orderTable)
        .where(
          and(isNull(orderTable.timePrinted), eq(orderTable.fulfiller, "lp")),
        )
        .execute(),
    );
    log.info("fulfilling", { count: orders.length });
    if (!orders.length) return;

    const csvRows = [];

    csvRows.push([
      "Name",
      "Surname",
      "Street",
      "Postal Code",
      "City",
      "Country",
      "Phone",
      "Email",
      "Product",
      "Quantity",
      "Account",
      "Value",
      "Number",
    ]);

    for (const order of orders) {
      const orderItems = await useTransaction((tx) =>
        tx
          .select({
            quantity: orderItemTable.quantity,
            amount: orderItemTable.amount,
            productName: productTable.name,
            variantName: productVariantTable.name,
          })
          .from(orderItemTable)
          .where(eq(orderItemTable.orderID, order.id))
          .innerJoin(
            productVariantTable,
            eq(orderItemTable.productVariantID, productVariantTable.id),
          )
          .innerJoin(
            productTable,
            eq(productVariantTable.productID, productTable.id),
          )
          .execute(),
      );
      const address = order.shippingAddress;
      for (const item of orderItems) {
        const productFullName = `${item.productName} - ${item.variantName}`;
        const [first, ...rest] = (address.name || "Terminal Products").split(
          " ",
        );
        csvRows.push([
          first,
          rest.join(" "),
          [address.street1, address.street2].filter(Boolean).join(" "),
          address.zip,
          address.city,
          address.country,
          address.phone,
          order.email,
          productFullName,
          item.quantity.toString(),
          "65087903",
          (item.amount / 100).toString(),
          "1",
        ]);
      }
    }

    const csvContent = stringify(csvRows);
    console.log(csvContent);

    const today = new Date().toISOString().split("T")[0];

    await Email.send(
      "fulfillment",
      [
        "dax@terminal.shop",
        //         "packing.darius@gmail.com",
        //         "pierremarie@leperco.fr",
      ],
      `Terminal Orders - ${today}`,
      "Attached is the CSV of orders ready for fulfillment.",
      [
        {
          filename: `orders-${today}.csv`,
          content: csvContent,
          contentType: "text/csv",
        },
      ],
    );

    // Mark all orders as printed so they won't be processed again
    log.info("marking orders as printed", { count: orders.length });
    for (const order of orders) {
      await useTransaction((tx) =>
        tx
          .update(orderTable)
          .set({
            timePrinted: new Date(),
          })
          .where(eq(orderTable.id, order.id)),
      );
      log.info("marked as printed", { orderId: order.id });
    }
  }
}
