import { createContext } from "../context";

type FilterContext = {
  region?: "eu" | "na";
  country?: string;
  ip?: string;
  app?: string;
  sdk?: string;
  sdkVersion?: string;
  os?: string;
};

export type FilterFunc = (context: FilterContext) => boolean;

export const Filters = {
  eu: (context: FilterContext) => {
    if (context.region) return context.region === "eu";
    // TODO: add countries

    return true;
  },
  na: (context: FilterContext) => {
    if (context.region) return context.region === "na";
    // TODO: add countries

    return true;
  },
} satisfies Record<string, FilterFunc>;

export type Filter = keyof typeof Filters;

export function filter(ctx: FilterContext, filters: Filter[]) {
  console.log({ ctx, filters });

  if (filters.length === 0) return true;

  for (const filter of filters) {
    const func = Filters[filter];
    if (!func) throw new Error(`Filter ${filter} not found`);
    if (!func(ctx)) return false;
  }

  return true;
}

export const FilterContext = createContext<FilterContext>();

export function useFilterContext() {
  try {
    return FilterContext.use();
  } catch {
    return {};
  }
}
