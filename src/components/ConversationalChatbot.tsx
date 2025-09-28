import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, MessageCircle, Send, X, Bot, User, Building, Zap, Brain, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url: string }>;
}

interface ConversationalChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ConversationalChatbot({ isOpen, onToggle }: ConversationalChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm RegIQ's AI assistant powered by GPT-4.1 with real-time web search and database integration. I can help you find FDA regulations, USDA guidelines, EPA rules, and other regulatory information using our comprehensive data sources. \n\nFor personalized compliance assistance, please tell me about your facility using the facility setup below. What food safety or regulatory question can I help you with?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFacilitySetup, setShowFacilitySetup] = useState(false);
  const [facilityType, setFacilityType] = useState('');
  const [products, setProducts] = useState('');
  const [currentCertifications, setCurrentCertifications] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const quickPrompts = [
    'Analyze recent FDA recalls for patterns',
    'What are the emerging food safety trends?',
    'Help me understand HACCP compliance',
    'Summarize today\'s regulatory updates',
    'Predict risk factors for my facility'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      logger.debug('ConversationalChatbot: Starting search with query', { query: userMessage.content }, 'ConversationalChatbot');
      
      // Include facility context in the search if available
      const searchBody = {
        query: userMessage.content,
        agencies: ['FDA', 'USDA', 'EPA', 'CDC'],
        searchType: 'general',
        industry: 'Food Safety',
        timeRange: 'month',
        // Add facility context for enhanced responses
        facilityContext: {
          facilityType: facilityType || undefined,
          products: products || undefined,
          currentCertifications: currentCertifications || undefined
        }
      };

      // Call Perplexity search function for better regulatory intelligence
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: searchBody
      });

      logger.debug('ConversationalChatbot: API response', { data, error }, 'ConversationalChatbot');

      if (error) {
        logger.error('ConversationalChatbot: Supabase function error', error, 'ConversationalChatbot');
        throw error;
      }

      // Check if we hit rate limit and provide fallback
      if (data?.error && data?.limit_reached) {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `I've reached the daily search limit for enhanced AI responses (${data.current_usage}/${data.daily_limit} searches used today). However, I can still help you with general regulatory questions using my existing knowledge base. Please ask your question and I'll do my best to provide helpful information about FDA, USDA, EPA regulations, or food safety topics.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.content || data.response || 'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: new Date(),
        sources: data.sources || data.citations?.map((url: string) => ({
          title: url.includes('fda.gov') ? 'FDA' : url.includes('usda.gov') ? 'USDA' : url.includes('epa.gov') ? 'EPA' : 'Government Source',
          url
        })) || []
      };

      setMessages(prev => [...prev, botMessage]);

      // Log the conversation if user is authenticated
      if (user) {
        const validSearchType = userMessage.content.toLowerCase().includes('recall') ? 'recalls' : 
                               userMessage.content.toLowerCase().includes('deadline') ? 'deadlines' :
                               userMessage.content.toLowerCase().includes('guidance') ? 'guidance' : 'general';
        
        await supabase.from('perplexity_searches').insert({
          user_id: user.id,
          query: userMessage.content,
          search_type: validSearchType,
          agencies: ['FDA', 'USDA', 'EPA', 'CDC'],
          industry: 'food',
          tokens_used: data.content?.length || 0,
          success: true,
          metadata: {
            facility_type: facilityType,
            products: products,
            certifications: currentCertifications
          }
        });
      }

    } catch (error) {
      logger.error('Chat error', error, 'ConversationalChatbot');
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed right-6 h-14 w-14 rounded-full shadow-lg z-50 chat-bubble"
        size="icon"
        aria-label="AI Assistant"
        title="AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/lovable-uploads/869131e3-58af-4f2a-8695-33e9e20d5b45.png" />
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">RegIQ Assistant</h3>
            <p className="text-xs text-muted-foreground">GPT-4.1 + Web Search + Database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Facility Context Setup Toggle */}
      {!showFacilitySetup && (
        <div className="p-3 border-b bg-blue-50/50">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setShowFacilitySetup(true)}
            className="w-full text-xs"
          >
            <Building className="h-3 w-3 mr-2" />
            Setup Facility Context for Personalized Guidance
          </Button>
        </div>
      )}

      {/* Facility Context Setup */}
      {showFacilitySetup && (
        <div className="p-4 border-b bg-blue-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              Facility Context
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setShowFacilitySetup(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label htmlFor="facility-type" className="text-xs">Facility Type</Label>
              <Select value={facilityType} onValueChange={setFacilityType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select facility type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food-processing">Food Processing</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="products" className="text-xs">Main Products</Label>
              <Input
                id="products"
                placeholder="e.g., dairy products, meat, beverages"
                value={products}
                onChange={(e) => setProducts(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="certifications" className="text-xs">Current Certifications</Label>
              <Input
                id="certifications"
                placeholder="e.g., HACCP, SQF, BRC, organic"
                value={currentCertifications}
                onChange={(e) => setCurrentCertifications(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback>
                  {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
               <div className={`max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Sources:</p>
                    {message.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing regulatory context...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">Quick prompts:</p>
        <div className="flex flex-wrap gap-1">
          {quickPrompts.slice(0, 3).map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickPrompt(prompt)}
              className="text-xs h-6 px-2"
            >
              {prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={facilityType ? `Ask about regulations for your ${facilityType} facility...` : "Ask about FDA, USDA, EPA regulations..."}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}