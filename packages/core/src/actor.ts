import { eq } from "drizzle-orm";
import { createContext } from "./context";
import { useTransaction } from "./drizzle/transaction";
import { UserFlags, userTable } from "./user/user.sql";
import { ErrorCodes, VisibleError } from "./error";

export interface UserActor {
  type: "user";
  properties: {
    userID: string;
    auth?:
      | {
          type: "personal";
          token: string;
        }
      | {
          type: "oauth";
          clientID: string;
        };
  };
}

export interface PublicActor {
  type: "public";
  properties: {};
}

type Actor = UserActor | PublicActor;
export const ActorContext = createContext<Actor>();

export function useUserID() {
  const actor = ActorContext.use();
  if (actor.type === "user") return actor.properties.userID;
  throw new VisibleError(
    "authentication",
    ErrorCodes.Authentication.UNAUTHORIZED,
    `You don't have permission to access this resource.`,
  );
}

export async function assertFlag(flag: keyof UserFlags) {
  return useTransaction((tx) =>
    tx
      .select({ flags: userTable.flags })
      .from(userTable)
      .where(eq(userTable.id, useUserID()))
      .then((rows) => {
        const flags = rows[0]?.flags;
        if (!flags)
          throw new VisibleError(
            "forbidden",
            ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
            "Actor does not have " + flag + " flag",
          );
      }),
  );
}

export function useActor() {
  try {
    return ActorContext.use();
  } catch {
    return { type: "public", properties: {} } as PublicActor;
  }
}

export function assertActor<T extends Actor["type"]>(type: T) {
  const actor = useActor();
  if (actor.type !== type)
    throw new VisibleError(
      "authentication",
      ErrorCodes.Authentication.UNAUTHORIZED,
      `Actor is not "${type}"`,
    );
  return actor as Extract<Actor, { type: T }>;
}
