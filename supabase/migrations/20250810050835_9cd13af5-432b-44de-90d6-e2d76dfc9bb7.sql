-- Phase 2 migration: Supplier Watch, Notes, Reviews, Usage Logs
-- Create tables, indexes, triggers, and RLS policies

-- 1) supplier_watches
CREATE TABLE IF NOT EXISTS public.supplier_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_name text NOT NULL,
  supplier_identifier text,
  agency text,
  keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_watches_user_name UNIQUE (user_id, supplier_name)
);

ALTER TABLE public.supplier_watches ENABLE ROW LEVEL SECURITY;

-- Users manage their own supplier watches
CREATE POLICY IF NOT EXISTS "Users can manage own supplier watches"
ON public.supplier_watches
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all supplier watches
CREATE POLICY IF NOT EXISTS "Admins can view all supplier watches"
ON public.supplier_watches
FOR SELECT
USING (is_admin(auth.uid()));

-- Update updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplier_watches_updated_at'
  ) THEN
    CREATE TRIGGER trg_supplier_watches_updated_at
    BEFORE UPDATE ON public.supplier_watches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enforce per-user limit (25)
CREATE OR REPLACE FUNCTION public.enforce_supplier_watch_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  watch_count integer;
BEGIN
  SELECT COUNT(*) INTO watch_count
  FROM public.supplier_watches
  WHERE user_id = NEW.user_id;

  IF watch_count >= 25 THEN
    RAISE EXCEPTION 'Supplier watch limit (25) reached for this user';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_supplier_watches_limit'
  ) THEN
    CREATE TRIGGER trg_supplier_watches_limit
    BEFORE INSERT ON public.supplier_watches
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_supplier_watch_limit();
  END IF;
END $$;

-- 2) alert_notes
CREATE TABLE IF NOT EXISTS public.alert_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_alert_notes_alert FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE
);

ALTER TABLE public.alert_notes ENABLE ROW LEVEL SECURITY;

-- Users manage their own notes
CREATE POLICY IF NOT EXISTS "Users can manage own alert notes"
ON public.alert_notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all notes
CREATE POLICY IF NOT EXISTS "Admins can view all alert notes"
ON public.alert_notes
FOR SELECT
USING (is_admin(auth.uid()));

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_alert_notes_updated_at
    BEFORE UPDATE ON public.alert_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) alert_reviews
CREATE TABLE IF NOT EXISTS public.alert_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_id uuid NOT NULL,
  reviewed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_alert_reviews_alert FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE,
  CONSTRAINT uq_alert_reviews_user_alert UNIQUE (user_id, alert_id)
);

ALTER TABLE public.alert_reviews ENABLE ROW LEVEL SECURITY;

-- Users manage their own reviews
CREATE POLICY IF NOT EXISTS "Users can manage own alert reviews"
ON public.alert_reviews
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all reviews
CREATE POLICY IF NOT EXISTS "Admins can view all alert reviews"
ON public.alert_reviews
FOR SELECT
USING (is_admin(auth.uid()));

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_reviews_updated_at'
  ) THEN
    CREATE TRIGGER trg_alert_reviews_updated_at
    BEFORE UPDATE ON public.alert_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  feature_name text NOT NULL,
  amount integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert and view their own usage logs (and anonymous logs allowed)
CREATE POLICY IF NOT EXISTS "Users can insert own usage logs"
ON public.usage_logs
FOR INSERT
WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY IF NOT EXISTS "Users can view own usage logs"
ON public.usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all usage logs
CREATE POLICY IF NOT EXISTS "Admins can view all usage logs"
ON public.usage_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_supplier_watches_user ON public.supplier_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notes_user ON public.alert_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notes_alert ON public.alert_notes(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_reviews_user ON public.alert_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_reviews_alert ON public.alert_reviews(alert_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_feature ON public.usage_logs(feature_name);
