import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import NotFound from '@/pages/NotFound';

interface BlogPostData {
  id: string;
  title: string;
  content: string;
  publishDate: string;
  readTime: string;
  category: string;
  slug: string;
  metaDescription: string;
}

const blogPosts: Record<string, BlogPostData> = {
  '2025-food-compliance-checklist': {
    id: '1',
    title: 'The Essential 2025 Food Compliance Checklist: What Every Food Manufacturer Needs to Prepare For Right Now',
    metaDescription: 'Complete 2025 food compliance checklist covering BVO ban, PFAS reporting, FDA healthy definition changes, and state-level ingredient restrictions. Critical deadlines and action items included.',
    publishDate: '2025-01-22',
    readTime: '12 min read',
    category: 'Compliance',
    slug: '2025-food-compliance-checklist',
    content: `
The regulatory landscape for food manufacturers has never been more complex—or more urgent. With major compliance deadlines approaching in the next six months and significant policy shifts already underway, food companies must act quickly to avoid costly violations and market disruptions. This comprehensive checklist covers the most critical regulatory changes affecting food manufacturers in 2025, complete with specific deadlines and actionable steps.

## Immediate Action Required (Next 6 Months)

### 🚨 BVO Ban - Deadline: August 2, 2025
**What:** Brominated Vegetable Oil (BVO) is now prohibited in all food and beverage products.
**Who's Affected:** Beverage manufacturers, especially citrus-flavored drinks

**Action Items:**
- Audit all current formulations for BVO content
- Work with flavor suppliers to secure BVO-free alternatives  
- Update product formulations and conduct stability testing
- Revise ingredient declarations and nutritional panels
- Plan production transitions to meet the August 2025 deadline

### 🚨 PFAS Reporting Deadline - Deadline: January 11, 2026
**What:** EPA requires detailed reporting on PFAS use in products from 2011-2022.
**Who's Affected:** All manufacturers using PFAS in packaging, processing, or ingredients

**Action Items:**
- Conduct comprehensive PFAS audit of all products and packaging
- Gather historical records from 2011-2022
- Prepare separate reports for each PFAS type used
- Coordinate with packaging suppliers for PFAS disclosure
- Consider PFAS-free alternatives for future products

## Major Regulatory Changes - 2025 Implementation

### 📋 FDA "Healthy" Definition Overhaul
**Effective:** February 25, 2025 | **Compliance Deadline:** February 28, 2028
**What:** Complete revision of "healthy" claim requirements focusing on food groups and nutrient limits

**Action Items:**
- Review products currently using "healthy" claims
- Assess products against new whole grain, added sugar, and sodium requirements
- Develop reformulation strategy for non-compliant products
- Train marketing teams on new claim requirements
- Monitor FDA's development of approved "healthy" symbols

### 📊 Enhanced Traceability Requirements
**What:** Stricter end-to-end supply chain visibility requirements

**Action Items:**
- Implement digital traceability systems (blockchain, IoT sensors, RFID)
- Establish supplier verification protocols
- Create detailed batch tracking procedures
- Develop rapid recall capabilities
- Train staff on new documentation requirements

### 🔬 GRAS Pathway Changes
**What:** FDA scrutinizing self-affirmed GRAS process, requiring more comprehensive safety data

**Action Items:**
- Review all self-affirmed GRAS ingredients currently in use
- Prepare comprehensive safety documentation for key ingredients
- Budget for extended approval timelines (6-9 months longer)
- Consider pre-submission consultations with FDA
- Develop backup ingredient strategies for critical formulations

## State-Level Compliance Challenges

### 🗺️ Multi-State Ingredient Bans
**Affected States:** California, Missouri, Oklahoma, Texas with varying effective dates

**Banned Ingredients Include:**
- Red Dye 3, Yellow 5, Yellow 6, Blue 1, Blue 2
- Potassium bromate, propylparaben
- Titanium dioxide, BHA, azodicarbonamide

**Action Items:**
- Map current products against state-specific banned ingredient lists
- Develop state-specific formulations or nationwide reformulations
- Update supply chain management for multi-state compliance
- Review school meal programs for Texas-specific requirements

## Food Safety & Quality Enhancements

### 🛡️ Allergen Management Intensification
**What:** Stricter cross-contact prevention and digital labeling requirements

**Action Items:**
- Develop comprehensive written allergen control plans
- Implement stricter cross-contact prevention protocols
- Upgrade to digital/QR code allergen disclosure systems
- Train production staff on updated allergen procedures
- Conduct regular allergen risk assessments

### 🌡️ Climate Risk Integration
**What:** ISO 22000 now requires climate change impact assessments

**Action Items:**
- Assess climate risks to ingredient sourcing
- Evaluate production facility vulnerability to extreme weather
- Develop climate-resilient supply chain strategies
- Update HACCP plans to include climate-related hazards
- Document climate risk mitigation measures

## Technology & Innovation Requirements

### 💻 Digital Transformation Mandates
**What:** Shift from paper-based to digital record-keeping and monitoring systems

**Action Items:**
- Digitize HACCP plans and monitoring records
- Implement real-time temperature and environmental monitoring
- Deploy predictive analytics for risk assessment
- Integrate supply chain visibility platforms
- Train staff on new digital systems

### 🔍 Post-Market Surveillance Preparation
**What:** FDA implementing new review process for previously approved ingredients

**Action Items:**
- Maintain comprehensive safety files for all ingredients
- Monitor FDA post-market surveillance announcements
- Develop rapid response protocols for ingredient restrictions
- Create alternative ingredient databases
- Strengthen relationships with ingredient suppliers

## Labeling & Consumer Communication Updates

### 📱 Front-of-Pack Labeling Preparation
**What:** FDA developing mandatory nutrition symbols for package fronts

**Action Items:**
- Monitor FDA's front-of-pack labeling rule development
- Assess current products against likely FOP requirements
- Prepare packaging redesign timelines and budgets
- Coordinate with marketing teams on consumer messaging strategy

### 📅 Date Labeling Standardization
**What:** Movement toward "Best if Used By" standardization; California bans "Sell By" by July 2026

**Action Items:**
- Audit current date labeling practices across all products
- Transition to "Best if Used By" terminology
- Update labeling systems for California compliance by July 2026
- Coordinate with retailers on new labeling requirements

## Strategic Preparation Recommendations

### 🎯 Immediate (Next 30 Days)
1. **Conduct comprehensive regulatory gap analysis** across all product lines
2. **Establish cross-functional compliance team** including R&D, quality, legal, and operations
3. **Prioritize BVO and PFAS compliance** as highest urgency items
4. **Begin supplier communication** regarding new requirements

### 📈 Short-term (3-6 Months)
1. **Implement digital traceability systems** and staff training
2. **Complete product reformulations** for banned ingredients
3. **Develop state-specific compliance strategies**
4. **Enhance allergen management protocols**

### 🚀 Long-term (6-12 Months)
1. **Integrate sustainability metrics** with food safety programs
2. **Build climate resilience** into supply chain planning
3. **Prepare for front-of-pack labeling** implementation
4. **Establish proactive regulatory monitoring** systems

## Key Resources & Next Steps

**Stay Informed:**
- Subscribe to FDA, USDA, and state regulatory updates
- Join industry associations for regulatory guidance
- Establish relationships with regulatory consultants

**Build Capabilities:**
- Invest in regulatory expertise and training
- Develop robust documentation systems
- Create rapid response protocols for regulatory changes

The regulatory environment will continue evolving rapidly throughout 2025. Companies that proactively address these requirements now will gain competitive advantages while avoiding costly compliance failures. The key is treating regulatory compliance not as a burden, but as a strategic capability that builds consumer trust and operational resilience.

**Don't wait—start your compliance assessment today.** The companies that act now will be positioned for success, while those that delay risk significant market disruption and financial penalties.

---

*Need help navigating these complex requirements? RegIQ's regulatory intelligence platform provides real-time compliance monitoring and alerts to keep your food manufacturing operations ahead of regulatory changes. Contact us to learn how we can streamline your compliance strategy for 2025 and beyond.*
    `
  }
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug || !blogPosts[slug]) {
    return <NotFound />;
  }

  const post = blogPosts[slug];

  // Enhanced markdown parser
  const parseInlineFormatting = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  // Convert markdown-style content to JSX
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={currentIndex} className="text-2xl font-bold mt-8 mb-4 text-foreground">
            {parseInlineFormatting(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={currentIndex} className="text-xl font-semibold mt-6 mb-3 text-foreground">
            {parseInlineFormatting(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        // Handle action items as checkable lists
        elements.push(
          <div key={currentIndex} className="flex items-start gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{parseInlineFormatting(line.replace('- ', ''))}</span>
          </div>
        );
      } else if (line.startsWith('---')) {
        elements.push(<hr key={currentIndex} className="my-8 border-border" />);
      } else if (line.length > 0) {
        // Check for special formatting patterns
        if (line.startsWith('*') && line.endsWith('*') && !line.includes('**')) {
          // Italic text (like the closing CTA)
          elements.push(
            <p key={currentIndex} className="italic text-muted-foreground mb-4 bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
              {line.replace(/^\*|\*$/g, '')}
            </p>
          );
        } else {
          // Regular paragraphs with inline formatting
          elements.push(
            <p key={currentIndex} className="mb-4 leading-relaxed text-muted-foreground">
              {parseInlineFormatting(line)}
            </p>
          );
        }
      }
      
      currentIndex++;
    }

    return elements;
  };

  return (
    <>
      <Helmet>
        <title>{post.title} | RegIQ Blog</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content="food compliance 2025, BVO ban, PFAS reporting, FDA healthy definition, regulatory checklist" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publishDate} />
        <meta property="article:section" content={post.category} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Blog */}
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-primary hover:gap-3 transition-all duration-200 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <Badge variant="outline" className="font-medium">{post.category}</Badge>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6 text-foreground">
            {post.title}
          </h1>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          <Card className="p-8 border-0 shadow-sm">
            <CardContent className="p-0">
              {renderContent(post.content)}
            </CardContent>
          </Card>
        </article>

        {/* CTA Section */}
        <div className="mt-12">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-3">Stay Ahead of Regulatory Changes</h3>
              <p className="text-muted-foreground mb-6">
                Get real-time regulatory alerts and compliance insights with RegIQ's platform
              </p>
              <Button asChild className="mr-4">
                <Link to="/pricing">Start Free Trial</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/blog">Read More Articles</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-border">
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Articles
          </Link>
          
          <Link 
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}