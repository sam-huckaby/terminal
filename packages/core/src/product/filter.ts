import { z } from "zod";
import { createContext } from "../context";
import { ProductTags } from "./product.sql";

export namespace ProductFilter {
  export const Region = z.enum(["eu", "na"]).openapi({
    ref: "Region",
    description: "A Terminal shop user's region.",
    examples: ["na", "eu"],
  });

  export type Region = z.infer<typeof Region>;

  type Context = {
    region?: Region;
    country?: string;
  };

  export type Func = (context: Context, tags: Record<string, any>) => boolean;

  export const All = [
    // Region filter
    (context: Context, tags: ProductTags) => {
      const regions = [
        tags.market_eu ? "eu" : undefined,
        tags.market_na ? "na" : undefined,
      ].flatMap((x) => (x ? [x] : []));
      if (!regions.length) return true;
      if (context.region) return regions.includes(context.region);
      if (context.country) {
        const region = countryToRegion(context.country);
        if (!region) return false;
        return regions.includes(region);
      }
      return true;
    },
  ];

  export function run(ctx: Context, tags: Record<string, any>) {
    if (All.length === 0) return true;
    for (const filter of All) {
      if (!filter(ctx, tags)) return false;
    }
    return true;
  }

  const FilterContext = createContext<Context>();

  export const provide = FilterContext.provide;

  export function use() {
    try {
      return FilterContext.use();
    } catch {
      return {};
    }
  }
}

function countryToRegion(country: string | undefined) {
  if (!country) return undefined;

  const countryCode = country.toLowerCase();
  if (countryCode === "us" || countryCode === "ca" || countryCode === "mx")
    return "na";

  const euCountries = [
    "at", // Austria
    "be", // Belgium
    "bg", // Bulgaria
    "hr", // Croatia
    "cy", // Cyprus
    "cz", // Czechia
    "dk", // Denmark
    "ee", // Estonia
    "fi", // Finland
    "fr", // France
    "de", // Germany
    "gr", // Greece
    "hu", // Hungary
    "ie", // Ireland
    "it", // Italy
    "lv", // Latvia
    "lt", // Lithuania
    "lu", // Luxembourg
    "mt", // Malta
    "nl", // Netherlands
    "pl", // Poland
    "pt", // Portugal
    "ro", // Romania
    "sk", // Slovakia
    "si", // Slovenia
    "es", // Spain
    "se", // Sweden
    "eu", // European Union
    "is", // Iceland
    "li", // Liechtenstein
    "no", // Norway
    "ch", // Switzerland
    "uk", // United Kingdom
  ];
  if (euCountries.includes(countryCode)) return "eu";

  return undefined;
}
