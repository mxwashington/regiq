-- Create analytics_reports table for advanced reporting
CREATE TABLE public.analytics_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('compliance_maturity', 'regulatory_trends', 'cost_analysis', 'risk_assessment', 'executive_summary')) NOT NULL,
  report_data JSONB NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  filters JSONB DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_metrics table for tracking key metrics
CREATE TABLE public.compliance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- response_time, completion_rate, risk_score, etc.
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL,
  facility_id UUID, -- Links to facilities if applicable
  agency TEXT, -- FDA, USDA, EPA
  category TEXT, -- food_safety, environmental, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create benchmark_data table for industry comparisons
CREATE TABLE public.benchmark_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_sector TEXT NOT NULL, -- food_manufacturing, pharma, etc.
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  percentile_rank INTEGER, -- 25th, 50th, 75th, 90th percentile
  data_source TEXT DEFAULT 'industry_average',
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_reports
CREATE POLICY "Users can view their own reports" 
ON public.analytics_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.analytics_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.analytics_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for compliance_metrics
CREATE POLICY "Users can view their own metrics" 
ON public.compliance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
ON public.compliance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert metrics" 
ON public.compliance_metrics 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for benchmark_data
CREATE POLICY "Everyone can view benchmark data" 
ON public.benchmark_data 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage benchmark data" 
ON public.benchmark_data 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_analytics_reports_user_id ON public.analytics_reports(user_id);
CREATE INDEX idx_analytics_reports_type ON public.analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_generated_at ON public.analytics_reports(generated_at);
CREATE INDEX idx_compliance_metrics_user_id ON public.compliance_metrics(user_id);
CREATE INDEX idx_compliance_metrics_date ON public.compliance_metrics(metric_date);
CREATE INDEX idx_compliance_metrics_type ON public.compliance_metrics(metric_type);
CREATE INDEX idx_benchmark_data_industry ON public.benchmark_data(industry_sector);
CREATE INDEX idx_benchmark_data_metric ON public.benchmark_data(metric_type);

-- Insert sample benchmark data for food manufacturing industry
INSERT INTO public.benchmark_data (industry_sector, metric_type, metric_value, percentile_rank, valid_from, valid_to) VALUES
-- Compliance response times (in days)
('food_manufacturing', 'avg_response_time', 3.2, 25, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'avg_response_time', 5.8, 50, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'avg_response_time', 9.1, 75, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'avg_response_time', 15.3, 90, '2024-01-01', '2024-12-31'),

-- Compliance completion rates (percentage)
('food_manufacturing', 'completion_rate', 72, 25, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'completion_rate', 84, 50, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'completion_rate', 92, 75, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'completion_rate', 97, 90, '2024-01-01', '2024-12-31'),

-- Risk scores (0-100, lower is better)
('food_manufacturing', 'risk_score', 28, 25, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'risk_score', 35, 50, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'risk_score', 45, 75, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'risk_score', 58, 90, '2024-01-01', '2024-12-31'),

-- Annual compliance costs (in thousands USD)
('food_manufacturing', 'annual_compliance_cost', 125, 25, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'annual_compliance_cost', 285, 50, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'annual_compliance_cost', 520, 75, '2024-01-01', '2024-12-31'),
('food_manufacturing', 'annual_compliance_cost', 890, 90, '2024-01-01', '2024-12-31'),

-- Pharmaceutical industry benchmarks
('pharmaceutical', 'avg_response_time', 2.1, 25, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'avg_response_time', 4.2, 50, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'avg_response_time', 7.8, 75, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'avg_response_time', 12.5, 90, '2024-01-01', '2024-12-31'),

('pharmaceutical', 'completion_rate', 89, 25, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'completion_rate', 94, 50, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'completion_rate', 97, 75, '2024-01-01', '2024-12-31'),
('pharmaceutical', 'completion_rate', 99, 90, '2024-01-01', '2024-12-31');