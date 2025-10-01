-- =============================================
-- FDA COMPREHENSIVE DATA INTEGRATION SCHEMA
-- Creates 7 specialized tables for FDA data
-- =============================================

-- 1. FDA FOOD ENFORCEMENT REPORTS
CREATE TABLE IF NOT EXISTS public.fda_food_enforcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT UNIQUE NOT NULL,
  classification TEXT NOT NULL,
  status TEXT NOT NULL,
  distribution_pattern TEXT,
  product_description TEXT NOT NULL,
  code_info TEXT,
  reason_for_recall TEXT NOT NULL,
  recalling_firm TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  voluntary_mandated TEXT,
  initial_firm_notification TEXT,
  recall_initiation_date DATE,
  center_classification_date DATE,
  report_date DATE NOT NULL,
  termination_date DATE,
  more_code_info TEXT,
  address_1 TEXT,
  address_2 TEXT,
  postal_code TEXT,
  event_id TEXT,
  product_type TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fda_food_recall_date ON public.fda_food_enforcement(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_fda_food_classification ON public.fda_food_enforcement(classification, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_fda_food_status ON public.fda_food_enforcement(status);
CREATE INDEX IF NOT EXISTS idx_fda_food_firm ON public.fda_food_enforcement(recalling_firm);

-- 2. FDA DRUG ENFORCEMENT REPORTS
CREATE TABLE IF NOT EXISTS public.fda_drug_enforcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT UNIQUE NOT NULL,
  classification TEXT NOT NULL,
  status TEXT NOT NULL,
  distribution_pattern TEXT,
  product_description TEXT NOT NULL,
  code_info TEXT,
  reason_for_recall TEXT NOT NULL,
  recalling_firm TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  voluntary_mandated TEXT,
  initial_firm_notification TEXT,
  recall_initiation_date DATE,
  center_classification_date DATE,
  report_date DATE NOT NULL,
  termination_date DATE,
  more_code_info TEXT,
  address_1 TEXT,
  address_2 TEXT,
  postal_code TEXT,
  event_id TEXT,
  product_type TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fda_drug_recall_date ON public.fda_drug_enforcement(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_fda_drug_classification ON public.fda_drug_enforcement(classification);
CREATE INDEX IF NOT EXISTS idx_fda_drug_firm ON public.fda_drug_enforcement(recalling_firm);

-- 3. FDA DEVICE ENFORCEMENT REPORTS
CREATE TABLE IF NOT EXISTS public.fda_device_enforcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT UNIQUE NOT NULL,
  classification TEXT NOT NULL,
  status TEXT NOT NULL,
  distribution_pattern TEXT,
  product_description TEXT NOT NULL,
  code_info TEXT,
  reason_for_recall TEXT NOT NULL,
  recalling_firm TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  voluntary_mandated TEXT,
  initial_firm_notification TEXT,
  recall_initiation_date DATE,
  center_classification_date DATE,
  report_date DATE NOT NULL,
  termination_date DATE,
  more_code_info TEXT,
  address_1 TEXT,
  address_2 TEXT,
  postal_code TEXT,
  event_id TEXT,
  product_type TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fda_device_recall_date ON public.fda_device_enforcement(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_fda_device_classification ON public.fda_device_enforcement(classification);
CREATE INDEX IF NOT EXISTS idx_fda_device_firm ON public.fda_device_enforcement(recalling_firm);

-- 4. FDA ADVERSE EVENTS (FAERS)
CREATE TABLE IF NOT EXISTS public.fda_adverse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safetyreportid TEXT UNIQUE NOT NULL,
  receivedate DATE NOT NULL,
  serious INT,
  patient_age NUMERIC,
  patient_sex TEXT,
  drug_name TEXT NOT NULL,
  drug_indication TEXT,
  reaction_term TEXT[] NOT NULL,
  outcome TEXT[],
  report_source TEXT,
  manufacturer_name TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faers_receivedate ON public.fda_adverse_events(receivedate DESC);
CREATE INDEX IF NOT EXISTS idx_faers_drug_name ON public.fda_adverse_events(drug_name);
CREATE INDEX IF NOT EXISTS idx_faers_reactions ON public.fda_adverse_events USING gin(reaction_term);

-- 5. FDA INSPECTION CITATIONS (Form 483)
CREATE TABLE IF NOT EXISTS public.fda_inspection_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fei_number TEXT,
  legal_name TEXT NOT NULL,
  inspection_end_date DATE NOT NULL,
  fiscal_year INT NOT NULL,
  project_area TEXT,
  classification TEXT,
  cfr_citation TEXT,
  short_description TEXT,
  long_description TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_date ON public.fda_inspection_citations(inspection_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_classification ON public.fda_inspection_citations(classification);
CREATE INDEX IF NOT EXISTS idx_inspection_firm ON public.fda_inspection_citations(legal_name);

-- 6. FDA IMPORT ALERTS
CREATE TABLE IF NOT EXISTS public.fda_import_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_number TEXT UNIQUE NOT NULL,
  alert_type TEXT,
  alert_name TEXT NOT NULL,
  publish_date DATE NOT NULL,
  country TEXT,
  firm_name TEXT,
  product_description TEXT,
  reason_for_alert TEXT,
  list_type TEXT,
  status TEXT DEFAULT 'active',
  source_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_alert_date ON public.fda_import_alerts(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_alert_status ON public.fda_import_alerts(status);
CREATE INDEX IF NOT EXISTS idx_import_alert_firm ON public.fda_import_alerts(firm_name);
CREATE INDEX IF NOT EXISTS idx_import_alert_number ON public.fda_import_alerts(alert_number);

-- 7. FDA WARNING LETTERS
CREATE TABLE IF NOT EXISTS public.fda_warning_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_number TEXT UNIQUE NOT NULL,
  issuing_office TEXT NOT NULL,
  issue_date DATE NOT NULL,
  subject TEXT NOT NULL,
  company_name TEXT NOT NULL,
  letter_url TEXT NOT NULL,
  product_type TEXT[],
  violations TEXT[],
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warning_letter_date ON public.fda_warning_letters(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_warning_letter_company ON public.fda_warning_letters(company_name);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE public.fda_food_enforcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_drug_enforcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_device_enforcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_adverse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_inspection_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_import_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fda_warning_letters ENABLE ROW LEVEL SECURITY;

-- Service role policies (for edge functions)
CREATE POLICY "Service role full access fda_food" ON public.fda_food_enforcement FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access fda_drug" ON public.fda_drug_enforcement FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access fda_device" ON public.fda_device_enforcement FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access faers" ON public.fda_adverse_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access inspections" ON public.fda_inspection_citations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access import_alerts" ON public.fda_import_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access warning_letters" ON public.fda_warning_letters FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read policies (authenticated users can view)
CREATE POLICY "Authenticated users can view fda_food" ON public.fda_food_enforcement FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view fda_drug" ON public.fda_drug_enforcement FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view fda_device" ON public.fda_device_enforcement FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view faers" ON public.fda_adverse_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view inspections" ON public.fda_inspection_citations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view import_alerts" ON public.fda_import_alerts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view warning_letters" ON public.fda_warning_letters FOR SELECT USING (auth.uid() IS NOT NULL);