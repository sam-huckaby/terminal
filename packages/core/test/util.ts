import { it } from "bun:test";
import { Actor } from "../src/actor";
import { User } from "../src/user";
import { nanoid } from "nanoid/non-secure";

export function withTestUser(name: string, cb: (id: string) => Promise<any>) {
  return it(name, async () => {
    const user = await User.create({
      fingerprint: "test+" + nanoid(),
    });
    await Actor.provide("system", { userID: user }, async () => {
      await cb(user);
    });
  });
}
