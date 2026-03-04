# CampLog API Reference

## What is CampLog?

CampLog is a campaign change tracking platform for ad arbitrage marketers running Facebook Ads to websites monetized by Google AdSense. It serves as an operational log — every time a marketer makes a change (adjusting spend, pausing a geo, swapping creatives, launching a new campaign), they message CampLog in natural language and the AI extracts structured data: campaign name, action type, geo, metrics, and more.

**Core features:**
- **Chat-based change logging** — type changes like you'd message a teammate; AI extracts the details
- **Campaign dashboard** — all campaigns with change counts, metrics over time (margin %, FB spend, revenue)
- **Impact reviews** — upload post-change screenshots to measure whether a change helped or hurt
- **Ad copy variants** — store headline, primary text, and description variations per campaign
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

### List Campaigns

```
GET /api/campaigns
```

Returns all campaigns for the authenticated user.

**Query parameters** (all optional):
| Param    | Description                      |
|----------|----------------------------------|
| `search` | Filter by campaign name (partial match) |
| `site`   | Filter by site abbreviation      |
| `status` | Filter by status: `active`, `paused`, `archived` |

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Brand X — US",
      "site": "MM",
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

### Get Campaign

```
GET /api/campaigns/{id}
```

Returns a single campaign with its change count.

---

### List Ad Copy Variants

```
GET /api/campaigns/{id}/variants
```

Returns all ad copy variants for a campaign, ordered by field type and sort order.

**Response:**
```json
{
  "variants": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "field_type": "headline",
      "content": "10 Remote Jobs That Pay $80K+",
      "sort_order": 0,
      "created_at": "2026-03-01T..."
    }
  ]
}
```

---

### Add Ad Copy Variants

```
POST /api/campaigns/{id}/variants
Content-Type: application/json
```

Add one or more variants to a campaign. All fields are optional — include whichever types you have.

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
  ]
}
```

**Response:**
```json
{
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

## Typical Workflow for an External AI Copywriter

1. **List campaigns** to find the right campaign ID:
   ```
   GET /api/campaigns?search=Brand+X
   ```

2. **Check existing variants** to avoid duplicates:
   ```
   GET /api/campaigns/{id}/variants
   ```

3. **Post new variants:**
   ```
   POST /api/campaigns/{id}/variants
   {
     "headlines": ["...", "..."],
     "primary_texts": ["..."],
     "descriptions": ["..."]
   }
   ```

The variants will appear immediately in the campaign's detail page in CampLog, ready to copy-paste into ad platforms.
