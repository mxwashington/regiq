import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, Clock, Target, Users, TrendingUp } from 'lucide-react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

export default function FoodSafetyCompliancePage() {
  const faqSchema = {
    questions: [
      {
        "@type": "Question",
        "name": "What FDA regulations does RegIQ monitor?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ monitors all FDA food safety regulations including FSMA, HACCP, 21 CFR Part 110, 117, and 820, plus real-time recall alerts and enforcement actions."
        }
      },
      {
        "@type": "Question", 
        "name": "How quickly does RegIQ detect new food safety alerts?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ provides real-time monitoring with alerts typically delivered within minutes of FDA or USDA publication."
        }
      },
      {
        "@type": "Question",
        "name": "Can RegIQ integrate with existing food safety management systems?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, RegIQ offers API integration and can connect with most QMS, ERP, and food safety management platforms."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHead
        title="Food Safety Compliance Software | FDA & USDA Monitoring"
        description="RegIQ's AI-powered platform aggregates real-time FDA & USDA alerts for food manufacturers. Automate HACCP, FSMA compliance & recall monitoring. Start free trial."
        keywords="food safety compliance software, FDA monitoring, USDA alerts, HACCP automation, FSMA compliance, recall monitoring, food safety management"
        canonical="https://regiq.org/solutions/food-safety-compliance"
      />
      <SchemaMarkup type="webApplication" />
      <SchemaMarkup type="faq" data={faqSchema} />

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-bold text-2xl">RegIQ</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Food Safety Compliance
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Food Safety Compliance Software for FDA & USDA Monitoring
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Automate regulatory compliance with real-time FDA and USDA alerts, HACCP plan management, 
            and FSMA requirement tracking. Stay ahead of food safety regulations with AI-powered monitoring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Get Demo</Link>
            </Button>
          </div>
        </section>

        {/* Key Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Complete Food Safety Compliance Solution
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>Real-Time FDA Alerts</CardTitle>
                <CardDescription>
                  Instant notifications for recalls, safety alerts, and enforcement actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Class I, II, III recall alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Import alert notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Warning letter tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>USDA FSIS Monitoring</CardTitle>
                <CardDescription>
                  Track meat, poultry, and egg product safety requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">FSIS recall notices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Inspection reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Policy updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>HACCP Automation</CardTitle>
                <CardDescription>
                  Digital HACCP plans and critical control point monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Automated CCP tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Digital record keeping</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Validation reports</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FSMA Compliance Section */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">FSMA Compliance Made Simple</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Navigate Food Safety Modernization Act requirements with automated tracking 
                of preventive controls, supplier verification, and traceability records.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Preventive Controls Rule</h3>
                    <p className="text-muted-foreground text-sm">
                      Automated HARPC plan management and hazard analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Supplier Verification</h3>
                    <p className="text-muted-foreground text-sm">
                      Track supplier approvals and verification activities
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Traceability Records</h3>
                    <p className="text-muted-foreground text-sm">
                      Digital maintenance of required food traceability data
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="bg-gradient-to-br from-primary/5 to-blue-50">
              <CardHeader>
                <CardTitle>Implementation Timeline</CardTitle>
                <CardDescription>Get compliant in 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium">Setup & Configuration</p>
                      <p className="text-sm text-muted-foreground">Days 1-7</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium">Team Training</p>
                      <p className="text-sm text-muted-foreground">Days 8-14</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium">Full Deployment</p>
                      <p className="text-sm text-muted-foreground">Days 15-30</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ROI Section */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-6">Proven ROI for Food Manufacturers</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">80%</div>
                <p className="text-sm text-muted-foreground">Reduction in compliance monitoring time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">$2.1M</div>
                <p className="text-sm text-muted-foreground">Average annual savings from early recall detection</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">Continuous regulatory monitoring</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">15min</div>
                <p className="text-sm text-muted-foreground">Average alert notification time</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqSchema.questions.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.acceptedAnswer.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Automate Food Safety Compliance?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join leading food manufacturers using RegIQ to stay compliant with FDA and USDA regulations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/demo">Schedule Demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}