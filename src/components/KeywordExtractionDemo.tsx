import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Search, Globe, ExternalLink, Shield, Sparkles } from 'lucide-react';

export const KeywordExtractionDemo = () => {
  return (
    <Card className="mobile-container-safe mobile-card-content border-dashed border-purple-200 bg-purple-50/30">
      <CardHeader className="p-4">
        <CardTitle className="text-lg flex items-center gap-2 mobile-text-content break-words-mobile">
          <Bot className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <span className="break-words-mobile">How Perplexity AI Enhances Your Alerts</span>
        </CardTitle>
        <CardDescription className="mobile-text-content break-words-mobile">
          Intelligent source verification and regulatory context for every alert
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {/* Step 1 */}
          <div className="bg-white p-4 rounded-lg border border-purple-200 mobile-container-safe">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Search className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-purple-900 mb-2 mobile-text-content break-words-mobile">1. Smart Analysis</h4>
                <p className="text-sm text-purple-800 mb-3 mobile-text-content break-words-mobile">
                  When you click "AI Sources" on any alert, Perplexity AI analyzes the regulatory content to understand what's really important.
                </p>
                <div className="bg-purple-50 p-3 rounded border border-purple-200 mobile-container-safe">
                  <p className="text-xs text-purple-700 mobile-text-content break-words-mobile">
                    <strong>Example:</strong> For an FDA recall, it identifies the product, contamination type, affected companies, and compliance implications.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-purple-900 mb-2">2. Live Source Discovery</h4>
                <p className="text-sm text-purple-800 mb-3">
                  Perplexity searches across government websites, official databases, and regulatory portals in real-time to find the most current information.
                </p>
                <div className="flex flex-wrap gap-2 center-mobile">
                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700 break-words-mobile">FDA.gov</Badge>
                  <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700 break-words-mobile">USDA.gov</Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-300 text-emerald-700 break-words-mobile">EPA.gov</Badge>
                  <Badge variant="outline" className="text-xs bg-gray-50 border-gray-300 text-gray-700 break-words-mobile">Official Documents</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-purple-900 mb-2">3. Source Verification</h4>
                <p className="text-sm text-purple-800 mb-3">
                  Every source is verified for authenticity and relevance. Only official government sources and verified regulatory documents are included.
                </p>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    <strong>Verified Sources Only:</strong> Direct links to official government pages and regulatory documents
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-4 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-purple-900 mb-2">4. Enhanced Context</h4>
                <p className="text-sm text-purple-800 mb-3">
                  AI provides detailed analysis including compliance implications, affected industries, and regulatory context - all in plain English.
                </p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Business Value:</strong> Understand exactly how each alert impacts your operations and compliance requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-purple-700 bg-purple-100 p-3 rounded border border-purple-300">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4" />
            <strong>Why This Matters for Food Safety Teams:</strong>
          </div>
          <ul className="space-y-1 ml-6">
            <li>• Get complete context beyond just the alert headline</li>
            <li>• Access official sources you might have missed</li>
            <li>• Understand compliance implications immediately</li>
            <li>• Save hours of manual research per alert</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};