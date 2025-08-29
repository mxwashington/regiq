import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Beef, Thermometer, FileText, Clock, AlertTriangle } from 'lucide-react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

export default function MeatPoultryPage() {
  const faqSchema = {
    questions: [
      {
        "@type": "Question",
        "name": "What USDA FSIS regulations does RegIQ monitor for meat processors?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ monitors all USDA FSIS regulations including HACCP requirements, pathogen testing standards, labeling compliance, and facility inspection notices for meat and poultry processors."
        }
      },
      {
        "@type": "Question", 
        "name": "How does RegIQ help with E. coli and Salmonella compliance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ provides real-time alerts on pathogen testing requirements, outbreak notifications, and FSIS policy changes related to E. coli O157:H7, Salmonella, and other foodborne pathogens."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHead
        title="Meat & Poultry Processing Compliance Software | USDA FSIS Monitoring"
        description="RegIQ helps meat and poultry processors stay compliant with USDA FSIS regulations, HACCP requirements, and pathogen testing standards. Real-time FSIS alerts and compliance monitoring."
        keywords="meat processing compliance, poultry HACCP, USDA FSIS monitoring, pathogen testing, meat safety software, FSIS alerts"
        canonical="https://regiq.org/industries/meat-poultry"
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
          <Badge variant="outline" className="mb-4 bg-red-50 text-red-700 border-red-200">
            <Beef className="h-4 w-4 mr-1" />
            Meat & Poultry Processing
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Meat & Poultry Processing Compliance Software | USDA FSIS Monitoring
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stay compliant with USDA FSIS regulations, HACCP requirements, and pathogen testing standards. 
            RegIQ provides real-time monitoring for meat and poultry processing facilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Get Meat Processing Demo</Link>
            </Button>
          </div>
        </section>

        {/* Regulatory Challenges */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Meat & Poultry Compliance Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Complex USDA Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-orange-700">
                  <li>• USDA FSIS HACCP regulations (9 CFR 417)</li>
                  <li>• Pathogen testing for E. coli O157:H7, Salmonella</li>
                  <li>• Sanitation Standard Operating Procedures (SSOPs)</li>
                  <li>• FSIS labeling and claims approval</li>
                  <li>• Facility inspection compliance</li>
                  <li>• Recall procedures and notifications</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">RegIQ Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Real-time USDA FSIS alerts and notices
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Pathogen testing requirement updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    HACCP plan compliance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Inspection readiness tools
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Automated recall notifications
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Meat & Poultry Specific Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>FSIS Pathogen Monitoring</CardTitle>
                <CardDescription>
                  Track USDA pathogen testing requirements and outbreak alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">E. coli O157:H7 testing updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Salmonella performance standards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Listeria monitoring programs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Outbreak investigation alerts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>HACCP Compliance</CardTitle>
                <CardDescription>
                  Automated HACCP plan management for meat and poultry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">CCP monitoring and validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">SSOP compliance tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Verification and validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Record keeping automation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>FSIS Labeling & Claims</CardTitle>
                <CardDescription>
                  Monitor labeling requirements and claims approval processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Nutrition labeling updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Health claims approval alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Organic certification rules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Country of origin labeling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ROI Statistics */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-6">Industry ROI Metrics</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">$3.2M</div>
                <p className="text-sm text-muted-foreground">Average savings from avoided recalls</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">85%</div>
                <p className="text-sm text-muted-foreground">Reduction in FSIS violation risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">USDA FSIS monitoring coverage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">99.8%</div>
                <p className="text-sm text-muted-foreground">HACCP compliance success rate</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Case Study */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">Case Study</Badge>
              <CardTitle className="text-2xl">Regional Beef Processor Prevents $4.8M Recall</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-3">Challenge</h4>
                  <p className="text-muted-foreground mb-4">
                    Mid-size beef processing facility (500,000 lbs/week) struggled to track changing 
                    FSIS pathogen testing requirements and maintain HACCP compliance across multiple shifts.
                  </p>
                  <h4 className="font-semibold mb-3">RegIQ Solution</h4>
                  <p className="text-muted-foreground">
                    Automated FSIS alert monitoring, pathogen testing calendar, and HACCP 
                    compliance dashboard with real-time notifications for all quality staff.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Results</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>$4.8M recall prevented through early E. coli detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>90% reduction in FSIS compliance research time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>100% HACCP audit pass rate for 18 months</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Zero pathogen testing violations since implementation</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Streamline USDA FSIS Compliance?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join meat and poultry processors using RegIQ to stay compliant with USDA FSIS 
            regulations and prevent costly recalls.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/demo">Get FSIS Demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}