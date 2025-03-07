import { describe, expect } from "bun:test";
import { getTestAddressID, setupApiTest } from "./util";
import { Address } from "@terminal/core/address/index";
import { Examples } from "@terminal/core/examples";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("address", () => {
  test("GET /address", async () => {
    const response = await validateOpenAPIRoute("get", "/address");
    expect(response.data).toBeArray();
  });

  test("GET /address/:id", async () => {
    const addressID = await getTestAddressID();
    const response = await validateOpenAPIRoute("get", "/address/:id", {
      id: addressID,
    });
    expect(response.data.id).toBe(addressID);
    expect(response.data.name).toBe(Examples.Address.name);
  });

  test("POST /address", async () => {
    const response = await validateOpenAPIRoute(
      "post",
      "/address",
      undefined,
      Examples.Address,
    );
    const created = await Address.fromID(response.data);
    expect(created).toBeDefined();
    expect(created!.name).toBe(Examples.Address.name);
  });

  test("DELETE /address/:id", async () => {
    const addressID = await getTestAddressID();
    await validateOpenAPIRoute("delete", "/address/:id", {
      id: addressID,
    });
    const deleted = await Address.fromID(addressID);
    expect(deleted).toBeUndefined();
  });
});
