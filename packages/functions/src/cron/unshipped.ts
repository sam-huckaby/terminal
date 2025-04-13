import { Resource } from "sst";
import { DateTime } from "luxon";
import { and, db, eq, lt } from "@terminal/core/drizzle/index";
import { orderTable } from "@terminal/core/order/order.sql";
import { Log } from "@terminal/core/util/log";

const log = Log.create({ namespace: "unshipped" });

export async function handler() {
  // Find orders that are in PRE_TRANSIT status more than 72 hours after creation
  const cutoffDate = DateTime.utc().minus({ hours: 72 }).toJSDate();

  // Query for orders created before the cutoff that are still in PRE_TRANSIT status
  const unshippedOrders = await db
    .select({
      id: orderTable.id,
      email: orderTable.email,
      timeCreated: orderTable.timeCreated,
      trackingStatus: orderTable.trackingStatus,
    })
    .from(orderTable)
    .where(
      and(
        lt(orderTable.timeCreated, cutoffDate),
        eq(orderTable.trackingStatus, "PRE_TRANSIT"),
      ),
    );

  if (unshippedOrders.length === 0) {
    log.info("No delayed shipments found");
    return;
  }

  // Format the data for Slack
  const lines = [
    `Unshipped Orders Alert (${DateTime.utc().toFormat("LLL dd, yyyy HH:mm")})`,
    `Found ${unshippedOrders.length} orders in PRE_TRANSIT for more than 72 hours:`,
  ];

  // Add order details to the message
  unshippedOrders.forEach((order) => {
    const createdAt = DateTime.fromJSDate(order.timeCreated).toFormat(
      "LLL dd, yyyy HH:mm",
    );
    const hoursDelayed = Math.round(
      DateTime.utc().diff(DateTime.fromJSDate(order.timeCreated), "hours")
        .hours,
    );
    lines.push(
      `• Order ${order.id}: Created ${createdAt} (${hoursDelayed} hours ago)`,
    );
  });

  lines.push(`cc @thdxr`);

  log.info("Sending alert for delayed shipments", {
    count: unshippedOrders.length,
  });

  // Send notification to Slack in production
  if (Resource.App.stage === "production") {
    await fetch(Resource.SlackOperationsWebhook.value, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: ["```", ...lines, "```"].join("\n"),
      }),
    });
  } else {
    // In development, just log the message
    console.log(lines.join("\n"));
  }
}

