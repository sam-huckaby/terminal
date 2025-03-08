import { secret } from "./secret";
import { domain, shortDomain, zone } from "./dns";
import { database } from "./database";
import { webhook } from "./stripe";
import { bus } from "./bus";
import { email, shortDomainEmail } from "./email";

sst.Linkable.wrap(random.RandomString, (resource) => ({
  properties: {
    value: resource.result,
  },
}));

export const urls = new sst.Linkable("Urls", {
  properties: {
    api: "https://api." + domain,
    auth: "https://auth." + domain,
    site: $dev ? "http://localhost:4321" : "https://www." + domain,
    short: "https://" + shortDomain,
    openapi: "https://api." + domain + "/doc",
  },
});

export const authFingerprintKey = new random.RandomString(
  "AuthFingerprintKey",
  {
    length: 32,
  },
);

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    link: [
      bus,
      secret.StripeSecret,
      shortDomainEmail,
      database,
      email,
      secret.GithubClientID,
      secret.GithubClientSecret,
      secret.TwitchClientSecret,
      secret.TwitchClientID,
      authFingerprintKey,
    ],
    permissions: [
      {
        actions: ["ses:SendEmail"],
        resources: ["*"],
      },
    ],
    handler: "./packages/functions/src/auth2.handler",
  },
  domain: {
    name: "auth." + domain,
    dns: sst.cloudflare.dns({
      proxy: true,
    }),
  },
  forceUpgrade: "v2",
});

const apiFn = new sst.aws.Function("ApiFn", {
  handler: "./packages/functions/src/api/index.handler",
  streaming: !$dev,
  link: [
    bus,
    secret.StripeSecret,
    secret.ShippoSecret,
    secret.EmailOctopusSecret,
    auth,
    database,
    webhook,
    urls,
  ],
  url: true,
});

export const api = new sst.aws.Router("Api", {
  routes: {
    "/*": apiFn.url,
  },
  domain: {
    name: "api." + domain,
    dns: sst.cloudflare.dns({
      proxy: true,
    }),
  },
});

new sst.aws.Cron("InventoryTracker", {
  schedule: "rate(1 day)",
  job: {
    link: [database, secret.StripeSecret],
    handler: "./packages/functions/src/cron/inventory.handler",
  },
});

new sst.aws.Cron("SubscriptionProcessor", {
  schedule: "rate(1 day)",
  job: {
    link: [database, bus, ...Object.values(secret)],
    handler: "./packages/functions/src/cron/subscription.handler",
  },
});

export const outputs = {
  auth: auth.url,
  api: api.url,
};
