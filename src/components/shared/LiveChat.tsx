import { useState } from "react";
import { MessageSquare, X, Send, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const supportInfo = {
    online: true,
    responseTime: "< 30 seconds",
    agent: "Sophia Chen"
  };

  return (
    <>
      {/* Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-luxury w-16 h-16 rounded-full shadow-glow hover:scale-110 transition-all duration-300"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageSquare className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] z-50">
          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-primary p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-primary-foreground"></div>
                  </div>
                  <div>
                    <div className="font-semibold">Elite Concierge</div>
                    <div className="text-xs opacity-90">
                      {supportInfo.agent} • Online
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="mt-3 text-sm opacity-90">
                Average response time: {supportInfo.responseTime}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-white/10">
              <div className="text-sm text-muted-foreground mb-3">How can we help you today?</div>
              <div className="grid grid-cols-1 gap-2">
                <button className="btn-glass text-left p-3 text-sm">
                  💫 Book a celebrity meeting
                </button>
                <button className="btn-glass text-left p-3 text-sm">
                  📅 Check availability
                </button>
                <button className="btn-glass text-left p-3 text-sm">
                  💰 Get pricing information
                </button>
                <button className="btn-glass text-left p-3 text-sm">
                  🎭 Browse celebrities
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto luxury-scroll p-4 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="glass p-3 rounded-lg rounded-tl-none">
                    <p className="text-sm">
                      Hello! Welcome to EliteConnect. I'm Sophia, your personal concierge. 
                      How can I help you connect with your favorite celebrity today?
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Just now
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Options */}
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="text-sm text-muted-foreground">Need immediate assistance?</div>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="tel:+1-555-123-4567" 
                  className="btn-glass flex items-center justify-center space-x-2 p-3"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Call Us</span>
                </a>
                <a 
                  href="mailto:concierge@eliteconnect.com" 
                  className="btn-glass flex items-center justify-center space-x-2 p-3"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </a>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 glass px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Handle send message
                      setMessage("");
                    }
                  }}
                />
                <Button size="icon" className="btn-luxury">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
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