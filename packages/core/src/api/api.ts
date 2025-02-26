import { z } from "zod";
import { fn } from "../util/fn";
import { and, db, eq, isNull } from "../drizzle";
import { apiClientTable, apiPersonalTokenTable } from "./api.sql";
import { createID } from "../util/id";
import { useUserID } from "../actor";
import { randomBytes } from "crypto";
import { Resource } from "sst";
import { Common } from "../common";
import { Examples } from "../examples";

export namespace Api {
  export namespace Client {
    export const Info = z
      .object({
        id: z.string().openapi({
          description: Common.IdDescription,
          example: Examples.App.id,
        }),
        name: z.string().openapi({
          description: "Name of the app.",
          example: Examples.App.name,
        }),
        redirectURI: z.string().openapi({
          description: "Redirect URI of the app.",
          example: Examples.App.redirectURI,
        }),
        secret: z.string().openapi({
          description: "OAuth 2.0 client secret of the app (obfuscated).",
          example: Examples.App.secret,
        }),
      })
      .openapi({
        ref: "App",
        description: "A Terminal App used for configuring an OAuth 2.0 client.",
        example: Examples.App,
      });

    export type Info = z.infer<typeof Info>;

    export const create = fn(
      Info.pick({
        name: true,
        redirectURI: true,
      }),
      async (input) => {
        const id = createID("apiClient");
        const secret = createID("apiSecret");
        await db.insert(apiClientTable).values({
          id,
          secret,
          name: input.name,
          redirectURI: input.redirectURI,
          userID: useUserID(),
        });
        return {
          id,
          secret,
        };
      },
    );

    export const verifyRedirect = fn(
      Info.pick({
        id: true,
        redirectURI: true,
      }),
      async (input) => {
        const match = await db
          .select({ id: apiClientTable.id })
          .from(apiClientTable)
          .where(
            and(
              eq(apiClientTable.id, input.id),
              eq(apiClientTable.redirectURI, input.redirectURI),
            ),
          );
        return match.length === 1;
      },
    );

    export async function list(): Promise<Info[]> {
      return db
        .select()
        .from(apiClientTable)
        .where(
          and(
            eq(apiClientTable.userID, useUserID()),
            isNull(apiClientTable.timeDeleted),
          ),
        )
        .then((rows) => rows.map(serialize));
    }

    export const remove = fn(
      Info.shape.id,
      async (input) =>
        await db
          .delete(apiClientTable)
          .where(
            and(
              eq(apiClientTable.id, input),
              eq(apiClientTable.userID, useUserID()),
            ),
          ),
    );

    function obfuscate(secret: string) {
      const [prefix, id] = secret.split("_");
      const last4 = id?.slice(-4);
      return `${prefix}_******${last4}`;
    }

    function serialize(
      input: typeof apiClientTable.$inferSelect,
    ): z.infer<typeof Info> {
      return {
        id: input.id,
        name: input.name,
        redirectURI: input.redirectURI,
        secret: obfuscate(input.secret),
      };
    }

    export const fromID = fn(Info.shape.id, async (input) => {
      return db
        .select()
        .from(apiClientTable)
        .where(eq(apiClientTable.id, input))
        .then((rows) => serialize(rows.at(0)!));
    });
  }

  export namespace Personal {
    export const Info = z
      .object({
        id: z.string().openapi({
          description: Common.IdDescription,
          example: Examples.Token.id,
        }),
        created: z.date().openapi({
          description: "The created time for the token.",
          example: Examples.Token.created,
        }),
        token: z.string().openapi({
          description: "Personal access token (obfuscated).",
          example: Examples.Token.token,
        }),
      })
      .openapi({
        ref: "Token",
        description:
          "A personal access token used to access the Terminal API. If you leak this, expect large sums of coffee to be ordered on your credit card.",
        example: Examples.Token,
      });

    export type Info = z.infer<typeof Info>;

    export async function create() {
      const id = createID("apiPersonal");
      const prefix = Resource.App.stage === "production" ? "live" : "test";
      const token = `trm_${prefix}_` + randomBytes(10).toString("hex");
      await db.insert(apiPersonalTokenTable).values({
        id,
        token,
        userID: useUserID(),
      });

      return {
        id,
        token,
      };
    }

    export const remove = fn(
      Info.shape.id,
      async (input) =>
        await db
          .delete(apiPersonalTokenTable)
          .where(
            and(
              eq(apiPersonalTokenTable.id, input),
              eq(apiPersonalTokenTable.userID, useUserID()),
            ),
          ),
    );

    export async function list(): Promise<Info[]> {
      return db
        .select()
        .from(apiPersonalTokenTable)
        .where(
          and(
            eq(apiPersonalTokenTable.userID, useUserID()),
            isNull(apiPersonalTokenTable.timeDeleted),
          ),
        )
        .then((rows) => rows.map(serialize));
    }

    function obfuscate(token: string) {
      const [prefix, stage, id] = token.split("_");
      const last4 = id?.slice(-4);
      return `${prefix}_${stage}_******${last4}`;
    }

    function serialize(
      input: typeof apiPersonalTokenTable.$inferSelect,
    ): z.infer<typeof Info> {
      return {
        id: input.id,
        created: input.timeCreated,
        token: obfuscate(input.token),
      };
    }

    export const fromID = fn(Info.shape.id, async (input) => {
      return db
        .select()
        .from(apiPersonalTokenTable)
        .where(eq(apiPersonalTokenTable.id, input))
        .then((rows) => serialize(rows.at(0)!));
    });

    export async function fromToken(token: string) {
      return db
        .select({
          id: apiPersonalTokenTable.id,
          userID: apiPersonalTokenTable.userID,
        })
        .from(apiPersonalTokenTable)
        .where(eq(apiPersonalTokenTable.token, token))
        .then((rows) => rows.at(0));
    }
  }
}
