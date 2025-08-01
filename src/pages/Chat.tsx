import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  MessageCircle, 
  Star, 
  Video, 
  Phone,
  Settings,
  Search,
  CheckCheck,
  Mic,
  MoreVertical,
  Pin,
  Calendar,
  X,
  Users,
  Shield,
  Activity,
  Sparkles,
  Clock,
  User,
  HeadphonesIcon
} from "lucide-react";

interface ChatMessage {
  id: number;
  sender: 'user' | 'support' | 'celebrity' | 'system';
  message: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'system' | 'news';
}

interface ChatContact {
  id: number;
  name: string;
  type: 'support' | 'celebrity';
  status: 'online' | 'offline' | 'away';
  lastMessage: string;
  lastSeen: string;
  unreadCount: number;
  isVerified?: boolean;
  category?: string;
  price?: string;
  responseTime?: string;
}

const Chat = () => {
  const [selectedContact, setSelectedContact] = useState<number | null>(0);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Support contacts (always available)
  const supportContacts: ChatContact[] = [
    {
      id: 0,
      name: "Elite Concierge",
      type: "support",
      status: "online",
      lastMessage: "How can we help you today? 💫",
      lastSeen: "Online",
      unreadCount: 0,
      responseTime: "< 30 seconds"
    }
  ];

  // Booked celebrities (only those with approved bookings)
  const bookedCelebrities: ChatContact[] = [
    {
      id: 1,
      name: "Emma Stone",
      type: "celebrity",
      status: "online",
      lastMessage: "Looking forward to our meeting! 🎬",
      lastSeen: "2 mins ago",
      unreadCount: 1,
      isVerified: true,
      category: "A-List Actor",
      price: "$15,000/hour"
    }
  ];

  const allContacts = [...supportContacts, ...bookedCelebrities];
  const selectedContactData = allContacts.find(c => c.id === selectedContact);

  // Initial messages for Elite Concierge
  const supportMessages: ChatMessage[] = [
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
    },
    {
      id: 3,
      sender: "system",
      message: "📰 Daily Update: 3 new A-list celebrities now available for bookings this month!",
      timestamp: "1 hour ago",
      type: "news"
    }
  ];

  // Celebrity messages (for booked celebrities only)
  const celebrityMessages: ChatMessage[] = [
    {
      id: 1,
      sender: "system",
      message: "Booking confirmed with Emma Stone for March 15, 2024",
      timestamp: "Yesterday",
      type: "system"
    },
    {
      id: 2,
      sender: "celebrity",
      message: "Hi! Thanks for booking the meet & greet session. I'm really excited to meet you! 🌟",
      timestamp: "10:32 AM",
      status: "read"
    },
    {
      id: 3,
      sender: "user",
      message: "Thank you so much! I've been a huge fan for years. Can't wait!",
      timestamp: "10:35 AM",
      status: "delivered"
    },
    {
      id: 4,
      sender: "celebrity",
      message: "Looking forward to our meeting! 🎬",
      timestamp: "2 mins ago",
      status: "read"
    }
  ];

  useEffect(() => {
    if (selectedContact !== null) {
      if (selectedContact === 0) {
        setMessages(supportMessages);
      } else {
        setMessages(celebrityMessages);
      }
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      message: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage("");

    // Simulate AI response for support chat
    if (selectedContact === 0) {
      setIsTyping(true);
      
      setTimeout(async () => {
        try {
          // Here you would integrate with DeepSeek API
          const aiResponse = await getAIResponse(newMessage);
          
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
    }
  };

  // Placeholder for DeepSeek API integration
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Smart Celebrity <span className="text-gradient-primary">Chat</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Connect with celebrities and get instant support from our concierge team
            </p>
          </div>

          {/* Chat Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 bg-slate-800/50 backdrop-blur text-white border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">Support Active</p>
                    <p className="text-2xl font-bold">24/7</p>
                  </div>
                  <HeadphonesIcon className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-slate-800/50 backdrop-blur text-white border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">Booked Celebs</p>
                    <p className="text-2xl font-bold">{bookedCelebrities.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-slate-800/50 backdrop-blur text-white border border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">Response Time</p>
                    <p className="text-2xl font-bold">30s</p>
                  </div>
                  <Clock className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 bg-blue-800/50 backdrop-blur text-white border border-blue-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">AI Powered</p>
                    <p className="text-2xl font-bold">DeepSeek</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
            {/* Contacts Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-full shadow-xl border border-slate-700 bg-slate-800/50 backdrop-blur">
                <CardHeader className="pb-4 bg-slate-900 text-white">
                  <CardTitle className="flex items-center gap-3">
                    <div className="relative p-2 bg-white/20 rounded-full">
                      <MessageCircle className="h-5 w-5" />
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white" />
                    </div>
                    <div>
                      <div className="font-bold">Conversations</div>
                      <div className="text-sm text-white/80">{filteredContacts.length} chats</div>
                    </div>
                  </CardTitle>
                  
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="space-y-2 max-h-[500px] overflow-y-auto p-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact.id)}
                        className={`p-4 cursor-pointer transition-all duration-200 rounded-xl m-1 ${
                          selectedContact === contact.id 
                            ? 'bg-slate-700/50 border border-slate-600 shadow-md'
                            : 'hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                              contact.type === 'support' ? 'bg-blue-600' : 'bg-purple-600'
                            }`}>
                              {contact.type === 'support' ? (
                                <HeadphonesIcon className="h-6 w-6" />
                              ) : (
                                contact.name.charAt(0)
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-white truncate">
                                {contact.name}
                              </span>
                              {contact.type === 'support' && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Support</Badge>
                              )}
                              {contact.isVerified && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <CheckCheck className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {contact.type === 'celebrity' && (
                              <div className="text-xs text-blue-400 font-medium mb-1">
                                {contact.category} • {contact.price}
                              </div>
                            )}
                            
                            {contact.responseTime && (
                              <div className="text-xs text-green-400 font-medium mb-1">
                                Avg response: {contact.responseTime}
                              </div>
                            )}
                            
                            <p className="text-sm text-slate-300 truncate mb-1">
                              {contact.lastMessage}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">{contact.lastSeen}</span>
                              {contact.unreadCount > 0 && (
                                <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {contact.unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              <Card className="h-full shadow-xl border border-slate-700 bg-slate-800/50 backdrop-blur flex flex-col">
                {selectedContactData ? (
                  <>
                    {/* Chat Header */}
                    <CardHeader className="pb-4 border-b border-slate-700 bg-slate-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                              selectedContactData.type === 'support' ? 'bg-blue-600' : 'bg-purple-600'
                            }`}>
                              {selectedContactData.type === 'support' ? (
                                <HeadphonesIcon className="h-5 w-5" />
                              ) : (
                                selectedContactData.name.charAt(0)
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(selectedContactData.status)}`} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{selectedContactData.name}</h3>
                              {selectedContactData.type === 'support' && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  <HeadphonesIcon className="h-3 w-3 mr-1" />
                                  24/7 Support
                                </Badge>
                              )}
                              {selectedContactData.isVerified && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-slate-300">
                              {selectedContactData.status === 'online' ? 'Online now' : selectedContactData.lastSeen}
                              {selectedContactData.responseTime && ` • ${selectedContactData.responseTime}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {selectedContactData.type === 'celebrity' && (
                            <>
                              <Button variant="ghost" size="sm">
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Video className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick Actions for Support */}
                      {selectedContactData.type === 'support' && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="text-xs">
                            💫 Book Celebrity
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            📅 Check Availability
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            💰 Get Pricing
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            🎭 Browse Celebrities
                          </Button>
                        </div>
                      )}
                    </CardHeader>

                    {/* Messages */}
                    <CardContent className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div key={message.id}>
                            {message.type === 'system' ? (
                              <div className="text-center">
                                <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">
                                  <Shield className="h-3 w-3 inline mr-1" />
                                  {message.message}
                                </p>
                              </div>
                            ) : message.type === 'news' ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">{message.message}</p>
                                <span className="text-xs text-blue-600">{message.timestamp}</span>
                              </div>
                            ) : (
                              <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                                  message.sender === 'user'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-700 text-white'
                                }`}>
                                  <p className="text-sm">{message.message}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs opacity-75">{message.timestamp}</span>
                                    {message.sender === 'user' && (
                                      <CheckCheck className="h-3 w-3 text-blue-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="bg-slate-700 px-4 py-2 rounded-2xl">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    </CardContent>

                    {/* Message Input */}
                    <div className="p-4 border-t border-slate-700">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                        <Button type="submit" size="sm" disabled={!newMessage.trim()} className="bg-slate-900 hover:bg-slate-800 text-white">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <MessageCircle className="h-16 w-16 text-slate-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">Select a conversation</h3>
                        <p className="text-slate-300">Choose a contact to start chatting</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>

          {/* Compact Feature Info */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="h-4 w-4 text-blue-400" />
                <span className="font-medium">24/7 Elite Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="font-medium">AI-Powered by DeepSeek</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="font-medium">30s Response Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Chat;