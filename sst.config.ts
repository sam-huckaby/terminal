/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "terminal-shop",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-2",
          profile: process.env.GITHUB_ACTIONS
            ? undefined
            : input.stage === "production"
              ? "terminal-production"
              : "terminal-dev",
        },
        cloudflare: true,
        "pulumi-stripe": true,
        random: true,
        tls: true,
        planetscale: "0.2.2",
      },
    };
  },
  console: {
    autodeploy: {
      async workflow({ $, event }) {
        await $`bun install`;
        if (event.action === "removed") {
          await $`bun sst remove`;
          return;
        }

        await $`bun sst deploy`;
        if (event.type === "branch" && event.branch === "dev")
          await $`bun run test`.cwd("./packages/functions");
      },
    },
  },
  async run() {
    $transform(cloudflare.WorkerScript, (script) => {
      script.logpush = true;
    });
    sst.Linkable.wrap(cloudflare.Record, function (record) {
      return {
        properties: {
          url: $interpolate`https://${record.name}`,
        },
      };
    });
    const outputs = {};
    const { readdirSync } = await import("fs");
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
