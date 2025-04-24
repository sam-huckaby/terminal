import { Card } from "@terminal/core/card/index";
import { Order } from "@terminal/core/order/order";
import { stripe } from "@terminal/core/stripe";
import { Hono } from "hono";
import { Resource } from "sst";
import { Log } from "@terminal/core/util/log";

const log = Log.create({ namespace: "webhook" });

export namespace Hook {
  export const route = new Hono()
    .post("/stripe", async (ctx) => {
      const sig = ctx.req.header("stripe-signature");
      const evt = await stripe.webhooks.constructEventAsync(
        await ctx.req.text(),
        sig!,
        Resource.StripeWebhook.secret,
      );
      console.log(evt);
      switch (evt.type) {
        case "payment_method.updated":
        case "payment_method.attached":
        case "payment_method.detached":
          if (
            evt.data.object.customer &&
            typeof evt.data.object.customer == "string"
          )
            await Card.sync(evt.data.object.customer);
      }
      return ctx.json({});
    })
    .post("/shippo", async (ctx) => {
      try {
        const token = ctx.req.query("token");
        if (!token || token !== Resource.ShippoWebhookSecret.value) {
          return ctx.json(
            {
              status: "ignored",
              reason: "token missing or invalid",
            },
            401,
          );
        }
        const rawBody = await ctx.req.text();
        const body = JSON.parse(rawBody);
        log.info("received shippo webhook", { event: body.event });

        // Verify this is a tracking update event
        if (body.event !== "track_updated") {
          return ctx.json(
            {
              status: "ignored",
              reason: "not a tracking update",
            },
            400,
          );
        }

        // Process the tracking update
        const trackingData = {
          trackingNumber: body.data.tracking_number,
          carrier: body.data.carrier,
          status: body.data.tracking_status.status || undefined,
          statusDetails: body.data.tracking_status.status_details,
          statusDate: body.data.tracking_status.status_date,
          metadata: body.data.metadata || undefined,
        };

        await Order.updateTrackingStatus(trackingData);

        return ctx.json({ status: "success" });
      } catch (error) {
        log.error(error as Error);
        return ctx.json(
          {
            status: "error",
            message: "failed to process webhook",
          },
          500,
        );
      }
    });
}
