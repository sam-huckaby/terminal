import { auth, authFingerprintKey, api } from "./api";
import { secret } from "./secret";
import { execSync } from "child_process";
import { domain } from "./dns";
import { cluster, vpc } from "./cluster";

sst.Linkable.wrap(tls.PrivateKey, (resource) => ({
  properties: {
    private: resource.privateKeyOpenssh,
    public: resource.publicKeyOpenssh,
  },
}));

export const key = new tls.PrivateKey("SSHKey", {
  algorithm: "ED25519",
});

const sg = new aws.ec2.SecurityGroup("SSHSecurityGroup", {
  vpcId: vpc.id,
  description: "SSH Security Group",
  // allow all inbound traffic
  ingress: [
    {
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

new sst.aws.Service("SSH", {
  cluster,
  cpu: "2 vCPU",
  memory: "4 GB",
  wait: true,
  image: {
    context: "./packages/go",
  },
  link: [api, auth, secret.StripePublic, authFingerprintKey, key],
  environment: {
    VERSION: !$dev ? execSync("git rev-parse HEAD").toString().trim() : "",
  },
  public: {
    domain:
      $app.stage === "production"
        ? undefined
        : {
            name: domain,
            dns: sst.cloudflare.dns({
              proxy: true,
            }),
          },
    rules: [
      { listen: "22/tcp", forward: "2222/tcp" },
      { listen: "80/tcp", forward: "8000/tcp" },
    ],
  },
  scaling:
    $app.stage === "production"
      ? {
          min: 2,
          max: 10,
        }
      : undefined,
  dev: {
    directory: "packages/go",
    command: "go run ./cmd/ssh",
  },

  transform: {
    service: {
      networkConfiguration: {
        subnets: vpc.publicSubnets,
        assignPublicIp: true,
        securityGroups: [sg.id],
      },
    },
    target: {
      preserveClientIp: "true",
    },
  },
});
