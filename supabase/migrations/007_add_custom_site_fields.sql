-- Add custom site fields to user_sites
ALTER TABLE user_sites ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE user_sites ADD COLUMN IF NOT EXISTS site_url TEXT;

-- Backfill existing Bill's sites with names from known sites
UPDATE user_sites SET site_name = 'MoneyBlog', site_url = 'https://moneyblog.mhbharti.com' WHERE site_abbreviation = 'MBM' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'GKBix', site_url = 'https://portal.gkbix.com' WHERE site_abbreviation = 'GXP' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'NasilDenir', site_url = 'https://nasildenir.com' WHERE site_abbreviation = 'NASI' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'MoneyMatters', site_url = 'https://moneymatters.marathilekh.in' WHERE site_abbreviation = 'MMM' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'DollarSense', site_url = 'https://dollarsense.thir13een.com' WHERE site_abbreviation = 'DLS' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'Placify Wallet', site_url = 'https://wallet.placify.in' WHERE site_abbreviation = 'PCW' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'ProPaintball', site_url = 'https://shop.propaintball.com' WHERE site_abbreviation = 'PPS' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'IMScan', site_url = 'https://imscan.net' WHERE site_abbreviation = 'IM' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'AideMobile', site_url = 'https://aidemobile.com' WHERE site_abbreviation = 'AIM' AND site_name IS NULL;
UPDATE user_sites SET site_name = 'BiboMedia', site_url = 'https://bibomedia.com' WHERE site_abbreviation = 'BIBO' AND site_name IS NULL;
