import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  FileText,
  MessageSquare,
  Lightbulb,
  Zap,
  Clock,
  User,
  Bot
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  suggestions?: string[];
  meta?: {
    aiGenerated: boolean;
    model?: string;
    fallback?: boolean;
  };
}

interface AssistantCapability {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  endpoint: string;
  color: string;
}

export const SmartAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<AssistantCapability[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const defaultCapabilities: AssistantCapability[] = [
    {
      name: 'Booking Recommendations',
      description: 'Get AI-powered celebrity suggestions based on your preferences',
      icon: Sparkles,
      endpoint: '/recommendations/booking',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Event Planning',
      description: 'Comprehensive planning advice with timelines and best practices',
      icon: Calendar,
      endpoint: '/advice/event-planning',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Pricing Optimization',
      description: 'Smart pricing strategies based on market data',
      icon: DollarSign,
      endpoint: '/optimization/pricing',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      name: 'Market Analysis',
      description: 'Industry trends and competitive intelligence',
      icon: TrendingUp,
      endpoint: '/analysis/market',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'Contract Guidance',
      description: 'Legal advice and contract recommendations',
      icon: FileText,
      endpoint: '/advice/contract',
      color: 'bg-red-100 text-red-800'
    }
  ];

  useEffect(() => {
    setCapabilities(defaultCapabilities);
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Hello! I'm your smart booking assistant powered by DeepSeek AI. I can help you with:

• **Celebrity booking recommendations** based on your history and preferences
• **Event planning advice** with detailed timelines and logistics
• **Pricing optimization** using market data and trends
• **Market analysis** for strategic decision making
• **Contract guidance** for safe and effective bookings

What would you like help with today?`,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Show me booking recommendations",
        "Help plan my upcoming event",
        "Analyze current market trends",
        "Optimize pricing for a celebrity"
      ],
      meta: {
        aiGenerated: false
      }
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || newMessage.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/deepseek/chat', {
        message: text,
        context: {}
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: typeof response.data.data.response === 'string' 
          ? response.data.data.response 
          : JSON.stringify(response.data.data.response, null, 2),
        timestamp: new Date().toISOString(),
        intent: response.data.data.intent,
        suggestions: response.data.data.suggestions,
        meta: response.data.meta
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.meta?.fallback) {
        toast({
          title: 'Using Fallback Mode',
          description: 'AI service is temporarily unavailable, using backup responses.',
          type: 'warning',
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date().toISOString(),
        meta: {
          aiGenerated: false
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Assistant Error',
        description: error.message || 'Failed to get response from assistant.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (capability: AssistantCapability) => {
    let message = '';
    
    switch (capability.name) {
      case 'Booking Recommendations':
        message = 'Can you provide some celebrity booking recommendations for my upcoming events?';
        break;
      case 'Event Planning':
        message = 'I need help planning an event. Can you provide comprehensive advice?';
        break;
      case 'Pricing Optimization':
        message = 'Help me optimize pricing for celebrity bookings based on market data.';
        break;
      case 'Market Analysis':
        message = 'Show me current market trends and analysis for the celebrity booking industry.';
        break;
      case 'Contract Guidance':
        message = 'I need guidance on contract terms and legal considerations for celebrity bookings.';
        break;
    }
    
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Assistant</h2>
            <p className="text-gray-600">DeepSeek-powered booking intelligence</p>
          </div>
          <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800 border-purple-300">
            <Zap className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <Card 
              key={capability.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleQuickAction(capability)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-2 rounded-lg ${capability.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-sm">{capability.name}</h3>
                  <p className="text-xs text-gray-600">{capability.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat with Assistant</span>
            <Badge variant="outline" className="text-xs">
              {messages.length - 1} messages
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`p-1 rounded-full ${
                        message.type === 'user' 
                          ? 'bg-blue-100' 
                          : 'bg-gradient-to-br from-purple-100 to-blue-100'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Bot className="h-3 w-3 text-purple-600" />
                        )}
                      </div>
                      <span className="text-xs font-medium">
                        {message.type === 'user' ? 'You' : 'Smart Assistant'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      {message.meta?.aiGenerated && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                          <Sparkles className="h-2 w-2 mr-1" />
                          AI
                        </Badge>
                      )}
                      {message.meta?.fallback && (
                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                          Fallback
                        </Badge>
                      )}
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      
                      {message.intent && (
                        <div className="mt-2 text-xs opacity-75">
                          Intent: {message.intent.replace('_', ' ')}
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => sendMessage(suggestion)}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-gray-600">Assistant is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about celebrity bookings..."
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  onClick={() => sendMessage()}
                  disabled={!newMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="border-l-4 border-gradient-to-b from-blue-500 to-purple-600">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">DeepSeek AI Integration</h3>
              <p className="text-sm text-gray-600 mb-3">
                Advanced AI assistant powered by DeepSeek's state-of-the-art language model, 
                providing intelligent insights for celebrity booking, event planning, market analysis, 
                and contract optimization with industry-specific knowledge.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">DeepSeek Chat Model</Badge>
                <Badge variant="outline" className="text-xs">Industry Expertise</Badge>
                <Badge variant="outline" className="text-xs">Real-time Analysis</Badge>
                <Badge variant="outline" className="text-xs">Fallback Support</Badge>
                <Badge variant="outline" className="text-xs">Smart Recommendations</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};