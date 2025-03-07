import "zod-openapi/extend";
import { issuer } from "@openauthjs/openauth";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { Provider } from "@openauthjs/openauth/provider/provider";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { Select } from "@openauthjs/openauth/ui/select";
import { TwitchProvider } from "@openauthjs/openauth/provider/twitch";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { subjects } from "./subject.js";
import { THEME_TERMINAL } from "@openauthjs/openauth/ui/theme";
import { Resource } from "sst";
import { handle } from "hono/aws-lambda";
import { User } from "@terminal/core/user/index";
import { Api } from "@terminal/core/api/api";
import { Email } from "@terminal/core/email/index";
import { logger } from "hono/logger";

const app = issuer({
  subjects,
  ttl: {
    access: 60 * 8,
  },
  theme: THEME_TERMINAL,
  select: Select({
    providers: {
      ssh: {
        hide: true,
      },
    },
  }),
  providers: {
    password: PasswordProvider(
      PasswordUI({
        sendCode: async (email, code) => {
          console.log(email, code);
          await Email.send(
            "auth",
            email,
            `Terminal code: ${code}`,
            `Your terminal login code is ${code}`,
          );
        },
      }),
    ),
    code: CodeProvider<{ email: string }>(
      CodeUI({
        sendCode: async (claims, code) => {
          console.log(code, claims.email);
          await Email.send(
            "auth",
            claims.email!,
            `Terminal code: ${code}`,
            `Your terminal login code is ${code}`,
          );
        },
      }),
    ),
    twitch: TwitchProvider({
      clientID: Resource.TwitchClientID.value,
      clientSecret: Resource.TwitchClientSecret.value,
      scopes: ["user:read:email"],
    }),
    github: GithubProvider({
      clientID: Resource.GithubClientID.value,
      clientSecret: Resource.GithubClientSecret.value,
      scopes: ["user:email"],
    }),
    ssh: {
      type: "ssh",
      async client(input) {
        if (input.clientSecret !== Resource.AuthFingerprintKey.value) {
          throw new Error("Invalid authorization token");
        }
        const fingerprint = input.params.fingerprint;
        if (!fingerprint) {
          throw new Error("Fingerprint is required");
        }
        return {
          fingerprint,
        };
      },
      init() {},
    } as Provider<{
      fingerprint: string;
    }>,
  },
  allow: async (input) => {
    if (process.env.SST_DEV) return true;
    const url = new URL(input.redirectURI);
    const hostname = url.hostname;
    if (hostname.endsWith("terminal.shop")) return true;
    if (hostname === "localhost") return true;
    if (
      await Api.Client.verifyRedirect({
        id: input.clientID,
        redirectURI: url.origin + url.pathname,
      })
    )
      return true;
    return false;
  },
  success: async (ctx, value) => {
    if (value.provider === "ssh") {
      let id = await User.fromFingerprint(value.fingerprint).then((x) => x?.id);
      if (!id) {
        id = await User.create({
          fingerprint: value.fingerprint,
        });
      }
      return ctx.subject("user", {
        userID: id!,
      });
    }

    let email = undefined as string | undefined;
    if (value.provider === "code") {
      email = value.claims.email;
    }

    if (value.provider === "github") {
      const access = value.tokenset.access;
      const response = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${access}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const emails = (await response.json()) as any[];
      const primary = emails.find((email: any) => email.primary);
      console.log(primary);
      if (!primary.verified) {
        throw new Error("Email not verified");
      }
      email = primary.email;
    }

    if (value.provider === "password") {
      email = value.email;
    }

    console.log("found email", email);

    if (email) {
      const matching = await User.fromEmail(email);
      if (matching.length === 0) {
        const id = await User.create({
          email,
        });
        return ctx.subject("user", {
          userID: id,
        });
      }
      if (matching.length === 1) {
        return ctx.subject("user", {
          userID: matching[0]!.id,
        });
      }
      if (matching.length > 1) {
        const id = await User.merge(matching.map((x) => x.id));
        return ctx.subject("user", {
          userID: id!,
        });
      }
    }

    return new Response("something went wrong", { status: 500 });
  },
}).use(logger());

// @ts-ignore
export const handler = handle(app);
