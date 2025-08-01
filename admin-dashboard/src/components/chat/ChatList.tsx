import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  Users,
  Phone,
  Video,
  Settings
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatRoom {
  id: string;
  name: string;
  type: 'support' | 'booking' | 'general';
  booking_id?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_message?: {
    id: string;
    content: string;
    sender_id: string;
    message_type: string;
    created_at: string;
    app_users: {
      first_name: string;
      last_name: string;
    };
  };
  chat_participants: Array<{
    user_id: string;
    role: string;
    last_seen: string;
  }>;
}

interface ChatListProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
}

export const ChatList = ({ onRoomSelect, selectedRoomId }: ChatListProps) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat');
      setRooms(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to load chat rooms:', error);
      toast({
        title: 'Failed to load chats',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (name: string, type: string = 'general') => {
    try {
      const response = await api.post('/chat', { name, type });
      setRooms(prev => [response.data.data, ...prev]);
      setShowCreateModal(false);
      
      toast({
        title: 'Chat room created',
        description: `${name} has been created successfully.`,
        type: 'success',
      });
    } catch (error: any) {
      console.error('Failed to create room:', error);
      toast({
        title: 'Failed to create room',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.latest_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'support':
        return '🎧';
      case 'booking':
        return '📅';
      case 'general':
        return '💬';
      default:
        return '💬';
    }
  };

  const getRoomTypeBadge = (type: string) => {
    const variants = {
      support: 'bg-green-100 text-green-800',
      booking: 'bg-blue-100 text-blue-800',
      general: 'bg-gray-100 text-gray-800'
    };
    
    return variants[type as keyof typeof variants] || variants.general;
  };

  if (loading) {
    return (
      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat Rooms</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading chats..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat Rooms</span>
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No chats found' : 'No chat rooms yet'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first chat
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredRooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  room={room}
                  isSelected={room.id === selectedRoomId}
                  onClick={() => onRoomSelect(room.id)}
                  formatTime={formatMessageTime}
                  getTypeIcon={getRoomTypeIcon}
                  getTypeBadge={getRoomTypeBadge}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createRoom}
        />
      )}
    </Card>
  );
};

const ChatRoomItem = ({
  room,
  isSelected,
  onClick,
  formatTime,
  getTypeIcon,
  getTypeBadge
}: {
  room: ChatRoom;
  isSelected: boolean;
  onClick: () => void;
  formatTime: (timestamp: string) => string;
  getTypeIcon: (type: string) => string;
  getTypeBadge: (type: string) => string;
}) => {
  const hasUnreadMessages = false; // This would be calculated based on last_seen vs latest message
  
  return (
    <div
      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-600' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
            {getTypeIcon(room.type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h3 className={`text-sm font-medium truncate ${
                hasUnreadMessages ? 'font-semibold' : ''
              }`}>
                {room.name}
              </h3>
              <Badge 
                variant="outline" 
                className={`text-xs ${getTypeBadge(room.type)}`}
              >
                {room.type}
              </Badge>
            </div>
            {room.latest_message && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTime(room.latest_message.created_at)}
              </span>
            )}
          </div>
          
          {room.latest_message ? (
            <div className="flex items-center justify-between">
              <p className={`text-sm text-gray-600 truncate ${
                hasUnreadMessages ? 'font-medium' : ''
              }`}>
                <span className="text-gray-500">
                  {room.latest_message.app_users.first_name}:
                </span>{' '}
                {room.latest_message.content}
              </p>
              {hasUnreadMessages && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2"></div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No messages yet</p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              <span>{room.chat_participants.length} members</span>
            </div>
            
            {room.type === 'support' && (
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Phone className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Video className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateRoomModal = ({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, type: string) => void;
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), type);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Chat Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Room Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter room name..."
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Room Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="general">General Chat</option>
                <option value="support">Support</option>
                <option value="booking">Booking Related</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Room
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};