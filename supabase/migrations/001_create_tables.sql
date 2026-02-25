-- CampLog Database Schema
-- All tables for campaign change tracking

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site TEXT,
  platform TEXT DEFAULT 'facebook',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_campaigns_user_name_site
  ON campaigns (user_id, name, COALESCE(site, ''));

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own campaigns" ON campaigns FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  image_urls TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_user_created ON chat_messages(user_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHANGES (central table)
-- ============================================
CREATE TABLE changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  chat_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  site TEXT,
  geo TEXT,
  change_value TEXT,
  description TEXT,
  confidence REAL DEFAULT 1.0,

  pre_metrics JSONB DEFAULT '{}',
  post_metrics JSONB DEFAULT '{}',

  change_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics_time_range TEXT,
  impact_review_due DATE,
  impact_reviewed_at TIMESTAMPTZ,

  impact_summary TEXT,
  impact_verdict TEXT CHECK (impact_verdict IN ('positive', 'negative', 'neutral', 'inconclusive')),

  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changes_user_date ON changes(user_id, change_date DESC);
CREATE INDEX idx_changes_campaign ON changes(campaign_id);
CREATE INDEX idx_changes_review_due ON changes(user_id, impact_review_due)
  WHERE impact_reviewed_at IS NULL;

ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own changes" ON changes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- DAILY SNAPSHOTS
-- ============================================
CREATE TABLE daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  site TEXT,
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_snapshots_user_campaign_site_date
  ON daily_snapshots (user_id, campaign_name, COALESCE(site, ''), snapshot_date);

ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own snapshots" ON daily_snapshots FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own reports" ON reports FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET for screenshots
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'screenshots');
