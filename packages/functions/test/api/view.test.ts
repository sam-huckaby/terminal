import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("view", () => {
  test("GET /view/init", async () => {
    const response = await validateOpenAPIRoute("get", "/view/init");

    expect(response.data).toBeDefined();
    expect(response.data.profile).toBeDefined();
    expect(response.data.profile.user).toBeDefined();
    expect(response.data.products).toBeDefined();
    expect(response.data.products).toBeArray();
    expect(response.data.cart).toBeDefined();
  });
});

