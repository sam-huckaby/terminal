import { Shipping } from "@terminal/core/shipping/index";

export const handler = async () => {
  await Shipping.fulfill("lp");
};

