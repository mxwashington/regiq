import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  publishDate: string;
  readTime: string;
  category: string;
  slug: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Essential 2025 Food Compliance Checklist: What Every Food Manufacturer Needs to Prepare For Right Now',
    excerpt: 'The regulatory landscape for food manufacturers has never been more complex—or more urgent. With major compliance deadlines approaching in the next six months and significant policy shifts already underway, food companies must act quickly to avoid costly violations.',
    publishDate: '2025-01-22',  
    readTime: '4 min read',
    category: 'Compliance',
    slug: '2025-food-compliance-checklist'
  },
  {
    id: '2',
    title: 'PFAS in Food Packaging: Complete 2025 Compliance Guide for Food Manufacturers',
    excerpt: 'Per- and polyfluoroalkyl substances (PFAS) in food packaging represent one of the most significant compliance challenges facing food manufacturers in 2025. With the FDA revoking 35 PFAS food contact substance notifications and multiple states implementing outright bans, companies must act decisively.',
    publishDate: '2025-01-20',
    readTime: '5 min read',
    category: 'Regulatory',
    slug: 'pfas-food-packaging-compliance-2025'
  },
  {
    id: '3',
    title: 'FSMA Rule 204 Food Traceability: 2026 Compliance Roadmap for Enhanced Supply Chain Visibility',
    excerpt: 'The FDA\'s Food Safety Modernization Act (FSMA) Rule 204 represents the most significant advancement in food traceability requirements in decades. With the compliance deadline extended to July 20, 2028, food manufacturers have a critical 36-month window to implement enhanced traceability systems.',
    publishDate: '2025-01-18',
    readTime: '5 min read',
    category: 'Food Safety',
    slug: 'fsma-rule-204-traceability-2026'
  },
  {
    id: '4',
    title: 'Ultra-Processed Foods Definition: Federal Impact on Product Strategy and Market Positioning',
    excerpt: 'The development of a federal ultra-processed foods (UPF) definition by FDA and USDA represents a potential paradigm shift for the food industry. Expected by fall 2025, this definition could trigger new labeling requirements, marketing restrictions, and consumer perception challenges.',
    publishDate: '2025-01-16',
    readTime: '4 min read',
    category: 'Market Strategy',
    slug: 'ultra-processed-foods-federal-definition-2025'
  },
  {
    id: '5',
    title: 'AI and Blockchain in Food Traceability: 2025 Technology Revolution Transforming Supply Chain Management',
    excerpt: 'The convergence of artificial intelligence and blockchain technology is revolutionizing food traceability, creating unprecedented opportunities for supply chain transparency, food safety enhancement, and operational efficiency.',
    publishDate: '2025-01-14',
    readTime: '5 min read',
    category: 'Technology',
    slug: 'ai-blockchain-food-traceability-2025'
  },
  {
    id: '6',
    title: 'Global Food Safety Standards Convergence: International Compliance Strategy for Multi-Market Operations',
    excerpt: 'The global food safety landscape is experiencing unprecedented convergence as international standards harmonize and digital requirements emerge. With the EU\'s Farm to Fork Strategy advancing, GFSI updating benchmarking criteria, and Asia-Pacific markets aligning regulatory frameworks.',
    publishDate: '2025-01-12',
    readTime: '4 min read',
    category: 'International',
    slug: 'global-food-safety-standards-convergence-2025'
  },
  {
    id: '7',
    title: 'Climate Risk and Food Safety: New Integration Requirements for Resilient Operations',
    excerpt: 'Climate change is fundamentally altering food safety risk profiles, requiring food manufacturers to integrate climate considerations into every aspect of their operations. With ISO 22000 now mandating climate risk assessments.',
    publishDate: '2025-01-10',
    readTime: '5 min read',
    category: 'Risk Management',
    slug: 'climate-risk-food-safety-integration-2025'
  },
  {
    id: '8',
    title: 'FDA Standards of Identity Modernization: 52 Revoked Regulations Create Innovation Opportunities',
    excerpt: 'The FDA\'s July 2025 revocation of 52 Standards of Identity regulations represents the most significant deregulation of food manufacturing in decades. This modernization effort eliminates outdated compositional requirements.',
    publishDate: '2025-01-08',
    readTime: '4 min read',
    category: 'Innovation',
    slug: 'fda-standards-identity-modernization-2025'
  },
  {
    id: '9',
    title: 'Allergen Management Revolution: Beyond Cross-Contact Prevention to Predictive Safety Systems',
    excerpt: 'Allergen management is undergoing a technological revolution that extends far beyond traditional cross-contact prevention. With sesame established as the ninth major allergen and advanced detection technologies becoming accessible.',
    publishDate: '2025-01-06',
    readTime: '4 min read',
    category: 'Food Safety',
    slug: 'allergen-management-revolution-2025'
  },
  {
    id: '10',
    title: 'Global Food Export Compliance: 2025\'s Changing International Requirements and Market Access Strategies',
    excerpt: 'Global food export compliance is experiencing unprecedented transformation as major markets implement digital verification systems, enhanced traceability requirements, and sustainability mandates.',
    publishDate: '2025-01-04',
    readTime: '5 min read',
    category: 'International Trade',
    slug: 'global-food-export-compliance-2025'
  }
];

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>RegIQ Blog - Regulatory Intelligence & Food Safety Insights</title>
        <meta name="description" content="Stay informed with the latest regulatory intelligence, food safety insights, and compliance guidance for food, pharma, and agricultural industries." />
        <meta name="keywords" content="food safety blog, regulatory compliance, FDA updates, USDA regulations, pharma compliance, agricultural alerts" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            RegIQ Regulatory Intelligence Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay ahead of regulatory changes with expert insights, compliance checklists, and industry analysis
          </p>
        </div>

        {/* Featured Post */}
        {blogPosts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px bg-gradient-to-r from-primary to-transparent flex-1" />
              <Badge variant="secondary" className="text-sm font-medium">Featured Article</Badge>
              <div className="h-px bg-gradient-to-l from-primary to-transparent flex-1" />
            </div>
            
            <Card className="border-2 border-primary/20 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <Badge variant="outline" className="font-medium">{blogPosts[0].category}</Badge>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(blogPosts[0].publishDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {blogPosts[0].readTime}
                  </div>
                </div>
                <CardTitle className="text-2xl leading-tight hover:text-primary transition-colors">
                  <Link to={`/blog/${blogPosts[0].slug}`} className="block">
                    {blogPosts[0].title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {blogPosts[0].excerpt}
                </p>
                <Link 
                  to={`/blog/${blogPosts[0].slug}`}
                  className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all duration-200"
                >
                  Read Full Article <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Posts Grid */}
        {blogPosts.length > 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Articles</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.slice(1).map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
                      <Link to={`/blog/${post.slug}`} className="block">
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.publishDate).toLocaleDateString()}
                      </span>
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-sm text-primary font-medium hover:underline"
                      >
                        Read more
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-3">Stay Ahead of Regulatory Changes</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Get real-time regulatory alerts and compliance insights delivered to your inbox. 
                Never miss critical updates that could impact your business.
              </p>
              <Link 
                to="/pricing"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}