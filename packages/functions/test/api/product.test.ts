import { describe, expect } from "bun:test";
import { getTestProductID, setupApiTest } from "./util";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("product", () => {
  test("GET /product", async () => {
    const response = await validateOpenAPIRoute("get", "/product");
    expect(response.data).toBeArray();
  });

  test("GET /product/:id", async () => {
    const productID = await getTestProductID();
    const response = await validateOpenAPIRoute("get", "/product/:id", {
      id: productID,
    });
    expect(response.data.id).toBe(productID);
  });
});

