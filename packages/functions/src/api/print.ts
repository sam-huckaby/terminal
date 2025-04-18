import { Order } from "@terminal/core/order/order";
import { Hono } from "hono";

export namespace Print {
  export const route = new Hono().get("/", async (ctx) => {
    const data = await Order.getNextLabel();
    return ctx.json(data);
  });
}
