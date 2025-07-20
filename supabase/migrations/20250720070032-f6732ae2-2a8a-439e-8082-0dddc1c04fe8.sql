-- Create taxonomy tables for the classification system

-- Primary taxonomy categories
CREATE TABLE public.taxonomy_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual tags within categories
CREATE TABLE public.taxonomy_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Alert tags relationship (many-to-many)
CREATE TABLE public.alert_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.taxonomy_tags(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(alert_id, tag_id)
);

-- Tag classification history for audit and improvement
CREATE TABLE public.tag_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  classification_method TEXT NOT NULL, -- 'ai', 'keyword', 'source', 'manual'
  ai_model TEXT,
  classification_data JSONB,
  confidence_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert taxonomy categories
INSERT INTO public.taxonomy_categories (name, description) VALUES
('Industry', 'Primary industry classification'),
('Signal Type', 'Type of regulatory signal or event'),
('Risk Tier', 'Risk level and urgency classification'),
('Source Type', 'Source category of the information'),
('Region', 'Geographic region or jurisdiction');

-- Insert Industry tags
INSERT INTO public.taxonomy_tags (category_id, name, slug, description, color) 
SELECT 
  (SELECT id FROM public.taxonomy_categories WHERE name = 'Industry'),
  tag_name,
  tag_slug,
  tag_desc,
  tag_color
FROM (VALUES
  ('Food', 'food', 'Recalls, safety alerts, HACCP guidance, facility inspections', '#22C55E'),
  ('Pharma', 'pharma', 'Drug approvals, adverse event reports, manufacturing quality issues', '#3B82F6'),
  ('Agriculture', 'agriculture', 'Crop protection, animal health, environmental compliance', '#84CC16'),
  ('Animal Health', 'animal-health', 'Veterinary drug approvals, feed safety, disease outbreaks', '#F59E0B')
) AS tags(tag_name, tag_slug, tag_desc, tag_color);

-- Insert Signal Type tags
INSERT INTO public.taxonomy_tags (category_id, name, slug, description, color)
SELECT 
  (SELECT id FROM public.taxonomy_categories WHERE name = 'Signal Type'),
  tag_name,
  tag_slug,
  tag_desc,
  tag_color
FROM (VALUES
  ('Recall', 'recall', 'Product withdrawals, safety alerts, corrective actions', '#EF4444'),
  ('Rule Change', 'rule-change', 'New regulations, amended guidance, enforcement policies', '#8B5CF6'),
  ('Guidance', 'guidance', 'Industry recommendations, best practices, clarifications', '#06B6D4'),
  ('Warning Letter', 'warning-letter', 'FDA enforcement actions, compliance violations', '#F97316'),
  ('Market Signal', 'market-signal', 'Economic impacts, trade issues, supply chain disruptions', '#10B981'),
  ('Labeling Violation', 'labeling-violation', 'Misbranding issues, claim substantiation problems', '#F59E0B'),
  ('Policy Change', 'policy-change', 'Administrative updates, procedural modifications', '#6366F1')
) AS tags(tag_name, tag_slug, tag_desc, tag_color);

-- Insert Risk Tier tags
INSERT INTO public.taxonomy_tags (category_id, name, slug, description, color)
SELECT 
  (SELECT id FROM public.taxonomy_categories WHERE name = 'Risk Tier'),
  tag_name,
  tag_slug,
  tag_desc,
  tag_color
FROM (VALUES
  ('Info', 'info', 'General updates, educational content, scheduled changes (Score 1-3)', '#6B7280'),
  ('Advisory', 'advisory', 'Recommendations, non-binding guidance, industry trends (Score 4-6)', '#3B82F6'),
  ('Compliance Action', 'compliance-action', 'Mandatory actions, warning letters, enforcement (Score 7-8)', '#F59E0B'),
  ('Deadline', 'deadline', 'Time-sensitive compliance requirements, submission deadlines (Score 9)', '#F97316'),
  ('Immediate Attention', 'immediate-attention', 'Recalls, safety alerts, emergency actions (Score 10)', '#DC2626')
) AS tags(tag_name, tag_slug, tag_desc, tag_color);

-- Insert Source Type tags
INSERT INTO public.taxonomy_tags (category_id, name, slug, description, color)
SELECT 
  (SELECT id FROM public.taxonomy_categories WHERE name = 'Source Type'),
  tag_name,
  tag_slug,
  tag_desc,
  tag_color
FROM (VALUES
  ('Gov', 'gov', 'Federal/state agencies, regulatory bodies, official publications', '#1F2937'),
  ('Legal', 'legal', 'Court decisions, legal interpretations, enforcement actions', '#374151'),
  ('Industry Media', 'industry-media', 'Trade publications, professional associations, industry news', '#4B5563'),
  ('Web', 'web', 'Company announcements, press releases, social media', '#6B7280'),
  ('Social', 'social', 'Twitter, LinkedIn, industry forums, professional networks', '#9CA3AF')
) AS tags(tag_name, tag_slug, tag_desc, tag_color);

-- Insert Region tags
INSERT INTO public.taxonomy_tags (category_id, name, slug, description, color)
SELECT 
  (SELECT id FROM public.taxonomy_categories WHERE name = 'Region'),
  tag_name,
  tag_slug,
  tag_desc,
  tag_color
FROM (VALUES
  ('U.S.', 'us', 'Federal and state-level regulations and enforcement', '#DC2626'),
  ('Canada', 'canada', 'CFIA, Health Canada, provincial regulations', '#EF4444'),
  ('EU', 'eu', 'EFSA, EMA, member state agencies, RASFF alerts', '#3B82F6'),
  ('Global', 'global', 'WHO, FAO, Codex Alimentarius, international standards', '#059669')
) AS tags(tag_name, tag_slug, tag_desc, tag_color);

-- Enable Row Level Security on new tables
ALTER TABLE public.taxonomy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_classifications ENABLE ROW LEVEL SECURITY;

-- Create policies for taxonomy categories (read-only for users)
CREATE POLICY "Users can view taxonomy categories" 
ON public.taxonomy_categories 
FOR SELECT 
USING (true);

-- Create policies for taxonomy tags (read-only for users)
CREATE POLICY "Users can view taxonomy tags" 
ON public.taxonomy_tags 
FOR SELECT 
USING (true);

-- Create policies for alert tags (users can view all)
CREATE POLICY "Users can view alert tags" 
ON public.alert_tags 
FOR SELECT 
USING (true);

-- Create policies for tag classifications (users can view all, admins can manage)
CREATE POLICY "Users can view tag classifications" 
ON public.alert_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage taxonomy categories" 
ON public.taxonomy_categories 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage taxonomy tags" 
ON public.taxonomy_tags 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage alert tags" 
ON public.alert_tags 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage tag classifications" 
ON public.tag_classifications 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_taxonomy_tags_category_id ON public.taxonomy_tags(category_id);
CREATE INDEX idx_taxonomy_tags_slug ON public.taxonomy_tags(slug);
CREATE INDEX idx_alert_tags_alert_id ON public.alert_tags(alert_id);
CREATE INDEX idx_alert_tags_tag_id ON public.alert_tags(tag_id);
CREATE INDEX idx_alert_tags_is_primary ON public.alert_tags(is_primary);
CREATE INDEX idx_tag_classifications_alert_id ON public.tag_classifications(alert_id);
CREATE INDEX idx_tag_classifications_method ON public.tag_classifications(classification_method);