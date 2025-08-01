import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Phone, Mail, Clock, HeadphonesIcon, Sparkles, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: number;
  sender: 'user' | 'support' | 'system';
  message: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'system';
}

export const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "system",
      message: "Welcome to Elite Celebrity Connect! 🌟",
      timestamp: "Just now",
      type: "system"
    },
    {
      id: 2,
      sender: "support",
      message: "Hello! Welcome to EliteConnect. I'm Sophia, your personal concierge. How can I help you connect with your favorite celebrity today?",
      timestamp: "Just now",
      status: "delivered"
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supportInfo = {
    online: true,
    responseTime: "< 30 seconds",
    agent: "Sophia Chen"
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getAIResponse = async (userMessage: string): Promise<string> => {
    // TODO: Implement DeepSeek API integration
    const responses = [
      "I'd be happy to help you with that! What specific celebrity or type of event are you interested in?",
      "Great question! Let me check our available celebrities for your dates. What's your budget range?",
      "I can definitely assist with celebrity bookings. Would you like me to show you our most popular celebrities?",
      "Perfect! I'll help you find the ideal celebrity for your event. What type of occasion is this for?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const newMsg: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      message: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };

    setMessages(prev => [...prev, newMsg]);
    setMessage("");
    
    // Simulate AI response
    setIsTyping(true);
    
    setTimeout(async () => {
      try {
        const aiResponse = await getAIResponse(message);
        
        const responseMsg: ChatMessage = {
          id: messages.length + 2,
          sender: "support",
          message: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "delivered"
        };

        setMessages(prev => [...prev, responseMsg]);
      } catch (error) {
        const fallbackMsg: ChatMessage = {
          id: messages.length + 2,
          sender: "support",
          message: "Thank you for your message! Our team will get back to you shortly. In the meantime, you can:\n\n💫 Book a celebrity meeting\n📅 Check availability\n💰 Get pricing information\n🎭 Browse celebrities",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "delivered"
        };
        setMessages(prev => [...prev, fallbackMsg]);
      }
      
      setIsTyping(false);
    }, 2000);
  };

  return (
    <>
      {/* Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-50 flex">
        <div className="relative group">
          {/* Tooltip */}
          {!isOpen && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none">
              Need help? Chat with us!
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900"></div>
            </div>
          )}
          
          {/* Pulse Animation Ring */}
          <div className="absolute inset-0 rounded-full bg-slate-900/20 animate-pulse scale-110"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 animate-ping"></div>
          
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="relative bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-blue-500/25 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-slate-600 hover:border-blue-400 flex items-center justify-center group overflow-hidden"
          >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/20 to-purple-600/0 group-hover:via-blue-600/40 transition-all duration-500 rounded-full"></div>
            
            {/* Icon Container */}
            <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
              {isOpen ? (
                <X className="h-6 w-6 transition-all duration-300" />
              ) : (
                <MessageSquare className="h-6 w-6 transition-all duration-300 group-hover:scale-110" />
              )}
            </div>
            
            {/* Sparkle Effect */}
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
          </Button>
          
          {/* Notification Badge */}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="h-2 w-2" />
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <HeadphonesIcon className="h-5 w-5" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <div className="font-semibold">Elite Concierge</div>
                    <div className="text-xs text-white/80">
                      {supportInfo.agent} • Online
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="mt-3 text-sm text-white/80">
                Average response time: {supportInfo.responseTime}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm text-slate-600 mb-3">How can we help you today?</div>
              <div className="grid grid-cols-1 gap-2">
                <button className="text-left p-3 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  💫 Book a celebrity meeting
                </button>
                <button className="text-left p-3 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  📅 Check availability
                </button>
                <button className="text-left p-3 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  💰 Get pricing information
                </button>
                <button className="text-left p-3 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                  🎭 Browse celebrities
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'system' ? (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">
                        🌟 {msg.message}
                      </p>
                    </div>
                  ) : (
                    <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'support' && (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                          <HeadphonesIcon className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 max-w-xs">
                        <div className={`p-3 rounded-lg ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white rounded-br-none ml-auto'
                            : 'bg-slate-100 text-slate-900 rounded-tl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">{msg.timestamp}</span>
                          {msg.sender === 'user' && (
                            <CheckCheck className="h-3 w-3 text-blue-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                    <HeadphonesIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Contact Options */}
            <div className="p-4 border-t border-slate-200 space-y-3">
              <div className="text-sm text-slate-600">Need immediate assistance?</div>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="tel:+1-555-123-4567" 
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center space-x-2 p-3 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Call Us</span>
                </a>
                <a 
                  href="mailto:concierge@bookmyreservation.org" 
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center space-x-2 p-3 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </a>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Available 24/7</span>
                </div>
                <div>Press Enter to send</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};