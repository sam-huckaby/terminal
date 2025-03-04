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
    // Raycast
    (context: Context, tags: ProductTags) => {
      if (context.app !== "raycast") return true;
      return tags.app === "raycast";
    },

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

      // no geo location was pssed in so assume nothing
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

  export const provide = FilterContext.with;

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
