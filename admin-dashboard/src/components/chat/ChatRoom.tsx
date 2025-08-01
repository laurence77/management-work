import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Edit, 
  Trash2,
  Reply,
  Users,
  Settings,
  MessageSquare
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  is_edited: boolean;
  edited_at?: string;
  reply_to?: string;
  metadata?: any;
  app_users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  chat_attachments: any[];
  chat_reactions: any[];
}

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  booking_id?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_message?: Message;
}

interface TypingUser {
  user_id: string;
  app_users: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ChatRoomProps {
  roomId: string;
  onBack?: () => void;
}

export const ChatRoom = ({ roomId, onBack }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    loadRoom();
    loadMessages();
    
    // Set up real-time event listener (SSE)
    const eventSource = new EventSource(`/api/chat/${roomId}/events`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleRealtimeEvent(data);
    };

    eventSource.onerror = () => {
      console.warn('Chat events connection lost, attempting to reconnect...');
    };

    return () => {
      eventSource.close();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update last seen when room changes
    if (roomId) {
      updateLastSeen();
    }
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const response = await api.get('/chat');
      const rooms = response.data.data;
      const currentRoom = rooms.find((r: ChatRoom) => r.id === roomId);
      setRoom(currentRoom || null);
    } catch (error) {
      console.error('Failed to load room:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/${roomId}/messages`);
      setMessages(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast({
        title: 'Failed to load messages',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        content: newMessage.trim(),
        messageType: 'text',
        replyTo: replyTo?.id
      };

      const response = await api.post(`/chat/${roomId}/messages`, messageData);
      
      // Add the new message to the list
      setMessages(prev => [...prev, response.data.data]);
      setNewMessage('');
      setReplyTo(null);

      // Stop typing indicator
      if (isTyping) {
        await setTypingStatus(false);
        setIsTyping(false);
      }

    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Failed to send message',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const setTypingStatus = async (typing: boolean) => {
    try {
      await api.post(`/chat/${roomId}/typing`, { isTyping: typing });
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(false);
    }, 3000);
  };

  const updateLastSeen = async () => {
    try {
      await api.post(`/chat/${roomId}/seen`);
    } catch (error) {
      console.error('Failed to update last seen:', error);
    }
  };

  const handleRealtimeEvent = (data: any) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'message_edited':
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.message.id ? { ...msg, ...data.message } : msg
          )
        );
        break;
      case 'message_deleted':
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.message.id ? { ...msg, is_deleted: true } : msg
          )
        );
        break;
      case 'typing_start':
        setTypingUsers(prev => 
          prev.some(u => u.user_id === data.user.id) 
            ? prev 
            : [...prev, { user_id: data.user.id, app_users: data.user }]
        );
        break;
      case 'typing_stop':
        setTypingUsers(prev => 
          prev.filter(u => u.user_id !== data.user.id)
        );
        break;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading chat..." />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                ← Back
              </Button>
            )}
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>{room?.name || 'Chat Room'}</span>
                <Badge variant="outline" className="text-xs">
                  {room?.type}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {messages.length} messages
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onReply={(msg) => setReplyTo(msg)}
              />
            ))}
            
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>
                  {typingUsers.map(u => `${u.app_users.first_name} ${u.app_users.last_name}`).join(', ')} 
                  {typingUsers.length === 1 ? ' is' : ' are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview */}
          {replyTo && (
            <div className="border-t bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Reply className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Replying to {replyTo.app_users.first_name}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReplyTo(null)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-700 mt-1 truncate">
                {replyTo.content}
              </p>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex items-end space-x-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="min-h-[40px] max-h-[120px] resize-none"
                  disabled={sending}
                />
              </div>
              <Button variant="outline" size="sm">
                <Smile className="h-4 w-4" />
              </Button>
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
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
  );
};

const MessageBubble = ({ 
  message, 
  onReply 
}: { 
  message: Message; 
  onReply: (message: Message) => void; 
}) => {
  const [showActions, setShowActions] = useState(false);
  const isSystem = message.message_type === 'system';
  const isOwn = false; // This should be determined by comparing with current user

  if (isSystem) {
    return (
      <div className="text-center py-2">
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {message.app_users.first_name} {message.app_users.last_name}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.is_edited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>
        
        <div className={`rounded-lg p-3 ${
          isOwn 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          {message.reply_to && (
            <div className="border-l-2 border-gray-300 pl-2 mb-2 text-sm opacity-75">
              <span>Replying to previous message</span>
            </div>
          )}
          
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {message.chat_attachments?.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.chat_attachments.map((attachment, index) => (
                <div key={index} className="text-xs opacity-75">
                  📎 {attachment.original_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {message.chat_reactions?.length > 0 && (
          <div className="flex items-center space-x-1 mt-1">
            {message.chat_reactions.map((reaction, index) => (
              <span key={index} className="text-sm">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      {showActions && (
        <div className={`flex items-center space-x-1 ${
          isOwn ? 'order-1 mr-2' : 'order-2 ml-2'
        }`}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => onReply(message)}
          >
            <Reply className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Smile className="h-3 w-3" />
          </Button>
          {isOwn && (
            <>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};