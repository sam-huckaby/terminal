import { api } from "./api";
import { database } from "./database";
import { allSecrets } from "./secret";

new sst.aws.OpenControl("OpenControl", {
  server: {
    handler: "packages/functions/src/opencontrol.handler",
    link: [database, ...allSecrets, api],
    url: true,
  },
});
