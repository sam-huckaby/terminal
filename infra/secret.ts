export const secret = {
  StripeSecret: new sst.Secret("StripeSecret", process.env.STRIPE_API_KEY),
  StripePublic: new sst.Secret("StripePublic"),
  ShippoSecret: new sst.Secret("ShippoSecret"),
  EmailOctopusSecret: new sst.Secret("EmailOctopusSecret"),
  ForgeKey: new sst.Secret("ForgeKey"),
  GithubClientID: new sst.Secret("GithubClientID"),
  GithubClientSecret: new sst.Secret("GithubClientSecret"),
  TwitchClientID: new sst.Secret("TwitchClientID"),
  TwitchClientSecret: new sst.Secret("TwitchClientSecret"),
  SlackWebhook: new sst.Secret("SlackWebhook"),
  IpinfoToken: new sst.Secret("IpinfoToken"),
  AnthropicApiKey: new sst.Secret("AnthropicApiKey"),
};

export const allSecrets = Object.values(secret);
