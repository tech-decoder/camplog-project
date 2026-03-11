# CampLog API Reference

## What is CampLog?

CampLog is a campaign change tracking platform for ad arbitrage marketers running Facebook Ads to websites monetized by Google AdSense. It serves as an operational log — every time a marketer makes a change (adjusting spend, pausing a geo, swapping creatives, launching a new campaign), they message CampLog in natural language and the AI extracts structured data: campaign name, action type, geo, metrics, and more.

**Core features:**
- **Chat-based change logging** — type changes like you'd message a teammate; AI extracts the details
- **Campaign dashboard** — all campaigns with change counts, metrics over time (margin %, FB spend, revenue)
- **Impact reviews** — upload post-change screenshots to measure whether a change helped or hurt
- **Ad copy variants** — store headline, primary text, and description variations per campaign
- **AI image generation** — generate ad creative images with GPT Image or Google Imagen 3, multiple styles and quality tiers
- **Goals & strategy** — set revenue goals per site, get AI-generated strategy recommendations
- **Reports** — auto-generated daily/weekly performance summaries

---

## Authentication

All API requests require a **Bearer token** (API key).

Generate a key in the app: **Settings > API Keys > Generate Key**

The key looks like: `cl_a1b2c3d4e5f6...` (43 characters total).

```
Authorization: Bearer cl_your_key_here
```

Keys can be revoked from Settings at any time.

---

## Base URL

```
https://camplog-ltv.vercel.app
```

---

## Endpoints

### Add Variants by Campaign Name (Recommended)

```
POST /api/campaigns/by-name?name=Campaign+Name
Content-Type: application/json
```

**This is the easiest endpoint for external tools.** It accepts a campaign name, auto-creates the campaign if it doesn't exist, and adds the variants. No need to look up campaign IDs first.

**Request body:**
```json
{
  "headlines": [
    "10 Remote Jobs That Pay $80K+",
    "Companies Hiring Right Now (March 2026)"
  ],
  "primary_texts": [
    "Looking for a remote job that actually pays well? These companies are actively hiring..."
  ],
  "descriptions": [
    "Browse 500+ verified remote positions"
  ],
  "site": "MM"
}
```

All fields are optional — include whichever types you have. `site` is optional and only used when creating a new campaign.

**Response:**
```json
{
  "campaign_id": "uuid",
  "variants": [
    {
      "id": "uuid",
      "field_type": "headline",
      "content": "10 Remote Jobs That Pay $80K+",
      "sort_order": 0,
      "created_at": "2026-03-01T..."
    }
  ]
}
```

---

### List Campaigns

```
GET /api/campaigns
```

Returns all campaigns for the authenticated user, grouped by name.

**Query parameters** (all optional):
| Param    | Description                      |
|----------|----------------------------------|
| `search` | Filter by campaign name (partial match) |
| `site`   | Filter by site abbreviation      |

**Response:**
```json
{
  "campaigns": [
    {
      "name": "Brand X — US",
      "campaign_ids": ["uuid1", "uuid2"],
      "sites": ["MM", "TH"],
      "platform": "facebook",
      "status": "active",
      "change_count": 12,
      "last_change_date": "2026-03-01",
      "created_at": "2026-01-15T...",
      "updated_at": "2026-03-01T..."
    }
  ]
}
```

---

### Get Campaign by Name

```
GET /api/campaigns/by-name?name=Campaign+Name
```

Returns aggregated campaign data across all entries matching the name, including all sites running it.

---

### List Ad Copy Variants by Campaign ID

```
GET /api/campaigns/{id}/variants
```

Returns all ad copy variants for a campaign, ordered by field type and sort order.

---

### Add Ad Copy Variants by Campaign ID

```
POST /api/campaigns/{id}/variants
Content-Type: application/json
```

Same body format as the by-name endpoint (without `site`). Requires the campaign to already exist.

---

### Delete Ad Copy Variants

```
DELETE /api/campaigns/{id}/variants
Content-Type: application/json
```

**Request body:**
```json
{
  "ids": ["variant-uuid-1", "variant-uuid-2"]
}
```

---

### Generate Ad Images

```
POST /api/campaigns/{id}/images/generate
Content-Type: application/json
```

Generate AI-powered ad creative images for a campaign.

**Request body:**
```json
{
  "headline": "10 Remote Jobs That Pay $80K+",
  "primary_text": "Looking for a remote job?",
  "style_preset": "modern",
  "model": "gpt-image-1",
  "quality": "standard",
  "custom_instructions": "Include a laptop on a desk with warm lighting",
  "count": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `headline` | string | Headline text to include in the image |
| `primary_text` | string | Ad copy for context |
| `style_preset` | string | One of: `modern`, `minimal`, `bold`, `lifestyle`, `product` |
| `model` | string | `gpt-image-1` (best text rendering) or `imagen-3` (fast, cost-effective) |
| `quality` | string | `draft` (~$0.01), `standard` (~$0.03), `premium` (~$0.13) |
| `custom_instructions` | string | Additional prompt instructions |
| `count` | number | Number of images to generate (1-4) |

All fields are optional.

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "image_url": "https://...",
      "model": "gpt-image-1",
      "quality": "standard",
      "style_preset": "modern",
      "headline_ref": "10 Remote Jobs That Pay $80K+",
      "created_at": "2026-03-10T..."
    }
  ]
}
```

---

### List Generated Images

```
GET /api/campaigns/{id}/images
```

Returns all generated images for a campaign, newest first.

---

### Delete Generated Image

```
DELETE /api/campaigns/{id}/images
Content-Type: application/json
```

**Request body:**
```json
{
  "imageId": "image-uuid"
}
```

---

## Typical Workflow for an External AI Copywriter

**Simple approach (recommended):** Just POST by name — no need to list campaigns first:

```
POST /api/campaigns/by-name?name=KFC%20US%20Jobs
Authorization: Bearer cl_your_key_here
Content-Type: application/json

{
  "headlines": ["Now Hiring: KFC Team Members", "Join KFC — Apply Today"],
  "primary_texts": ["KFC is hiring across the US..."],
  "descriptions": ["Apply in 2 minutes"],
  "site": "MM"
}
```

If "KFC US Jobs" doesn't exist yet, it gets created automatically. Variants appear immediately in the campaign's detail page in CampLog, ready to copy-paste into ad platforms.

**Advanced approach:** If you need to check existing variants first:

1. `GET /api/campaigns?search=KFC` — find campaigns
2. `GET /api/campaigns/{id}/variants` — check existing variants
3. `POST /api/campaigns/by-name?name=KFC+US+Jobs` — add new variants
