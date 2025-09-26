import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Shield, Database, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  version: string;
  last_updated: string;
  is_active: boolean;
}

export function LegalFramework() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLegalDocuments();
  }, []);

  const fetchLegalDocuments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('document_type');

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      logger.error('Error fetching legal documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'terms':
        return <FileText className="h-5 w-5" />;
      case 'privacy':
        return <Shield className="h-5 w-5" />;
      case 'dpa':
        return <Database className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getDocumentTitle = (type: string) => {
    switch (type) {
      case 'terms':
        return 'Terms of Service';
      case 'privacy':
        return 'Privacy Policy';
      case 'dpa':
        return 'Data Processing Addendum';
      default:
        return type;
    }
  };

  const formatMarkdown = (content: string) => {
    return content
      .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-6 text-foreground">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mb-4 mt-6 text-foreground">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mb-3 mt-4 text-foreground">$1</h3>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<p class="mb-4"></p>')
      .replace(/\n/g, '<br />');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Legal Framework</h1>
        <p className="text-muted-foreground">
          Our commitment to transparency and compliance with data protection regulations.
        </p>
      </div>

      <Tabs defaultValue={documents[0]?.document_type || 'terms'} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {documents.map((doc) => (
            <TabsTrigger key={doc.document_type} value={doc.document_type} className="flex items-center gap-2">
              {getDocumentIcon(doc.document_type)}
              {getDocumentTitle(doc.document_type)}
            </TabsTrigger>
          ))}
        </TabsList>

        {documents.map((doc) => (
          <TabsContent key={doc.document_type} value={doc.document_type}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getDocumentIcon(doc.document_type)}
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Last updated: {new Date(doc.last_updated).toLocaleDateString()}
                      </div>
                      <Badge variant="secondary">Version {doc.version}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] w-full">
                  <div className="prose prose-sm max-w-none text-foreground">
                    {/* Safe text rendering - use react-markdown for safe markdown parsing */}
                    <pre className="whitespace-pre-wrap">{doc.content}</pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
        <p className="text-sm text-muted-foreground mb-2">
          If you have any questions about these legal documents or need to exercise your rights, please contact us:
        </p>
        <div className="space-y-1 text-sm">
          <p><strong>Email:</strong> legal@regiq.com</p>
          <p><strong>Privacy:</strong> privacy@regiq.com</p>
          <p><strong>Data Protection Officer:</strong> dpo@regiq.com</p>
        </div>
      </div>
    </div>
  );
}