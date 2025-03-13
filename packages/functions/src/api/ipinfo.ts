import { IPinfoWrapper } from "node-ipinfo";
import { Resource } from "sst";

// Create IPinfo client with token from SST resources
export const ipinfo = new IPinfoWrapper(Resource.IpinfoToken.value);

// Cache for IP to region lookups (to reduce API calls)
const ipRegionCache = new Map<string, string | undefined>();

/**
 * Get region from IP address using IPinfo
 * Returns "eu" or "na" based on country code, or undefined if not available
 */
export async function getRegionFromIP(ip: string): Promise<string | undefined> {
  // Check cache first
  if (ipRegionCache.has(ip)) {
    return ipRegionCache.get(ip);
  }

  try {
    const response = await ipinfo.lookupIp(ip);
    const countryCode = response.country?.toLowerCase();

    // Logic from core/product/filter.ts countryToRegion function
    let region: string | undefined;

    if (countryCode === "us" || countryCode === "ca" || countryCode === "mx") {
      region = "na";
    } else if (
      [
        "at",
        "be",
        "bg",
        "hr",
        "cy",
        "cz",
        "dk",
        "ee",
        "fi",
        "fr",
        "de",
        "gr",
        "hu",
        "ie",
        "it",
        "lv",
        "lt",
        "lu",
        "mt",
        "nl",
        "pl",
        "pt",
        "ro",
        "sk",
        "si",
        "es",
        "se",
        "eu",
        "is",
        "li",
        "no",
        "ch",
        "uk",
      ].includes(countryCode)
    ) {
      region = "eu";
    }

    // Cache the result
    ipRegionCache.set(ip, region);
    return region;
  } catch (error) {
    console.error("Error looking up IP:", error);
    return undefined;
  }
}

