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
    readTime: '12 min read',
    category: 'Compliance',
    slug: '2025-food-compliance-checklist'
  },
  {
    id: '2',
    title: 'PFAS in Food Packaging: Complete 2025 Compliance Guide for Food Manufacturers',
    excerpt: 'Per- and polyfluoroalkyl substances (PFAS) in food packaging represent one of the most significant compliance challenges facing food manufacturers in 2025. With the FDA revoking 35 PFAS food contact substance notifications and multiple states implementing outright bans, companies must act decisively.',
    publishDate: '2025-01-20',
    readTime: '14 min read',
    category: 'Regulatory',
    slug: 'pfas-food-packaging-compliance-2025'
  },
  {
    id: '3',
    title: 'FSMA Rule 204 Food Traceability: 2026 Compliance Roadmap for Enhanced Supply Chain Visibility',
    excerpt: 'The FDA\'s Food Safety Modernization Act (FSMA) Rule 204 represents the most significant advancement in food traceability requirements in decades. With the compliance deadline extended to July 20, 2028, food manufacturers have a critical 36-month window to implement enhanced traceability systems.',
    publishDate: '2025-01-18',
    readTime: '15 min read',
    category: 'Food Safety',
    slug: 'fsma-rule-204-traceability-2026'
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