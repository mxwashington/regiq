import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Send, AlertTriangle, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ComplianceResponse {
  advice: string;
  facilityContext: {
    facilityType: string;
    products: string;
    currentCertifications: string;
  };
  timestamp: string;
}

interface ComplianceQuestion {
  id: string;
  question: string;
  response: ComplianceResponse;
  timestamp: Date;
}

export const ComplianceAssistant: React.FC = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [products, setProducts] = useState('');
  const [currentCertifications, setCertifications] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ComplianceQuestion[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error('Please enter a compliance question');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use the Compliance Assistant');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('compliance-assistant', {
        body: {
          question: question.trim(),
          facilityType,
          products,
          currentCertifications
        }
      });

      if (error) throw error;

      const newConversation: ComplianceQuestion = {
        id: Date.now().toString(),
        question: question.trim(),
        response: data,
        timestamp: new Date()
      };

      setConversations(prev => [newConversation, ...prev]);
      setQuestion('');
      toast.success('Compliance advice generated successfully');

    } catch (error: any) {
      console.error('Compliance assistant error:', error);
      toast.error(error.message || 'Failed to get compliance advice');
    } finally {
      setIsLoading(false);
    }
  };

  const parseAdviceSection = (advice: string, section: string) => {
    const regex = new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = advice.match(regex);
    return match ? match[1].trim() : '';
  };

  const facilityTypes = [
    'Dairy Manufacturing',
    'Meat & Poultry Processing',
    'Seafood Processing', 
    'Bakery & Grain Processing',
    'Beverage Production',
    'Packaged Foods Manufacturing',
    'Fresh Produce Processing',
    'Dietary Supplements',
    'Pet Food Manufacturing',
    'Food Service/Restaurant',
    'Food Distribution/Warehouse'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">AI Compliance Assistant</CardTitle>
              <CardDescription className="text-base">
                Get instant, expert-level regulatory guidance tailored to your facility
              </CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">ENTERPRISE FEATURE</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Ask Your Compliance Question
            </CardTitle>
            <CardDescription>
              Our AI analyzes FDA, USDA, FSIS, and EPA regulations to provide facility-specific guidance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Facility Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Facility Type</label>
                  <Select value={facilityType} onValueChange={setFacilityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility type" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Products</label>
                  <Input
                    placeholder="e.g., fresh pasta, frozen dinners"
                    value={products}
                    onChange={(e) => setProducts(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Current Certifications</label>
                <Input
                  placeholder="e.g., SQF, BRC, HACCP, Organic"
                  value={currentCertifications}
                  onChange={(e) => setCertifications(e.target.value)}
                />
              </div>

              {/* Question */}
              <div>
                <label className="text-sm font-medium mb-2 block">Compliance Question</label>
                <Textarea
                  placeholder="e.g., What are the FSMA requirements for our allergen control program? Do we need separate production lines for gluten-free products?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Regulations...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Get Compliance Advice
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Example Questions
            </CardTitle>
            <CardDescription>
              Click any example to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                category: "FSMA Compliance",
                question: "What are the Preventive Controls requirements for our ready-to-eat salad facility?",
                icon: CheckCircle
              },
              {
                category: "Allergen Management", 
                question: "Do we need separate production lines for gluten-free products under FDA regulations?",
                icon: AlertTriangle
              },
              {
                category: "HACCP Requirements",
                question: "What Critical Control Points should we monitor for our seafood processing operation?",
                icon: CheckCircle
              },
              {
                category: "Labeling Compliance",
                question: "What are the new FDA nutrition labeling requirements for our packaged foods?",
                icon: BookOpen
              },
              {
                category: "Import/Export",
                question: "What FDA certifications do we need to export our dairy products to the EU?",
                icon: CheckCircle
              }
            ].map((example, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left h-auto p-3 justify-start"
                onClick={() => setQuestion(example.question)}
              >
                <example.icon className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{example.category}</div>
                  <div className="text-xs text-muted-foreground mt-1">{example.question}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Conversations */}
      {conversations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Recent Compliance Advice</h3>
          {conversations.map((conv) => (
            <Card key={conv.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium text-primary mb-2">
                      Q: {conv.question}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{conv.timestamp.toLocaleString()}</span>
                      {conv.response.facilityContext.facilityType && (
                        <Badge variant="outline" className="text-xs">
                          {conv.response.facilityContext.facilityType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="prose prose-sm max-w-none">
                  {/* Parse and display structured response */}
                  {parseAdviceSection(conv.response.advice, 'Direct Answer') && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-green-700 mb-2">Direct Answer</h4>
                      <p className="text-sm bg-green-50 p-3 rounded border-l-4 border-green-200">
                        {parseAdviceSection(conv.response.advice, 'Direct Answer')}
                      </p>
                    </div>
                  )}

                  {parseAdviceSection(conv.response.advice, 'Regulatory Citations') && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-blue-700 mb-2">Regulatory Citations</h4>
                      <div className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-200 whitespace-pre-line">
                        {parseAdviceSection(conv.response.advice, 'Regulatory Citations')}
                      </div>
                    </div>
                  )}

                  {parseAdviceSection(conv.response.advice, 'Recommended Actions') && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-orange-700 mb-2">Recommended Actions</h4>
                      <div className="text-sm bg-orange-50 p-3 rounded border-l-4 border-orange-200 whitespace-pre-line">
                        {parseAdviceSection(conv.response.advice, 'Recommended Actions')}
                      </div>
                    </div>
                  )}

                  {/* Fallback for full response if sections not found */}
                  {!parseAdviceSection(conv.response.advice, 'Direct Answer') && (
                    <div className="text-sm whitespace-pre-line">
                      {conv.response.advice}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};