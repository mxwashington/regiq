import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, MessageCircle, Send, Bot, User, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url: string }>;
}

interface ThirdShiftChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ThirdShiftChatbot({ isOpen, onToggle }: ThirdShiftChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm ThirdShift.ai, your regulatory intelligence assistant. I can help you find FDA regulations, USDA guidelines, EPA rules, and other regulatory information using advanced AI search capabilities. What would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('ThirdShift.ai: Starting search with query:', inputValue);
      
      // Call Perplexity search function for better regulatory intelligence
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query: inputValue,
          searchType: 'general',
          agencies: ['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'],
          industry: 'Regulatory Compliance',
          timeRange: 'month'
        }
      });

      console.log('ThirdShift.ai: API response:', { data, error });

      if (error) {
        console.error('ThirdShift.ai: Supabase function error:', error);
        throw error;
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.content || data.response || 'I apologize, but I couldn\'t generate a response at this time. Please try rephrasing your question.',
        timestamp: new Date(),
        sources: data.sources || data.citations?.map((citation: string, index: number) => ({
          title: `Source ${index + 1}`,
          url: citation.startsWith('http') ? citation : `https://${citation}`
        })) || []
      };

      setMessages(prev => [...prev, botMessage]);

      // Log the search for analytics if user is authenticated
      if (user) {
        const validSearchType = inputValue.toLowerCase().includes('recall') ? 'recalls' : 
                               inputValue.toLowerCase().includes('deadline') ? 'deadlines' :
                               inputValue.toLowerCase().includes('guidance') ? 'guidance' : 'general';
        
        await supabase.from('perplexity_searches').insert({
          user_id: user.id,
          query: inputValue,
          search_type: validSearchType,
          agencies: ['FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC'],
          industry: 'regulatory_compliance',
          success: true
        });
      }

    } catch (error) {
      console.error('ThirdShift.ai: Complete error details:', error);
      console.error('ThirdShift.ai: Error type:', typeof error);
      console.error('ThirdShift.ai: Error keys:', error ? Object.keys(error) : 'no keys');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get response from ThirdShift.ai",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={onToggle}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="lg"
          aria-label="AI Assistant"
          title="AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] flex flex-col">
      <Card className="flex-1 flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-lg font-semibold">ThirdShift.ai</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
              Regulatory AI
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 text-primary-foreground hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 space-y-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {message.type === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="prose prose-sm max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium opacity-75">Sources:</p>
                          {message.sources.slice(0, 3).map((source, index) => (
                            <a
                              key={index}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-50 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">ThirdShift.ai is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about FDA, USDA, EPA regulations..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Powered by OpenAI & Perplexity • RegIQ Enterprise
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}