import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Zap, Users, Mail, TestTube } from 'lucide-react';
import { useAIAlertProcessor } from '@/hooks/useAIAlertProcessor';
import { useAIComplianceAssistant } from '@/hooks/useAIComplianceAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AIFeatureTester: React.FC = () => {
  const [testAlertId, setTestAlertId] = useState('');
  const [testQuestion, setTestQuestion] = useState('What are the key compliance requirements for food labeling?');
  const [supplierName, setSupplierName] = useState('Test Supplier Corp');
  
  const { processing, processAlert, processBatch } = useAIAlertProcessor();
  const { loading: chatLoading, askQuestion } = useAIComplianceAssistant();

  const handleProcessAlert = async () => {
    if (!testAlertId) {
      toast.error('Please enter an alert ID');
      return;
    }
    await processAlert(testAlertId);
  };

  const handleTestChat = async () => {
    const response = await askQuestion({
      question: testQuestion,
      facilityType: 'food_manufacturing',
      products: 'packaged foods, beverages'
    });
    
    if (response) {
      toast.success('AI response generated successfully!');
      console.log('AI Response:', response);
    }
  };

  const handleTestSupplierWatch = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('supplier-watch-processor', {
        body: { 
          supplierName,
          testMode: true 
        }
      });

      if (error) throw error;

      toast.success(`Supplier watch test completed: ${JSON.stringify(data)}`);
    } catch (error: any) {
      toast.error(`Supplier watch test failed: ${error.message}`);
    }
  };

  const handleTestDigest = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-digest', {
        body: { dryRun: true }
      });

      if (error) throw error;

      toast.success(`Digest test: ${data.recipients} recipients, sample generated`);
      console.log('Sample HTML:', data.sampleHtml);
    } catch (error: any) {
      toast.error(`Digest test failed: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <TestTube className="h-8 w-8 text-primary" />
          AI Features Testing Suite
        </h1>
        <p className="text-muted-foreground">
          Test the core AI functionality including summaries, compliance chat, and supplier monitoring.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Alert Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              AI Alert Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Alert ID to Process</Label>
              <Input
                placeholder="Enter alert UUID"
                value={testAlertId}
                onChange={(e) => setTestAlertId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleProcessAlert}
                disabled={processing}
                className="flex-1"
              >
                {processing ? 'Processing...' : 'Process Single Alert'}
              </Button>
              <Button 
                onClick={processBatch}
                disabled={processing}
                variant="outline"
              >
                Batch Process
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• Tests AI summary generation</p>
              <p>• Tests urgency scoring (1-10)</p>
              <p>• Uses Perplexity API</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Compliance Assistant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              AI Compliance Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Test Question</Label>
              <Input
                placeholder="Ask a compliance question..."
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleTestChat}
              disabled={chatLoading}
              className="w-full"
            >
              {chatLoading ? 'Thinking...' : 'Ask AI Assistant'}
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>• Tests contextual Q&A</p>
              <p>• Tests facility-specific responses</p>
              <p>• Rate limited: 50 queries/day</p>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Watch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Supplier Watch Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Supplier Name</Label>
              <Input
                placeholder="Test supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleTestSupplierWatch}
              className="w-full"
            >
              Test Supplier Processing
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>• Tests supplier risk scoring</p>
              <p>• Tests alert-supplier linking</p>
              <p>• Tests monitoring logic</p>
            </div>
          </CardContent>
        </Card>

        {/* Daily Digest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              Daily Email Digest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestDigest}
              className="w-full"
            >
              Test Digest Generation
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>• Tests email template generation</p>
              <p>• Tests user preference filtering</p>
              <p>• Dry run mode (no emails sent)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Testing Status & Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Phase 1: AI Features</span>
              <Badge variant="secondary">Ready for Testing</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Phase 2: Core Functionality</span>
              <Badge variant="secondary">Implemented</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Database Migrations</span>
              <Badge variant="default">Complete</Badge>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Next Steps:</p>
            <ul className="text-sm space-y-1">
              <li>1. Test each AI feature above</li>
              <li>2. Check browser console for detailed logs</li>
              <li>3. Verify Perplexity API integration</li>
              <li>4. Test export functionality from main dashboard</li>
              <li>5. Review enhanced analytics</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};