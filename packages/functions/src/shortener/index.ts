import "zod-openapi/extend";
import { Link } from "@terminal/core/link/index";
import { Hono } from "hono";
import { handle, streamHandle } from "hono/aws-lambda";
import { Resource } from "sst";

const app = new Hono().get("/:id", async (ctx) => {
  const id = ctx.req.param("id");
  const link = await Link.fromID(id);
  const siteUrl = Resource.Urls.site;
  if (!link || link.expires < new Date()) {
    return ctx.redirect(siteUrl + "/" + id);
  }
  return ctx.redirect(link.url);
});

export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
