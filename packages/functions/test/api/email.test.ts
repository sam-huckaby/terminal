import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("email", () => {
  test("POST /email", async () => {
    const response = await validateOpenAPIRoute("post", "/email", undefined, {
      email: "test@example.com",
    });
    expect(response.data).toBeDefined();
  });
});

