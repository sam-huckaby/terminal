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
    "GB",
  ];
  export const countries = ["US", ...eu];

  export type Fulfiller = "qc" | "lp";

  const FREE_SHIPPING_THRESHOLD = 40 * 100;
  const FLAT_SHIPPING_COST = 800;
  export async function calculate(subtotal: number, address: Address.Inner) {
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
    // Import Order module to update fulfiller
    const { Order } = await import("../order/order");

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

    if (order.shippingAddress.country === "US") {
      // Set the fulfiller to QuickCommerce ("qc") if not already set
      if (!order.fulfiller) {
        await Order.setFulfiller({
          orderId: orderID,
          fulfiller: "qc",
        });
      }

      await Shippo.createShipment(orderID);
    }
  }

  export async function fulfill(fulfiller: Fulfiller) {
    if (fulfiller === "qc") return;
    const orders = await useTransaction((tx) =>
      tx
        .select({
          id: orderTable.id,
          shippingAddress: orderTable.shippingAddress,
          fulfiller: orderTable.fulfiller,
        })
        .from(orderTable)
        .where(
          and(isNull(orderTable.timePrinted), eq(orderTable.fulfiller, "lp")),
        )
        .execute(),
    );
    log.info("fulfilling", { count: orders.length });
    if (!orders.length) return;

    // Prepare data for CSV
    const csvRows = [];

    // Add header row
    csvRows.push(["Order ID", "Name", "Address", "Product", "Quantity"]);

    for (const order of orders) {
      const orderItems = await useTransaction((tx) =>
        tx
          .select({
            quantity: orderItemTable.quantity,
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

      // Format address by filtering out undefined parts and joining with commas
      const addressParts = [
        address.street1,
        address.street2,
        address.city,
        address.province,
        address.zip,
        address.country,
      ].filter(Boolean);

      const addressStr = addressParts.join(", ");

      for (const item of orderItems) {
        const productFullName = `${item.productName} - ${item.variantName}`;

        // Add a row to CSV data
        csvRows.push([
          order.id,
          address.name,
          addressStr,
          productFullName,
          item.quantity.toString(),
        ]);
      }
    }

    // Generate CSV content with proper escaping
    const csvContent = stringify(csvRows);
    console.log(csvContent);

    const today = new Date().toISOString().split("T")[0];

    await Email.send(
      "fulfillment",
      [
        "dax@terminal.shop",
        "packing.darius@gmail.com",
        "pierremarie@leperco.fr",
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
