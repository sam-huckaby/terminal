import { describe, expect } from "bun:test";
import { getTestCardID, setupApiTest } from "./util";
import { Card } from "@terminal/core/card/index";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("card", () => {
  test("GET /card", async () => {
    const response = await validateOpenAPIRoute("get", "/card");
    expect(response.data).toBeArray();
  });

  test("GET /card/:id", async () => {
    const cardID = await getTestCardID();
    const response = await validateOpenAPIRoute("get", "/card/:id", {
      id: cardID,
    });
    expect(response.data.id).toBe(cardID);
    await Card.remove(cardID);
  });

  test("POST /card", async () => {
    const response = await validateOpenAPIRoute("post", "/card", undefined, {
      token: "tok_visa",
    });
    const created = await Card.fromID(response.data);
    expect(created).toBeDefined();
    await Card.remove(created!.id);
  });

  test("DELETE /card/:id", async () => {
    const cardID = await getTestCardID();
    await validateOpenAPIRoute("delete", "/card/:id", {
      id: cardID,
    });
    const deleted = await Card.fromID(cardID);
    expect(deleted).toBeUndefined();
  });

  test("POST /card/collect", async () => {
    const response = await validateOpenAPIRoute("post", "/card/collect");
    expect(response.data).toBeDefined();
    expect(response.data.url).toBeDefined();
  });
});

