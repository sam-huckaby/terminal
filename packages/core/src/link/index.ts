import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { Actor } from "../actor";
import { linkTable } from "./link.sql";
import { nanoid } from "nanoid/non-secure";

export module Link {
  export const Info = z.object({
    id: z.string(),
    url: z.string().url(),
    expires: z.date(),
    userID: z.string().optional(),
  });

  export type Info = z.infer<typeof Info>;

  export const create = fn(Info.shape.url, (url) =>
    useTransaction(async (tx) => {
      const id = nanoid(8);
      await tx.insert(linkTable).values({
        id,
        url,
        userID: Actor.userID(),
        timeExpired: new Date(Date.now() + 3600 * 1000),
      });
      return id;
    }),
  );

  export const remove = fn(Info.shape.id, (id) =>
    useTransaction(async (tx) => {
      await tx
        .delete(linkTable)
        .where(and(eq(linkTable.id, id), eq(linkTable.userID, Actor.userID())));
    }),
  );

  export const fromID = fn(Info.shape.id, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(linkTable)
        .where(eq(linkTable.id, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  function serialize(
    input: typeof linkTable.$inferSelect,
  ): z.infer<typeof Info> {
    return {
      id: input.id,
      url: input.url,
      expires: input.timeExpired,
      userID: input.userID ?? undefined,
    };
  }
}
