import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Examples } from "@terminal/core/examples";
import { User } from "@terminal/core/user/index";

const { test, validateOpenAPIRoute } = setupApiTest();

describe("profile", () => {
  test("GET /profile", async () => {
    const response = await validateOpenAPIRoute("get", "/profile");
    expect(response.data).toBeDefined();
    expect(response.data.user).toBeDefined();
    expect(response.data.user.id).toBeDefined();
  });

  test("PUT /profile", async () => {
    const profileData = {
      name: "Test User Updated",
      email: "test-updated@example.com",
    };

    const response = await validateOpenAPIRoute(
      "put",
      "/profile",
      undefined,
      profileData,
    );

    expect(response.data).toBeDefined();
    expect(response.data.user).toBeDefined();
    expect(response.data.user.name).toBe(profileData.name);
    expect(response.data.user.email).toBe(profileData.email);

    // Verify the user was actually updated in the database
    const userId = response.data.user.id;
    const user = await User.fromID(userId);
    expect(user).toBeDefined();
    expect(user!.name).toBe(profileData.name);
    expect(user!.email).toBe(profileData.email);

    // Reset to original values to clean up
    await User.update({
      id: userId,
      name: Examples.User.name,
      email: Examples.User.email,
    });
  });
});

