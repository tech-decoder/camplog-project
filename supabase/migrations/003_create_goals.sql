-- ============================================
-- REVENUE GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Period (first day of month, e.g. 2026-02-01)
  month DATE NOT NULL,

  -- Targets
  target_revenue DECIMAL(12,2),
  target_profit DECIMAL(12,2),
  target_margin_pct DECIMAL(5,2),
  target_fb_spend DECIMAL(12,2),

  -- Actuals (updated as data comes in)
  actual_revenue DECIMAL(12,2) DEFAULT 0,
  actual_fb_spend DECIMAL(12,2) DEFAULT 0,
  actual_profit DECIMAL(12,2) DEFAULT 0,
  actual_margin_pct DECIMAL(5,2) DEFAULT 0,

  -- Metadata
  notes TEXT,
  ai_strategy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_month ON revenue_goals(user_id, month DESC);

ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own goals" ON revenue_goals FOR ALL USING (auth.uid() = user_id);
-- Allow service role full access
CREATE POLICY "Service role full access goals" ON revenue_goals FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SITE MONTHLY REVENUE (per-site data for a month)
-- ============================================
CREATE TABLE IF NOT EXISTS site_monthly_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES revenue_goals(id) ON DELETE CASCADE,

  site TEXT NOT NULL,
  month DATE NOT NULL,

  -- Revenue metrics
  revenue DECIMAL(12,2) DEFAULT 0,
  fb_spend DECIMAL(12,2) DEFAULT 0,
  fb_revenue DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  margin_pct DECIMAL(5,2) DEFAULT 0,

  -- Traffic metrics (optional)
  ad_clicks INTEGER,
  ad_rpm DECIMAL(8,4),
  fb_cpc DECIMAL(8,4),

  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, site, month)
);

CREATE INDEX IF NOT EXISTS idx_site_monthly_user ON site_monthly_revenue(user_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_site_monthly_goal ON site_monthly_revenue(goal_id);

ALTER TABLE site_monthly_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own site revenue" ON site_monthly_revenue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role full access site revenue" ON site_monthly_revenue FOR ALL USING (true) WITH CHECK (true);
