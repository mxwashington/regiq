-- Create compliance_deadlines table
CREATE TABLE public.compliance_deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  deadline_time TIME,
  agency TEXT NOT NULL, -- FDA, USDA, EPA, etc.
  regulation_reference TEXT, -- CFR section, etc.
  facility_id UUID, -- Links to facilities table if needed
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('upcoming', 'due_soon', 'overdue', 'completed', 'cancelled')) DEFAULT 'upcoming',
  recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'annually')) DEFAULT 'none',
  recurrence_interval INTEGER DEFAULT 1, -- Every X weeks/months/etc
  next_occurrence DATE, -- For recurring deadlines
  tags TEXT[], -- flexible categorization
  reminder_days INTEGER[] DEFAULT '{7, 3, 1}', -- Days before to send reminders
  completion_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_reminders table for tracking sent reminders
CREATE TABLE public.compliance_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deadline_id UUID NOT NULL REFERENCES public.compliance_deadlines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- email, in_app, sms
  days_before INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Create compliance_templates table for common deadlines
CREATE TABLE public.compliance_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  agency TEXT NOT NULL,
  regulation_reference TEXT,
  category TEXT, -- food_safety, environmental, pharmaceutical
  default_priority TEXT DEFAULT 'medium',
  recurrence_type TEXT DEFAULT 'annually',
  typical_deadline_months INTEGER[], -- Months when this is typically due
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.compliance_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_deadlines
CREATE POLICY "Users can view their own deadlines" 
ON public.compliance_deadlines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deadlines" 
ON public.compliance_deadlines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deadlines" 
ON public.compliance_deadlines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deadlines" 
ON public.compliance_deadlines 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for compliance_reminders
CREATE POLICY "Users can view their own reminders" 
ON public.compliance_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create reminders" 
ON public.compliance_reminders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own reminders" 
ON public.compliance_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for compliance_templates
CREATE POLICY "Everyone can view compliance templates" 
ON public.compliance_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage compliance templates" 
ON public.compliance_templates 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_compliance_deadlines_user_id ON public.compliance_deadlines(user_id);
CREATE INDEX idx_compliance_deadlines_deadline_date ON public.compliance_deadlines(deadline_date);
CREATE INDEX idx_compliance_deadlines_status ON public.compliance_deadlines(status);
CREATE INDEX idx_compliance_deadlines_agency ON public.compliance_deadlines(agency);
CREATE INDEX idx_compliance_deadlines_next_occurrence ON public.compliance_deadlines(next_occurrence);
CREATE INDEX idx_compliance_reminders_deadline_id ON public.compliance_reminders(deadline_id);
CREATE INDEX idx_compliance_templates_agency ON public.compliance_templates(agency);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_compliance_deadlines_updated_at
  BEFORE UPDATE ON public.compliance_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert common compliance templates
INSERT INTO public.compliance_templates (title, description, agency, regulation_reference, category, recurrence_type, typical_deadline_months) VALUES
('FDA Food Facility Registration Renewal', 'Biennial renewal of FDA food facility registration', 'FDA', '21 CFR 1.230', 'food_safety', 'annually', '{10, 11, 12}'),
('HACCP Plan Review', 'Annual review and update of HACCP plan', 'FDA', '21 CFR 120', 'food_safety', 'annually', '{1, 12}'),
('Supplier Verification Activities', 'Annual supplier verification per FSMA', 'FDA', '21 CFR 117.410', 'food_safety', 'annually', '{1, 2, 3}'),
('Environmental Monitoring Program Review', 'Quarterly review of environmental monitoring program', 'FDA', '21 CFR 117.165', 'food_safety', 'quarterly', '{3, 6, 9, 12}'),
('USDA Organic Certification Renewal', 'Annual organic certification renewal', 'USDA', '7 CFR 205', 'food_safety', 'annually', '{1, 2}'),
('EPA Wastewater Discharge Permit Renewal', 'NPDES permit renewal', 'EPA', '40 CFR 122', 'environmental', 'annually', '{6, 7, 8}'),
('FDA Nutritional Labeling Compliance Review', 'Review nutritional labeling for compliance', 'FDA', '21 CFR 101', 'food_safety', 'annually', '{1, 6}'),
('OSHA Safety Training Requirements', 'Annual safety training for food workers', 'OSHA', '29 CFR 1910', 'food_safety', 'annually', '{1, 2, 3}');