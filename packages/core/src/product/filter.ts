import { createContext } from "../context";
import { ProductTags } from "./product.sql";

export namespace ProductFilter {
  type Context = {
    region?: "eu" | "na";
    country?: string;
    ip?: string;
    app?: string;
    sdk?: string;
    sdkVersion?: string;
    os?: string;
  };

  export type Func = (context: Context, tags: Record<string, any>) => boolean;

  export const All = [
    (context: Context, tags: ProductTags) => {
      if (context.app !== "raycast") return true;
      return tags.app === "raycast";
    },
  ];

  export function run(ctx: Context, tags: Record<string, any>) {
    console.log({ ctx });

    if (All.length === 0) return true;

    for (const filter of All) {
      if (!filter(ctx, tags)) return false;
    }

    return true;
  }

  const FilterContext = createContext<Context>();

  export const provide = FilterContext.with;

  export function use() {
    try {
      return FilterContext.use();
    } catch {
      return {};
    }
  }
}
