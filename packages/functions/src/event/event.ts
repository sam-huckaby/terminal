import "zod-openapi/extend";
import { bus } from "sst/aws/bus";
import { Order } from "@terminal/core/order/order";
import { User } from "@terminal/core/user/index";
import { Stripe } from "@terminal/core/stripe";
import { Template } from "@terminal/core/email/template";
import { EmailOctopus } from "@terminal/core/email-octopus";
import { Log } from "@terminal/core/util/log";
import { Actor } from "@terminal/core/actor";
import { Shipping } from "@terminal/core/shipping/index";
import { Subscription } from "@terminal/core/subscription/subscription";

const log = Log.create({ namespace: "event" });
export const handler = bus.subscriber(
  [
    Order.Event.Created,
    Order.Event.TrackingStatusChanged,
    User.Event.Updated,
    Subscription.Event.Created,
  ],
  async (event) =>
    Actor.provide(
      event.metadata.actor.type,
      event.metadata.actor.properties,
      async () => {
        log.info("received", {
          type: event.type,
          ...event.properties,
        });
        console.log(event.type, event.properties);
        switch (event.type) {
          case "order.created": {
            await Shipping.fulfillOrder(event.properties.orderID);
            await Template.sendOrderConfirmation(event.properties.orderID);
            await EmailOctopus.addToCustomersList(event.properties.orderID);
            break;
          }
          case "order.tracking_status_changed": {
            // Check if status changed from PRE_TRANSIT to TRANSIT
            if (
              (event.properties.previousStatus === "PRE_TRANSIT" ||
                !event.properties.previousStatus) &&
              event.properties.newStatus === "TRANSIT"
            ) {
              log.info("Order shipped, sending email", {
                orderID: event.properties.orderID,
              });
              await Template.sendOrderShipped(event.properties.orderID);
            }
            break;
          }
          case "user.updated": {
            await Stripe.syncUser(event.properties.userID);
            await EmailOctopus.addToMarketingList(event.properties.userID);
            break;
          }
          case "subscription.created": {
            await Template.sendSubscriptionConfirmation(
              event.properties.subscriptionID,
            );
            // Optionally add to a subscribers list if needed
            // await EmailOctopus.addToSubscribersList(event.properties.subscriptionID);
            break;
          }
        }
      },
    ),
);
