/**
 * Parse a dash.ltv.so URL to extract site domain, campaign URL path, and date range.
 *
 * URL format:
 * https://dash.ltv.so/urls/{base64(site_domain)}/{id}/url/{base64(domain/path)}?startDate=...&finalDate=...
 */
export interface ParsedLtvUrl {
  siteDomain: string;
  campaignUrl: string; // just the path, e.g. "/adidas-jobs-how-apply"
  startDate: string | null;
  finalDate: string | null;
}

function base64Decode(encoded: string): string {
  // Add padding if needed
  const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function parseLtvUrl(url: string): ParsedLtvUrl | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "dash.ltv.so") return null;

    // Path: /urls/{base64_site}/{id}/url/{base64_full_url}
    const segments = parsed.pathname.split("/").filter(Boolean);
    // segments: ["urls", base64_site, id, "url", base64_full_url]

    if (segments[0] !== "urls" || segments.length < 5 || segments[3] !== "url") {
      return null;
    }

    const siteDomain = base64Decode(segments[1]);
    const fullUrl = base64Decode(segments[4]);

    // fullUrl is "domain/path" — strip the domain to get just the path
    let campaignUrl = fullUrl;
    if (fullUrl.startsWith(siteDomain)) {
      campaignUrl = fullUrl.slice(siteDomain.length);
    }
    // Ensure leading slash
    if (!campaignUrl.startsWith("/")) {
      campaignUrl = "/" + campaignUrl;
    }

    return {
      siteDomain,
      campaignUrl,
      startDate: parsed.searchParams.get("startDate"),
      finalDate: parsed.searchParams.get("finalDate"),
    };
  } catch {
    return null;
  }
}

/**
 * Find all dash.ltv.so URLs in a message and parse them.
 */
export function parseLtvUrlsFromMessage(message: string): ParsedLtvUrl[] {
  const urlRegex = /https?:\/\/dash\.ltv\.so\/urls\/[^\s]+/g;
  const matches = message.match(urlRegex) || [];
  return matches
    .map((url) => parseLtvUrl(url))
    .filter((r): r is ParsedLtvUrl => r !== null);
}
