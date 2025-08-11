import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


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
      content: "Hi! I'm RegIQ's AI assistant powered by GPT-4.1 with real-time web search and database integration. I can help you find FDA regulations, USDA guidelines, EPA rules, and other regulatory information using our comprehensive data sources. What food safety or regulatory question can I help you with?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

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
      console.log('ConversationalChatbot: Starting search with query:', userMessage.content);
      
      // Call Perplexity search function for better regulatory intelligence
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: {
          query: userMessage.content,
          agencies: ['FDA', 'USDA', 'EPA', 'CDC'],
          searchType: 'general',
          industry: 'Food Safety',
          timeRange: 'month'
        }
      });

      console.log('ConversationalChatbot: API response:', { data, error });

      if (error) {
        console.error('ConversationalChatbot: Supabase function error:', error);
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
          success: true
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
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
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col">
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
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <X className="h-4 w-4" />
        </Button>
      </div>

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
              <div className="bg-muted p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about FDA, USDA, EPA regulations... (Enhanced AI with web search)"
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