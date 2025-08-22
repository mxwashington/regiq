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
    readTime: '4 min read',
    category: 'Compliance',
    slug: '2025-food-compliance-checklist',
    content: 'The regulatory landscape for food manufacturers has never been more complex—or more urgent. With major compliance deadlines approaching in the next six months and significant policy shifts already underway, food companies must act quickly to avoid costly violations and market disruptions. This comprehensive checklist covers the most critical regulatory changes affecting food manufacturers in 2025, complete with specific deadlines and actionable steps.\n\n## Immediate Action Required (Next 6 Months)\n\n### 🚨 BVO Ban - Deadline: August 2, 2025\n**What:** Brominated Vegetable Oil (BVO) is now prohibited in all food and beverage products.\n**Who\'s Affected:** Beverage manufacturers, especially citrus-flavored drinks\n\n**Action Items:**\n- Audit all current formulations for BVO content\n- Work with flavor suppliers to secure BVO-free alternatives\n- Update product formulations and conduct stability testing\n- Revise ingredient declarations and nutritional panels\n- Plan production transitions to meet the August 2025 deadline\n\n### 🚨 PFAS Reporting Deadline - Deadline: January 11, 2026\n**What:** EPA requires detailed reporting on PFAS use in products from 2011-2022.\n**Who\'s Affected:** All manufacturers using PFAS in packaging, processing, or ingredients\n\n**Action Items:**\n- Conduct comprehensive PFAS audit of all products and packaging\n- Gather historical records from 2011-2022\n- Prepare separate reports for each PFAS type used\n- Coordinate with packaging suppliers for PFAS disclosure\n- Consider PFAS-free alternatives for future products\n\n## Major Regulatory Changes - 2025 Implementation\n\n### 📋 FDA "Healthy" Definition Overhaul\n**Effective:** February 25, 2025 | **Compliance Deadline:** February 28, 2028\n**What:** Complete revision of "healthy" claim requirements focusing on food groups and nutrient limits\n\n**Action Items:**\n- Review products currently using "healthy" claims\n- Assess products against new whole grain, added sugar, and sodium requirements\n- Develop reformulation strategy for non-compliant products\n- Train marketing teams on new claim requirements\n- Monitor FDA\'s development of approved "healthy" symbols\n\n### 📊 Enhanced Traceability Requirements\n**What:** Stricter end-to-end supply chain visibility requirements\n\n**Action Items:**\n- Implement digital traceability systems (blockchain, IoT sensors, RFID)\n- Establish supplier verification protocols\n- Create detailed batch tracking procedures\n- Develop rapid recall capabilities\n- Train staff on new documentation requirements\n\n### 🔬 GRAS Pathway Changes\n**What:** FDA scrutinizing self-affirmed GRAS process, requiring more comprehensive safety data\n\n**Action Items:**\n- Review all self-affirmed GRAS ingredients currently in use\n- Prepare comprehensive safety documentation for key ingredients\n- Budget for extended approval timelines (6-9 months longer)\n- Consider pre-submission consultations with FDA\n- Develop backup ingredient strategies for critical formulations\n\n## State-Level Compliance Challenges\n\n### 🗺️ Multi-State Ingredient Bans\n**Affected States:** California, Missouri, Oklahoma, Texas with varying effective dates\n\n**Banned Ingredients Include:**\n- Red Dye 3, Yellow 5, Yellow 6, Blue 1, Blue 2\n- Potassium bromate, propylparaben\n- Titanium dioxide, BHA, azodicarbonamide\n\n**Action Items:**\n- Map current products against state-specific banned ingredient lists\n- Develop state-specific formulations or nationwide reformulations\n- Update supply chain management for multi-state compliance\n- Review school meal programs for Texas-specific requirements\n\n## Strategic Preparation Recommendations\n\n### 🎯 Immediate (Next 30 Days)\n1. **Conduct comprehensive regulatory gap analysis** across all product lines\n2. **Establish cross-functional compliance team** including R&D, quality, legal, and operations\n3. **Prioritize BVO and PFAS compliance** as highest urgency items\n4. **Begin supplier communication** regarding new requirements\n\n### 📈 Short-term (3-6 Months)\n1. **Implement digital traceability systems** and staff training\n2. **Complete product reformulations** for banned ingredients\n3. **Develop state-specific compliance strategies**\n4. **Enhance allergen management protocols**\n\n### 🚀 Long-term (6-12 Months)\n1. **Integrate sustainability metrics** with food safety programs\n2. **Build climate resilience** into supply chain planning\n3. **Prepare for front-of-pack labeling** implementation\n4. **Establish proactive regulatory monitoring** systems\n\nThe regulatory environment will continue evolving rapidly throughout 2025. Companies that proactively address these requirements now will gain competitive advantages while avoiding costly compliance failures. The key is treating regulatory compliance not as a burden, but as a strategic capability that builds consumer trust and operational resilience.\n\n**Don\'t wait—start your compliance assessment today.** The companies that act now will be positioned for success, while those that delay risk significant market disruption and financial penalties.\n\n---\n\n*Need help navigating these complex requirements? RegIQ\'s regulatory intelligence platform provides real-time compliance monitoring and alerts to keep your food manufacturing operations ahead of regulatory changes. Contact us to learn how we can streamline your compliance strategy for 2025 and beyond.*'
  },

  'pfas-food-packaging-compliance-2025': {
    id: '2',
    title: 'PFAS in Food Packaging: Complete 2025 Compliance Guide for Food Manufacturers',
    metaDescription: 'Comprehensive guide to PFAS compliance in food packaging covering FDA revocations, state regulations, EPA reporting requirements, and transition strategies for 2025-2026.',
    publishDate: '2025-01-20',
    readTime: '5 min read',
    category: 'Regulatory',
    slug: 'pfas-food-packaging-compliance-2025',
    content: 'Per- and polyfluoroalkyl substances (PFAS) in food packaging represent one of the most significant compliance challenges facing food manufacturers in 2025. With the FDA revoking 35 PFAS food contact substance notifications and multiple states implementing outright bans, companies must act decisively to avoid major supply chain disruptions and regulatory violations.\n\n## Executive Summary: Critical PFAS Deadlines\n\n**January 11, 2026:** EPA PFAS reporting deadline for products manufactured 2011-2022\n**January 1, 2026:** California, Washington, and Connecticut PFAS packaging bans effective\n**Ongoing:** FDA case-by-case review of remaining PFAS food contact substances\n\nFood manufacturers face an estimated **$50,000-$200,000 per product line** in transition costs, but early action can minimize disruption and provide competitive advantages.\n\n## FDA PFAS Revocations: What Changed\n\n### The 35 Revoked PFAS Notifications\nOn January 3, 2024, FDA revoked food contact substance notifications for 35 PFAS compounds after manufacturers failed to provide updated safety data. This action affects:\n\n**Affected Product Categories:**\n- Grease-resistant food packaging\n- Non-stick cookware coatings\n- Food processing equipment surfaces\n- Microwave-safe containers\n- Fast-food wrappers and containers\n\n**Immediate Compliance Requirements:**\n- Discontinue use of revoked PFAS substances immediately\n- Audit all packaging suppliers for compliance status\n- Document alternative material selections\n- Update food contact substance notifications\n- Establish supplier verification protocols\n\n### State-by-State PFAS Regulations\n\n**California PFAS Packaging Ban**\n**Effective:** January 1, 2026\n**Scope:** Intentional addition of PFAS to food packaging\n**Threshold:** Detection limits as low as 50 parts per million\n\n**Washington State PFAS Rules**\n**Effective:** January 1, 2026\n**Unique Requirements:** Safer alternatives assessment required\n\n**Connecticut PFAS Legislation**\n**Effective:** January 1, 2026\n**Enforcement:** $500-$5,000 per violation per day\n\n## Implementation Strategy and Timeline\n\n### Phase 1: Assessment and Planning (Q1 2025)\n**Immediate Actions:**\n- Complete comprehensive PFAS inventory\n- Assess regulatory exposure across all jurisdictions\n- Initiate supplier engagement discussions\n- Establish internal compliance team\n\n### Phase 2: Alternative Development (Q2-Q3 2025)\n**Material Qualification:**\n- Performance testing of PFAS-free alternatives\n- Shelf-life and compatibility studies\n- Consumer acceptance research\n- Cost-benefit analysis\n\n### Phase 3: Implementation (Q4 2025-Q1 2026)\n**Production Transition:**\n- Pilot production runs with new materials\n- Quality control protocol validation\n- Consumer communication development\n- Inventory management for material changeover\n\nThe PFAS compliance landscape represents both significant challenges and strategic opportunities. Companies that proactively address these requirements will not only avoid regulatory violations but position themselves as industry leaders in sustainable packaging innovation.\n\n**The window for proactive compliance is closing rapidly.** With state bans taking effect January 1, 2026, and EPA reporting due January 11, 2026, immediate action is essential for successful transition.\n\n---\n\n*RegIQ\'s regulatory intelligence platform provides real-time PFAS compliance monitoring across all jurisdictions, automated supplier verification, and predictive analytics for emerging regulations. Contact us to discover how our platform can streamline your PFAS compliance strategy and protect your market position.*'
  },

  'fsma-rule-204-traceability-2026': {
    id: '3',
    title: 'FSMA Rule 204 Food Traceability: 2026 Compliance Roadmap for Enhanced Supply Chain Visibility',
    metaDescription: 'Complete guide to FSMA Rule 204 traceability requirements with July 2028 deadline, CTEs implementation, TLCs systems, and technology solutions for food manufacturers.',
    publishDate: '2025-01-18',
    readTime: '5 min read',
    category: 'Food Safety',
    slug: 'fsma-rule-204-traceability-2026',
    content: 'The FDA\'s Food Safety Modernization Act (FSMA) Rule 204 represents the most significant advancement in food traceability requirements in decades. With the compliance deadline extended to July 20, 2028, food manufacturers have a critical 36-month window to implement enhanced traceability systems that will fundamentally transform supply chain management and food safety response capabilities.\n\n## Executive Summary: FSMA 204 Impact\n\n**Compliance Deadline:** July 20, 2028 (extended from January 2026)\n**Affected Companies:** All entities handling foods on the FDA Traceability List\n**Investment Required:** $500,000-$2.5 million for mid-sized manufacturers\n**Technology Mandate:** Digital record-keeping becomes essential for compliance\n\nCompanies must implement comprehensive traceability systems covering **Critical Tracking Events (CTEs)** and **Traceability Lot Codes (TLCs)** for 16 high-risk food categories.\n\n## Understanding FSMA Rule 204 Requirements\n\n### Food Traceability List Coverage\nFDA\'s Traceability List includes 16 food categories identified as high-risk for contamination and foodborne illness outbreaks:\n\n**Fresh Produce:**\n- Leafy greens (lettuce, spinach, arugula, baby greens)\n- Herbs (basil, cilantro, parsley)\n- Tomatoes (all varieties)\n- Cucumbers and cantaloupe\n- Bell peppers and hot peppers\n\n**Other High-Risk Foods:**\n- Fresh-cut fruits and vegetables\n- Sprouts and microgreens\n- Shell eggs\n- Nut butters\n- Soft ripened cheeses\n- Crustaceans (shrimp, lobster, crab)\n- Bivalve mollusks (oysters, clams, mussels)\n\n### Critical Tracking Events (CTEs) Framework\n\n**Primary CTEs for All Covered Foods:**\n1. **Growing:** Initial production or cultivation\n2. **Receiving:** Acceptance of food from another entity\n3. **Transforming:** Manufacturing or processing activities\n4. **Creating:** Packaging, labeling, or preparing for distribution\n5. **Shipping:** Transfer to another supply chain participant\n\n**Required Documentation:**\n- Precise timing and location of each CTE\n- Lot identification and traceability codes\n- Quantity and unit of measure\n- Contact information for supplying entity\n- Reference record location and format\n\n### Traceability Lot Codes (TLCs) Implementation\n\n**TLC Requirements:**\n- Unique identifier for each traceable lot\n- Consistent throughout the supply chain\n- Machine-readable format preferred\n- Linkage to all relevant CTEs\n\n**Technology Integration:**\n- QR codes and 2D barcodes recommended\n- RFID and NFC technologies acceptable\n- Blockchain integration for enhanced security\n- IoT sensors for real-time monitoring\n\n## 36-Month Implementation Timeline\n\n### Year 1 (2025): Foundation and Assessment\n**Q1 2025: Regulatory Gap Analysis**\n- Identify all products subject to Rule 204\n- Assess current traceability capabilities\n- Map existing supply chain relationships\n- Evaluate technology infrastructure needs\n\n**Q2 2025: System Design and Planning**\n- Select traceability technology platforms\n- Design TLC coding schemes\n- Develop CTE documentation procedures\n- Establish supplier communication protocols\n\n### Year 2 (2026): System Development and Testing\n**Q1 2026: Technology Implementation**\n- Deploy enterprise traceability systems\n- Integrate with existing ERP and quality systems\n- Implement employee training programs\n- Establish data backup and security protocols\n\n**Q3 2026: Operational Validation**\n- Conduct comprehensive system testing\n- Perform mock recall exercises\n- Validate 24-hour record retrieval capability\n- Refine processes based on testing results\n\n### Year 3 (2027-2028): Optimization and Compliance\n**Q1-Q2 2027: System Optimization**\n- Enhance system performance and reliability\n- Implement advanced analytics capabilities\n- Strengthen cybersecurity measures\n- Optimize operational efficiency\n\n**Q1-Q2 2028: Compliance Achievement**\n- Ensure full operational compliance\n- Complete final regulatory reviews\n- Implement ongoing monitoring protocols\n- Document compliance achievement\n\n## Technology Solutions and Integration\n\n### Digital Traceability Platforms\n**Enterprise Solutions:**\n- Cloud-based traceability systems with real-time visibility\n- API integrations with existing business systems\n- Mobile applications for field data collection\n- Advanced analytics and reporting capabilities\n\n### Blockchain Integration\n**Benefits:**\n- Immutable record-keeping for enhanced security\n- Decentralized data sharing among partners\n- Smart contracts for automated compliance\n- Enhanced trust and transparency\n\n### IoT and Sensor Technology\n**Environmental Monitoring:**\n- Temperature and humidity sensors\n- GPS tracking for shipment visibility\n- RFID tags for automated identification\n- Real-time data transmission capabilities\n\n## Cost-Benefit Analysis\n\n### Implementation Costs\n**Technology Infrastructure:** $300,000-$1,500,000\n- Enterprise traceability software licensing\n- Hardware and sensor deployments\n- System integration and customization\n- Cybersecurity and data protection measures\n\n**Operational Transformation:** $200,000-$1,000,000\n- Employee training and certification\n- Process redesign and optimization\n- Supplier onboarding and support\n- Ongoing system maintenance and support\n\n### Return on Investment\n**Quantifiable Benefits:**\n- 50-75% reduction in recall response time\n- 30-50% decrease in recall-related costs\n- 20-40% improvement in supply chain efficiency\n- Enhanced regulatory compliance and reduced penalties\n\nFSMA Rule 204 represents a fundamental shift toward enhanced food safety through comprehensive traceability. Companies that embrace this transformation early will not only achieve compliance but establish competitive advantages in transparency, efficiency, and consumer trust.\n\n**The extended deadline provides valuable time for thoughtful implementation.** Use this 36-month window to build robust, scalable systems that exceed minimum requirements and position your organization for future regulatory evolution.\n\n---\n\n*RegIQ\'s traceability compliance platform provides automated Rule 204 monitoring, supplier integration management, and real-time compliance validation. Discover how our technology can streamline your FSMA implementation while building competitive advantages through enhanced supply chain visibility.*'
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