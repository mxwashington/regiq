
-- Create tables for chatbot functionality
CREATE TABLE public.chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_time_ms INTEGER DEFAULT 0
);

-- Add Row Level Security
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own chat logs
CREATE POLICY "Users can view their own chat logs" 
  ON public.chat_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own chat logs
CREATE POLICY "Users can insert their own chat logs" 
  ON public.chat_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all chat logs
CREATE POLICY "Admins can view all chat logs" 
  ON public.chat_logs 
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Admins can delete chat logs
CREATE POLICY "Admins can delete chat logs" 
  ON public.chat_logs 
  FOR DELETE 
  USING (is_admin(auth.uid()));

-- Create table for legal document metadata
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users,
  is_active BOOLEAN DEFAULT true
);

-- Add RLS for legal documents
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Everyone can read active legal documents
CREATE POLICY "Everyone can read active legal documents" 
  ON public.legal_documents 
  FOR SELECT 
  USING (is_active = true);

-- Admins can manage legal documents
CREATE POLICY "Admins can manage legal documents" 
  ON public.legal_documents 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Create table for cookie consents
CREATE TABLE public.cookie_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  ip_address INET,
  consent_granted BOOLEAN NOT NULL,
  consent_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '1 year')
);

-- Add RLS for cookie consents
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view their own consents" 
  ON public.cookie_consents 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert their own consents" 
  ON public.cookie_consents 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Anonymous users can insert consents with IP tracking
CREATE POLICY "Anonymous users can insert consents" 
  ON public.cookie_consents 
  FOR INSERT 
  WITH CHECK (user_id IS NULL);

-- Insert initial legal documents
INSERT INTO public.legal_documents (document_type, title, content, version) VALUES
('terms', 'Terms of Service', 
'# RegIQ Terms of Service

## 1. Acceptance of Terms
By accessing or using RegIQ, you agree to be bound by these Terms of Service.

## 2. Description of Service
RegIQ provides regulatory intelligence and monitoring services for FDA, USDA, EPA, and other regulatory agencies.

## 3. User Responsibilities
- You must provide accurate information when creating an account
- You are responsible for maintaining the confidentiality of your account
- You agree not to use the service for any unlawful purpose

## 4. Subscription and Payment
- Subscription fees are billed in advance
- No refunds for partial months
- Prices subject to change with 30 days notice

## 5. Data and Privacy
- We collect and process data as described in our Privacy Policy
- Regulatory data is provided for informational purposes only
- You must verify all regulatory information independently

## 6. Disclaimers
- RegIQ is not a law firm and does not provide legal advice
- Regulatory data may be incomplete or outdated
- Service is provided "as is" without warranties

## 7. Limitation of Liability
Our liability is limited to the amount paid for the service in the preceding 12 months.

## 8. Governing Law
These terms are governed by the laws of Delaware, USA.

Last updated: ' || now()::date, '1.0'),

('privacy', 'Privacy Policy',
'# RegIQ Privacy Policy

## Information We Collect
- Account information (name, email, company)
- Usage data and analytics
- Search queries and preferences
- Payment information (processed by Stripe)

## How We Use Information
- To provide and improve our services
- To communicate with you about your account
- To comply with legal obligations
- For marketing (with your consent)

## Information Sharing
We do not sell your personal information. We may share data with:
- Service providers (Supabase, Stripe, Perplexity)
- Legal authorities when required by law

## Data Retention
- Account data: Retained while your account is active
- Usage data: Retained for 2 years
- Marketing data: Until you opt out

## Your Rights
- Access your personal information
- Correct inaccurate information
- Delete your account and data
- Export your data

## Cookies
We use essential cookies for authentication and optional cookies for analytics.

## Contact
For privacy questions, contact: privacy@regiq.com

Last updated: ' || now()::date, '1.0'),

('dpa', 'Data Processing Addendum',
'# Data Processing Addendum

This Data Processing Addendum ("DPA") forms part of the RegIQ Terms of Service.

## 1. Definitions
- "Controller" means the entity that determines the purposes and means of processing
- "Processor" means RegIQ, which processes data on behalf of Controller
- "Personal Data" has the meaning given in applicable data protection laws

## 2. Processing Details
- Categories of data: Contact information, usage data, search queries
- Purposes: Providing regulatory intelligence services
- Data subjects: Controller's employees and authorized users

## 3. Processor Obligations
RegIQ will:
- Process data only on documented instructions
- Implement appropriate security measures
- Notify Controller of data breaches within 72 hours
- Assist with data subject requests

## 4. Sub-processors
Current sub-processors include:
- Supabase (database hosting)
- Stripe (payment processing)
- Perplexity (AI search)

## 5. Data Transfers
Data may be transferred to countries with adequate protection or under appropriate safeguards.

## 6. Data Deletion
Upon termination, data will be deleted within 30 days unless legally required to retain.

Last updated: ' || now()::date, '1.0');
