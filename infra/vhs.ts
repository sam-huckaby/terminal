import { api, auth, authFingerprintKey } from "./api";
import { cluster } from "./cluster";
import { domain } from "./dns";
import { secret } from "./secret";
import { key } from "./ssh";

const bucket = new sst.aws.Bucket("VhsBucket", {
  access: "public",
});

const service = cluster.addService("VHS", {
  cpu: "2 vCPU",
  memory: "4 GB",
  image: {
    dockerfile: "./packages/vhs/Dockerfile",
  },
  loadBalancer: {
    ports: [{ listen: "80/http", forward: "3001/http" }],
  },
  dev: {
    directory: "packages/vhs",
    command: "bun dev",
  },
  link: [bucket, api, auth, secret.StripePublic, authFingerprintKey, key],
});

sst.Linkable.wrap(sst.aws.Cdn, (cdn) => {
  return {
    properties: {
      url: $resolve([cdn.domainUrl, cdn.url]).apply(
        ([domainUrl, url]) => domainUrl ?? url,
      ),
    },
  };
});

export const vhs = new sst.aws.Cdn("VhsCdn", {
  origins: [
    {
      originId: "s3Origin",
      domainName: bucket.nodes.bucket.bucketRegionalDomainName,
    },
    {
      originId: "serviceOrigin",
      domainName: service.url.apply((url) => new URL(url).host),
      customHeaders: [],
      customOriginConfig: {
        httpPort: 80,
        originProtocolPolicy: "http-only",
        httpsPort: 443,
        originSslProtocols: ["TLSv1.2"],
      },
    },
  ],
  originGroups: [
    {
      originId: "mediaGroup",
      failoverCriteria: { statusCodes: [403, 404] },
      members: [{ originId: "s3Origin" }, { originId: "serviceOrigin" }],
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "mediaGroup",
    allowedMethods: ["GET", "HEAD"],
    cachedMethods: ["GET", "HEAD"],
    viewerProtocolPolicy: "redirect-to-https",
    compress: true,
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized policy
    originRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf", // CORS-S3Origin policy
  },
  domain: {
    name: "vhs2." + domain,
    dns: sst.cloudflare.dns(),
  },
});
