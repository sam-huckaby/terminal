import { urls } from "./api";
import { database } from "./database";
import { shortDomain } from "./dns";

const linkShortenerFn = new sst.aws.Function("LinkShortenerFn", {
  handler: "./packages/functions/src/shortener/index.handler",
  streaming: !$dev,
  link: [database, urls],
  url: true,
});

export const linkShortener = new sst.aws.Router("LinkShortener", {
  routes: {
    "/*": linkShortenerFn.url,
  },
  domain: {
    name: shortDomain,
    dns: sst.cloudflare.dns(),
  },
});

export const outputs = {
  short: linkShortener.url,
};
