import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Zap,
  TrendingUp,
  Clock,
  Phone,
  Video
} from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatRoom } from './ChatRoom';

interface LiveChatSystemProps {
  className?: string;
}

export const LiveChatSystem = ({ className = '' }: LiveChatSystemProps) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'room'>('list');

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setView('room');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedRoomId(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Live Chat System</h2>
            <p className="text-gray-600">Real-time communication with Supabase</p>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Zap className="h-3 w-3 mr-1" />
            Real-time
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Chats</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Online Users</p>
                <p className="text-2xl font-bold">47</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Messages Today</p>
                <p className="text-2xl font-bold">324</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold">2.3m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List or Selected Room */}
        <div className="lg:col-span-2">
          {view === 'list' ? (
            <ChatList 
              onRoomSelect={handleRoomSelect}
              selectedRoomId={selectedRoomId || undefined}
            />
          ) : selectedRoomId ? (
            <ChatRoom 
              roomId={selectedRoomId}
              onBack={handleBackToList}
            />
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Voice Call
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </CardContent>
          </Card>

          {/* Chat Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-time messaging</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Typing indicators</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">File uploads</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Message reactions</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Message threads</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Room permissions</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  ✓ Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>John joined Support Chat</span>
                  <span className="text-gray-500 text-xs ml-auto">2m ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>New message in Booking #123</span>
                  <span className="text-gray-500 text-xs ml-auto">5m ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>File uploaded to General Chat</span>
                  <span className="text-gray-500 text-xs ml-auto">8m ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Sarah left VIP Support</span>
                  <span className="text-gray-500 text-xs ml-auto">12m ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Info */}
      <Card className="border-l-4 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Real-time Chat Implementation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Powered by Supabase Realtime with PostgreSQL Row Level Security (RLS) for secure, 
                scalable chat functionality including typing indicators, file uploads, and message reactions.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">Supabase Realtime</Badge>
                <Badge variant="outline" className="text-xs">PostgreSQL RLS</Badge>
                <Badge variant="outline" className="text-xs">Server-Sent Events</Badge>
                <Badge variant="outline" className="text-xs">File Upload Support</Badge>
                <Badge variant="outline" className="text-xs">Typing Indicators</Badge>
                <Badge variant="outline" className="text-xs">Message Threading</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};