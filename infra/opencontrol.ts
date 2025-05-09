import { api } from "./api";
import { database } from "./database";
import { domain } from "./dns";
import { allSecrets } from "./secret";

const opencontrol = new sst.aws.OpenControl("OpenControl", {
  server: {
    handler: "packages/functions/src/opencontrol.handler",
    permissions: [
      {
        actions: ["bedrock:*"],
        resources: ["*"],
      },
    ],
    policies: $dev
      ? ["arn:aws:iam::aws:policy/AdministratorAccess"]
      : ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
    link: [database, ...allSecrets, api],
    timeout: "2 minutes",
    url: true,
  },
});

new sst.aws.Router("OpencontrolRouter", {
  routes: {
    "/*": opencontrol.url,
  },
  domain: {
    name: "opencontrol." + domain,
    dns: sst.cloudflare.dns({}),
  },
});
