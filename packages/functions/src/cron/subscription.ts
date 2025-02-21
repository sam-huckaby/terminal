import { Subscription } from "@terminal/core/subscription/subscription";

export async function handler() {
  await Subscription.process();
}
