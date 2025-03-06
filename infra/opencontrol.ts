import { api } from "./api";
import { database } from "./database";
import { allSecrets } from "./secret";

const key = new random.RandomPassword("OpenControlPassword", {
  length: 16,
  special: false,
});

export const opencontrol = new sst.aws.Function("OpenControl", {
  handler: "packages/functions/src/opencontrol.handler",
  link: [database, ...allSecrets, api],
  environment: {
    OPENCONTROL_KEY: key.result,
  },
  url: true,
});

export const outputs = {
  opencontrol: $interpolate`${opencontrol.url}${key.result}`,
};
