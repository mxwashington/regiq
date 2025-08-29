import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Coffee, Droplets, FileText, Clock, AlertTriangle } from 'lucide-react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

export default function BeverageProductionPage() {
  const faqSchema = {
    questions: [
      {
        "@type": "Question",
        "name": "What FDA beverage regulations does RegIQ monitor?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ monitors FDA beverage standards including juice HACCP (21 CFR 120), bottled water regulations (21 CFR 165), and acidified foods requirements for beverage manufacturers."
        }
      },
      {
        "@type": "Question", 
        "name": "How does RegIQ help with juice HACCP compliance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ provides alerts on FDA juice HACCP updates, pathogen reduction requirements, and critical control point monitoring for juice and beverage processors."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHead
        title="Beverage Production Compliance Software | FDA Juice & Water Regulations"
        description="RegIQ helps beverage manufacturers comply with FDA juice HACCP, bottled water regulations, and acidified foods requirements. Real-time FDA monitoring for beverage producers."
        keywords="beverage compliance software, juice HACCP, bottled water regulations, FDA beverage standards, acidified foods compliance, beverage safety monitoring"
        canonical="https://regiq.org/industries/beverage-production"
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
          <Badge variant="outline" className="mb-4 bg-cyan-50 text-cyan-700 border-cyan-200">
            <Droplets className="h-4 w-4 mr-1" />
            Beverage Production
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Beverage Production Compliance Software | FDA Juice & Water Regulations
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stay compliant with FDA juice HACCP, bottled water regulations, and acidified foods requirements. 
            RegIQ provides specialized monitoring for beverage manufacturers and processors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Get Beverage Demo</Link>
            </Button>
          </div>
        </section>

        {/* Regulatory Challenges */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Beverage Production Compliance Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Complex FDA Beverage Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-orange-700">
                  <li>• Juice HACCP regulations (21 CFR 120)</li>
                  <li>• Bottled water standards (21 CFR 165)</li>
                  <li>• Acidified foods requirements (21 CFR 114)</li>
                  <li>• Nutritional labeling for beverages</li>
                  <li>• Pathogen reduction requirements</li>
                  <li>• Good Manufacturing Practices</li>
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
                    Real-time FDA beverage regulation updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Juice HACCP compliance tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Bottled water quality alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Acidification process monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Pathogen testing updates
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Beverage Industry Specific Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Coffee className="h-10 w-10 text-amber-600 mb-4" />
                <CardTitle>Juice HACCP Compliance</CardTitle>
                <CardDescription>
                  Automated tracking of FDA juice HACCP requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">5-log pathogen reduction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Critical control points</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Pasteurization validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Record keeping requirements</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Droplets className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Bottled Water Standards</CardTitle>
                <CardDescription>
                  Monitor FDA bottled water quality and labeling requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Water quality standards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Source water monitoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Treatment process alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Labeling compliance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>Acidified Foods Control</CardTitle>
                <CardDescription>
                  Track acidified beverage processing requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">pH monitoring requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Thermal processing schedules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Process deviation alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Validation studies</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Beverage Categories */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Supported Beverage Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Coffee className="h-12 w-12 mx-auto mb-4 text-amber-600" />
                <h3 className="font-semibold mb-2">Fruit Juices</h3>
                <p className="text-sm text-muted-foreground">
                  Fresh, concentrated, and shelf-stable juices
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Droplets className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Bottled Water</h3>
                <p className="text-sm text-muted-foreground">
                  Spring, purified, and mineral water
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Coffee className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">Soft Drinks</h3>
                <p className="text-sm text-muted-foreground">
                  Carbonated and non-carbonated beverages
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Droplets className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <h3 className="font-semibold mb-2">Energy Drinks</h3>
                <p className="text-sm text-muted-foreground">
                  Functional and enhanced beverages
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ROI Statistics */}
        <section className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-6">Beverage Industry ROI</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">$1.8M</div>
                <p className="text-sm text-muted-foreground">Average savings from prevented recalls</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">92%</div>
                <p className="text-sm text-muted-foreground">Juice HACCP compliance rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">60%</div>
                <p className="text-sm text-muted-foreground">Reduction in compliance research time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">FDA beverage monitoring</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Case Study */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">Case Study</Badge>
              <CardTitle className="text-2xl">Premium Juice Company Achieves Perfect HACCP Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-3">Challenge</h4>
                  <p className="text-muted-foreground mb-4">
                    Cold-pressed juice manufacturer producing 50,000 bottles/week struggled with 
                    FDA juice HACCP compliance and pathogen reduction validation across multiple product lines.
                  </p>
                  <h4 className="font-semibold mb-3">RegIQ Solution</h4>
                  <p className="text-muted-foreground">
                    Implemented automated FDA juice regulation monitoring, HACCP compliance tracking, 
                    and pathogen reduction alerts with real-time notifications for quality teams.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Results</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>100% juice HACCP compliance for 24 months</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Zero pathogen-related quality issues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>$420K savings from avoided recall potential</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>75% faster FDA compliance research</span>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Streamline Beverage Compliance?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join beverage manufacturers using RegIQ to stay compliant with FDA juice HACCP 
            and water quality regulations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/demo">Get Beverage Demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}