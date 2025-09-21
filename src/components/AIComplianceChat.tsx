import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Send, User, Bot, AlertCircle, Clock } from 'lucide-react';
import { useAIComplianceAssistant } from '@/hooks/useAIComplianceAssistant';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  facilityContext?: {
    facilityType?: string;
    products?: string;
    currentCertifications?: string;
  };
}

interface AIComplianceChatProps {
  initialQuestion?: string;
  alertContext?: {
    id: string;
    title: string;
  };
}

export const AIComplianceChat: React.FC<AIComplianceChatProps> = ({ 
  initialQuestion, 
  alertContext 
}) => {
  const { loading, queryCount, askQuestion } = useAIComplianceAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState(initialQuestion || '');
  const [facilityType, setFacilityType] = useState('');
  const [products, setProducts] = useState('');
  const [currentCertifications, setCertifications] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date(),
      facilityContext: {
        facilityType: facilityType || undefined,
        products: products || undefined,
        currentCertifications: currentCertifications || undefined,
      }
    };

    const currentQuestion = question.trim();
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');

    // Get AI response
    const response = await askQuestion({
      question: alertContext 
        ? `Regarding this alert: "${alertContext.title}"\n\nQuestion: ${currentQuestion}`
        : currentQuestion,
      facilityType: facilityType || undefined,
      products: products || undefined,
      currentCertifications: currentCertifications || undefined,
    });

    if (response?.answer) {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  };

  const facilityTypes = [
    'Food Manufacturing',
    'Beverage Production',
    'Dairy Processing',
    'Meat/Poultry Processing',
    'Seafood Processing',
    'Bakery',
    'Restaurant/Foodservice',
    'Retail Food',
    'Food Warehouse/Distribution',
    'Other'
  ];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Compliance Assistant
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">
              {queryCount}/50 daily queries
            </Badge>
          </div>
        </div>
        
        {alertContext && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-sm">
            <strong>Alert Context:</strong> {alertContext.title}
          </div>
        )}
      </CardHeader>

      {/* Facility Context Setup */}
      {messages.length === 0 && (
        <CardContent className="flex-shrink-0 space-y-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="facilityType" className="text-xs">Facility Type</Label>
              <Select value={facilityType} onValueChange={setFacilityType}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {facilityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="products" className="text-xs">Products/Services</Label>
              <Input
                id="products"
                value={products}
                onChange={(e) => setProducts(e.target.value)}
                placeholder="e.g., packaged foods, beverages"
                className="h-8 text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="certifications" className="text-xs">Current Certifications</Label>
              <Input
                id="certifications"
                value={currentCertifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="e.g., HACCP, SQF, BRC"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      )}

      {/* Chat Messages */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Brain className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Ask a Compliance Question</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Get expert advice on FDA, USDA, and EPA regulations
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground max-w-md">
                <div>• "What are the FSMA preventive controls requirements?"</div>
                <div>• "How often should I update my HACCP plan?"</div>
                <div>• "What labeling requirements apply to organic products?"</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] space-y-2 ${message.type === 'user' ? 'order-2' : ''}`}>
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 order-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      Analyzing your question...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input Form */}
      <CardContent className="flex-shrink-0 border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              alertContext 
                ? "Ask a question about this alert..."
                : "Ask a compliance question..."
            }
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={loading || queryCount >= 50}
          />
          <Button 
            type="submit" 
            disabled={!question.trim() || loading || queryCount >= 50}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {queryCount >= 45 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {queryCount >= 50 
              ? "Daily query limit reached. Try again tomorrow."
              : `${50 - queryCount} queries remaining today.`
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};