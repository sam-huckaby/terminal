import { database } from "./database";

const key = new random.RandomPassword("OpenControlPassword", {
  length: 16,
  special: false,
});

export const opencontrol = new sst.aws.Function("OpenControl", {
  handler: "packages/functions/src/opencontrol.handler",
  link: [database],
  environment: {
    OPENCONTROL_KEY: key.result,
  },
  url: true,
});

export const outputs = {
  opencontrol: opencontrol.url,
  opencontrolKey: key.result,
};
