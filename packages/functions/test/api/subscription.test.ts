import { describe, expect } from "bun:test";
import {
  getTestAddressID,
  getTestCardID,
  getTestProductVariantID,
  setupApiTest,
} from "./util";
import { Examples } from "@terminal/core/examples";
import { Subscription } from "@terminal/core/subscription/subscription";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("subscription", () => {
  test("GET /subscription", async () => {
    const response = await validateOpenAPIRoute("get", "/subscription");
    expect(response.data).toBeArray();
  });

  test("GET /subscription/:id", async () => {
    const productVariantID = await getTestProductVariantID();
    const addressID = await getTestAddressID();
    const cardID = await getTestCardID();
    const subscriptionID = await Subscription.create({
      addressID,
      cardID,
      productVariantID,
      quantity: Examples.Subscription.quantity,
      schedule: Examples.Subscription.schedule,
    });
    const response = await validateOpenAPIRoute("get", "/subscription/:id", {
      id: subscriptionID,
    });
    expect(response.data.id).toBe(subscriptionID);
  });

  test("POST /subscription", async () => {
    const productVariantID = await getTestProductVariantID();
    const addressID = await getTestAddressID();
    const cardID = await getTestCardID();

    const subscriptionData = {
      addressID,
      cardID,
      productVariantID,
      quantity: Examples.Subscription.quantity,
      schedule: Examples.Subscription.schedule,
    };

    const response = await validateOpenAPIRoute(
      "post",
      "/subscription",
      undefined,
      subscriptionData,
    );
    expect(response.data).toBeDefined();

    // Verify the subscription was created
    const subscriptions = await Subscription.list();
    expect(
      subscriptions.some(
        (sub) =>
          sub.productVariantID === productVariantID &&
          sub.quantity === Examples.Subscription.quantity &&
          sub.addressID === addressID &&
          sub.cardID === cardID,
      ),
    ).toBe(true);
  });

  test("DELETE /subscription/:id", async () => {
    const productVariantID = await getTestProductVariantID();
    const addressID = await getTestAddressID();
    const cardID = await getTestCardID();
    const subscriptionID = await Subscription.create({
      addressID,
      cardID,
      productVariantID,
      quantity: Examples.Subscription.quantity,
      schedule: Examples.Subscription.schedule,
    });

    // Delete the subscription
    await validateOpenAPIRoute("delete", "/subscription/:id", {
      id: subscriptionID,
    });
    const deleted = await Subscription.fromID(subscriptionID);
    expect(deleted).toBeUndefined();
  });
});

