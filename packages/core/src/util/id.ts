import { ulid } from "ulid";

export const prefixes = {
  user: "usr",
  inventory: "inv",
  inventoryRecord: "irc",
  userShipping: "shp",
  card: "crd",
  product: "prd",
  productVariant: "var",
  cartItem: "itm",
  cart: "crt",
  order: "ord",
  subscription: "sub",
  apiClient: "cli",
  apiSecret: "sec",
  apiPersonal: "pat",
} as const;

export function createID(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], ulid()].join("_");
}
