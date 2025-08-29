import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Package, AlertTriangle, FileText, Clock } from 'lucide-react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

export default function PackagedFoodsPage() {
  const faqSchema = {
    questions: [
      {
        "@type": "Question",
        "name": "How does RegIQ help with FSMA Preventive Controls compliance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ monitors FDA updates to 21 CFR 117 Preventive Controls Rule, tracks HARPC requirements, and provides alerts on validation and verification procedures for packaged food manufacturers."
        }
      },
      {
        "@type": "Question", 
        "name": "What allergen management features does RegIQ provide?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "RegIQ tracks FDA allergen labeling requirements, monitors recall alerts for undeclared allergens, and provides updates on the top 9 allergen regulations and cross-contamination prevention standards."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHead
        title="Packaged Foods Compliance Software | FSMA & FDA Monitoring"
        description="RegIQ helps packaged food manufacturers comply with FSMA Preventive Controls, allergen labeling, and nutritional requirements. Real-time FDA monitoring for food processors."
        keywords="packaged foods compliance, FSMA preventive controls, allergen management, FDA food labeling, nutritional labeling compliance, food processing software"
        canonical="https://regiq.org/industries/packaged-foods"
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
          <Badge variant="outline" className="mb-4 bg-purple-50 text-purple-700 border-purple-200">
            <Package className="h-4 w-4 mr-1" />
            Packaged Foods
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Packaged Foods Compliance Software | FSMA & FDA Monitoring
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stay compliant with FSMA Preventive Controls, allergen labeling, and nutritional requirements. 
            RegIQ provides comprehensive FDA monitoring for packaged food manufacturers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Get Packaged Foods Demo</Link>
            </Button>
          </div>
        </section>

        {/* Regulatory Challenges */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Packaged Foods Compliance Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Complex FDA Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-orange-700">
                  <li>• FSMA Preventive Controls Rule (21 CFR 117)</li>
                  <li>• Allergen labeling and cross-contamination prevention</li>
                  <li>• Nutritional Facts Panel compliance</li>
                  <li>• Good Manufacturing Practices (GMPs)</li>
                  <li>• Supply chain verification requirements</li>
                  <li>• Traceability and recordkeeping</li>
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
                    Real-time FDA regulation updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    FSMA compliance calendar
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Allergen recall alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Labeling requirement tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Supplier verification monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Packaged Foods Specific Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <AlertTriangle className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>FSMA Preventive Controls</CardTitle>
                <CardDescription>
                  Automated tracking of FDA Preventive Controls requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">HARPC plan management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Process preventive controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Allergen preventive controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Sanitation controls</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Allergen Management</CardTitle>
                <CardDescription>
                  Comprehensive allergen compliance and recall monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Top 9 allergen tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Cross-contamination alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Undeclared allergen recalls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Supplier allergen verification</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>Labeling Compliance</CardTitle>
                <CardDescription>
                  Monitor FDA labeling and nutritional requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Nutrition Facts Panel updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Ingredient labeling rules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Health claims compliance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Organic labeling standards</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Implementation Process */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Implementation for Packaged Food Manufacturers
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
                <h3 className="text-lg font-semibold mb-2">Product Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  Review product lines for FSMA and allergen compliance requirements
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
                <h3 className="text-lg font-semibold mb-2">Alert Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Set up FDA monitoring for your specific product categories and ingredients
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
                <h3 className="text-lg font-semibold mb-2">Team Training</h3>
                <p className="text-sm text-muted-foreground">
                  Train quality and regulatory teams on RegIQ compliance features
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
                <h3 className="text-lg font-semibold mb-2">Ongoing Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Continuous compliance monitoring and proactive alert management
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Case Study */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">Case Study</Badge>
              <CardTitle className="text-2xl">Snack Food Manufacturer Achieves 100% FSMA Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-3">Challenge</h4>
                  <p className="text-muted-foreground mb-4">
                    Multi-facility snack manufacturer with 200+ SKUs struggled to maintain 
                    FSMA Preventive Controls compliance across allergen-containing and allergen-free production lines.
                  </p>
                  <h4 className="font-semibold mb-3">RegIQ Solution</h4>
                  <p className="text-muted-foreground">
                    Implemented automated FDA monitoring, allergen recall alerts, and HARPC 
                    compliance tracking with facility-specific dashboards and mobile notifications.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Results</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>100% FSMA compliance achieved within 90 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Zero allergen-related recalls in 2 years</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>$850K savings from prevented recall events</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>95% faster regulatory research process</span>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Master FSMA Compliance?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join packaged food manufacturers using RegIQ to stay compliant with FDA 
            regulations and prevent costly compliance issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/demo">Get FSMA Demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}