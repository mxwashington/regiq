import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ComplianceAssistant as ComplianceAssistantComponent } from '@/components/ComplianceAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ComplianceAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const { hasFeatureAccess, subscriptionTier } = usePlanRestrictions();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Access the AI Compliance Assistant with your RegIQ account
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/auth">
                Sign In to Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAccess = hasFeatureAccess('compliance_assistant');

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Helmet>
          <title>AI Compliance Assistant - RegIQ</title>
          <meta name="description" content="Get expert regulatory guidance with RegIQ's AI Compliance Assistant" />
        </Helmet>

        <div className="max-w-4xl mx-auto pt-8">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">AI Compliance Assistant</CardTitle>
              <CardDescription className="text-lg">
                Get instant, expert-level regulatory guidance tailored to your facility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="font-semibold mb-3">What you'll get with Professional or Enterprise:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>Instant answers to FDA, USDA, FSIS, and EPA questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>Facility-specific compliance guidance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>Exact CFR citations and regulatory references</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>Actionable next steps and documentation requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span>Risk assessment and compliance gap analysis</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Current plan: <strong>{subscriptionTier || 'Starter'}</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild>
                    <Link to="/pricing">
                      Upgrade to Professional
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/contact">Contact Sales</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI Compliance Assistant - RegIQ</title>
        <meta name="description" content="Get instant, expert-level regulatory guidance tailored to your facility with RegIQ's AI Compliance Assistant" />
        <meta name="keywords" content="FDA compliance, USDA regulations, food safety AI, regulatory guidance, HACCP" />
      </Helmet>

      <div className="container mx-auto py-8">
        <ComplianceAssistantComponent />
      </div>
    </div>
  );
};

export default ComplianceAssistantPage;