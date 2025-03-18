import "zod-openapi/extend";
import { bus } from "sst/aws/bus";
import { Order } from "@terminal/core/order/order";
import { Shippo } from "@terminal/core/shippo/index";
import { User } from "@terminal/core/user/index";
import { Stripe } from "@terminal/core/stripe";
import { Template } from "@terminal/core/email/template";
import { EmailOctopus } from "@terminal/core/email-octopus";
import { Log } from "@terminal/core/util/log";
import { Actor } from "@terminal/core/actor";
import { Shipping } from "@terminal/core/shipping/index";

const log = Log.create({ namespace: "event" });
export const handler = bus.subscriber(
  [Order.Event.Created, User.Events.Updated],
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
          case "user.updated": {
            await Stripe.syncUser(event.properties.userID);
            await EmailOctopus.addToMarketingList(event.properties.userID);
            break;
          }
        }
      },
    ),
);
