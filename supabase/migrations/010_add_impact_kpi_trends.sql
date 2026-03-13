-- Add KPI trends column for per-metric trend analysis from impact reviews
ALTER TABLE changes ADD COLUMN IF NOT EXISTS impact_kpi_trends JSONB;
