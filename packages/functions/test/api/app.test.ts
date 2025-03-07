import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Api } from "@terminal/core/api/api";
import { Examples } from "@terminal/core/examples";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("app", () => {
  test("GET /app", async () => {
    const response = await validateOpenAPIRoute("get", "/app");
    expect(response.data).toBeArray();
  });

  test("GET /app/:id", async () => {
    const appID = await Api.Client.create({
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    }).then((r) => r.id);
    const response = await validateOpenAPIRoute("get", "/app/:id", {
      id: appID,
    });
    expect(response.data.id).toBe(appID);
    expect(response.data.name).toBe(Examples.App.name);
  });

  test("POST /app", async () => {
    const response = await validateOpenAPIRoute("post", "/app", undefined, {
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    });
    const created = await Api.Client.fromID(response.data.id);
    expect(created).toBeDefined();
    expect(created!.name).toBe(Examples.App.name);
  });

  test("DELETE /address/:id", async () => {
    const appID = await Api.Client.create({
      name: Examples.App.name,
      redirectURI: Examples.App.redirectURI,
    }).then((r) => r.id);
    await validateOpenAPIRoute("delete", "/app/:id", {
      id: appID,
    });
    const deleted = await Api.Client.fromID(appID);
    expect(deleted).toBeUndefined();
  });
});

