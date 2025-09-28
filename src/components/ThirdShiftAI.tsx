import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, MessageSquare, Zap, Clock, CheckCircle, AlertTriangle, Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ThirdShiftAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your ThirdShift AI assistant. I can help you analyze regulatory alerts, predict compliance risks, and provide insights about food safety trends. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'connected' | 'loading' | 'error'>('connected');

  const quickPrompts = [
    'Analyze recent FDA recalls for patterns',
    'What are the emerging food safety trends?',
    'Help me understand HACCP compliance',
    'Summarize today\'s regulatory updates',
    'Predict risk factors for my facility'
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${inputMessage}". This is a simulated response. In the full implementation, I would analyze your regulatory data, cross-reference with current compliance requirements, and provide detailed insights with actionable recommendations.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            ThirdShift AI Assistant
          </h2>
          <p className="text-muted-foreground">
            AI-powered regulatory intelligence and compliance analysis
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`${
            aiStatus === 'connected' ? 'border-green-500 text-green-700' :
            aiStatus === 'loading' ? 'border-yellow-500 text-yellow-700' :
            'border-red-500 text-red-700'
          }`}
        >
          {aiStatus === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
          {aiStatus === 'loading' && <Clock className="h-3 w-3 mr-1" />}
          {aiStatus === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {aiStatus === 'connected' ? 'Online' : aiStatus === 'loading' ? 'Connecting' : 'Offline'}
        </Badge>
      </div>

      {/* AI Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Smart Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze regulatory patterns, predict compliance risks, and get contextual insights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Real-time Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              24/7 monitoring of regulatory changes with instant alerts and impact assessments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Machine learning models predict emerging risks and compliance deadlines.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card className="min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle>AI Chat Assistant</CardTitle>
          <CardDescription>
            Ask questions about regulatory compliance, food safety, or get help analyzing alerts
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-4 mb-4 max-h-80 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Quick prompts:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask me about regulatory compliance, food safety trends, or help analyzing alerts..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 min-h-[60px] resize-none"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Features */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise AI Features</CardTitle>
          <CardDescription>
            Advanced capabilities for enterprise subscribers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50/50">
              <h4 className="font-semibold mb-2">Custom Training</h4>
              <p className="text-sm text-muted-foreground">
                Train AI models on your specific compliance history and facility data.
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50/50">
              <h4 className="font-semibold mb-2">API Integration</h4>
              <p className="text-sm text-muted-foreground">
                Integrate AI insights directly into your existing quality management systems.
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-purple-50/50">
              <h4 className="font-semibold mb-2">Advanced Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Predictive modeling, trend analysis, and automated compliance scoring.
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-orange-50/50">
              <h4 className="font-semibold mb-2">24/7 Monitoring</h4>
              <p className="text-sm text-muted-foreground">
                Continuous regulatory monitoring with instant risk assessments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}