import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Milk, Thermometer, FileText, Clock } from 'lucide-react';
import { SEOHead } from '@/components/SEO/SEOHead';
import { SchemaMarkup } from '@/components/SEO/SchemaMarkup';

export default function DairyManufacturingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHead
        title="Dairy Manufacturing Compliance Software | FDA & USDA Monitoring"
        description="RegIQ helps dairy manufacturers stay compliant with Grade A PMO, 21 CFR 131 regulations, and FDA pasteurization rules. Real-time monitoring for dairy facilities."
        keywords="dairy manufacturing compliance, Grade A PMO, pasteurization monitoring, dairy FDA regulations, 21 CFR 131, dairy safety software"
        canonical="https://regiq.org/industries/dairy-manufacturing"
      />
      <SchemaMarkup type="webApplication" />

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
          <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
            <Milk className="h-4 w-4 mr-1" />
            Dairy Manufacturing
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Dairy Manufacturing Compliance Software | FDA & USDA Monitoring
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Stay compliant with Grade A PMO requirements, 21 CFR 131 dairy standards, and FDA pasteurization 
            regulations. RegIQ provides real-time monitoring for dairy manufacturing facilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Get Dairy Demo</Link>
            </Button>
          </div>
        </section>

        {/* Dairy-Specific Challenges */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Dairy Manufacturing Compliance Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Complex Regulatory Landscape</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-orange-700">
                  <li>• Grade A Pasteurized Milk Ordinance (PMO) requirements</li>
                  <li>• 21 CFR 131 - Standards of Identity for Dairy Products</li>
                  <li>• FDA pasteurization time/temperature requirements</li>
                  <li>• State dairy commission regulations</li>
                  <li>• HACCP plans for dairy processing</li>
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
                    Real-time FDA dairy regulation updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Grade A PMO change notifications
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Pasteurization requirement tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Automated compliance calendars
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Digital HACCP management
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features for Dairy */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Dairy-Specific RegIQ Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Thermometer className="h-10 w-10 text-red-600 mb-4" />
                <CardTitle>Pasteurization Monitoring</CardTitle>
                <CardDescription>
                  Track FDA pasteurization requirements and temperature standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">HTST pasteurization standards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">UHT process requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Temperature validation alerts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Grade A PMO Compliance</CardTitle>
                <CardDescription>
                  Stay current with Grade A Pasteurized Milk Ordinance updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">PMO revision notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Interstate shipment requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Facility inspection prep</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>Standards of Identity</CardTitle>
                <CardDescription>
                  Monitor 21 CFR 131 dairy product standards and labeling requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Milk product definitions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Cheese labeling rules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Nutritional standards</span>
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
              Implementation for Dairy Manufacturers
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Facility Assessment</h3>
                <p className="text-muted-foreground">
                  Review current Grade A PMO compliance status and identify regulatory gaps
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Custom Configuration</h3>
                <p className="text-muted-foreground">
                  Set up dairy-specific alerts for your product lines and processing methods
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Team Training</h3>
                <p className="text-muted-foreground">
                  Train quality and operations teams on RegIQ dairy compliance features
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Case Study */}
        <section className="mb-16">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">Case Study</Badge>
              <CardTitle className="text-2xl">Regional Dairy Cooperative Saves $340K Annually</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-3">Challenge</h4>
                  <p className="text-muted-foreground mb-4">
                    120-farm cooperative processing 2.5M lbs/day struggled to track changing 
                    Grade A PMO requirements across multiple states and maintain FDA compliance.
                  </p>
                  <h4 className="font-semibold mb-3">RegIQ Solution</h4>
                  <p className="text-muted-foreground">
                    Automated monitoring of state-specific PMO changes, FDA dairy alerts, 
                    and facility inspection requirements with custom dashboards for each location.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Results</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>$340K annual savings from early compliance detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>75% reduction in compliance research time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Zero compliance violations in first year</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>100% on-time state inspection readiness</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Streamline Dairy Compliance?</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join dairy manufacturers across the US using RegIQ to stay ahead of Grade A PMO 
            and FDA regulation changes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary" asChild>
              <Link to="/demo">Get Dairy Demo</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}