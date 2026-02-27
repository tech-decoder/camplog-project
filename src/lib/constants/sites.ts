export interface SiteDefinition {
  domain: string;
  abbreviation: string;
  shortName: string;
}

export const KNOWN_SITES: SiteDefinition[] = [
  { domain: "moneyblog.mhbharti.com", abbreviation: "MBM", shortName: "MoneyBlog" },
  { domain: "portal.gkbix.com", abbreviation: "GKB", shortName: "GKBix" },
  { domain: "nasildenir.com", abbreviation: "NASI", shortName: "NasilDenir" },
  { domain: "moneymatters.marathilekh.in", abbreviation: "MMM", shortName: "MoneyMatters" },
  { domain: "dollarsense.thir13een.com", abbreviation: "DLS", shortName: "DollarSense" },
  { domain: "wallet.placify.in", abbreviation: "PCW", shortName: "Placify Wallet" },
  { domain: "shop.propaintball.com", abbreviation: "PPS", shortName: "ProPaintball" },
  { domain: "imscan.net", abbreviation: "IM", shortName: "IMScan" },
  { domain: "aidemobile.com", abbreviation: "AIM", shortName: "AideMobile" },
  { domain: "bibomedia.com", abbreviation: "BIBO", shortName: "BiboMedia" },
];

export const SITE_ABBREVIATION_MAP: Record<string, SiteDefinition> = Object.fromEntries(
  KNOWN_SITES.map((s) => [s.abbreviation, s])
);

export const SITE_ABBREVIATIONS = KNOWN_SITES.map((s) => s.abbreviation);
