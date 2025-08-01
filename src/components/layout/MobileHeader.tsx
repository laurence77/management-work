import React, { useState } from 'react';
import { Menu, X, Search, Bell, User, Home, Calendar, Star, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface MobileHeaderProps {
  user?: {
    name: string;
    avatar?: string;
    notifications?: number;
  };
  onSearch?: (query: string) => void;
  onNavigate?: (path: string) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  user,
  onSearch,
  onNavigate
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Star, label: 'Celebrities', path: '/celebrities' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full bg-black/90 backdrop-blur-xl border-b border-white/10 safe-top">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo and Menu */}
          <div className="flex items-center space-x-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 touch-target text-white hover:bg-white/10"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-black/95 backdrop-blur-xl border-white/10">
                <SheetHeader>
                  <SheetTitle className="text-left text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                        <Star className="h-5 w-5 text-black" />
                      </div>
                      <span className="text-xl font-bold">EliteConnect</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-8 space-y-2">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className="w-full justify-start h-12 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        onNavigate?.(item.path);
                        setIsMenuOpen(false);
                      }}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </nav>

                {/* User Profile in Menu */}
                {user && (
                  <div className="absolute bottom-8 left-6 right-6">
                    <div className="glass-card p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-black" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{user.name}</p>
                          <p className="text-xs text-white/60">Premium Member</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            <div className="text-xl font-bold text-white">
              EliteConnect
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-2">
            {/* Search - Hidden on very small screens */}
            <div className="hidden xs:block">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 sm:w-48 h-9 bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/15"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              </form>
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 touch-target text-white hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
              {user?.notifications && user.notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {user.notifications > 9 ? '9+' : user.notifications}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {/* User Avatar */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 touch-target"
              onClick={() => onNavigate?.('/profile')}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user?.name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-black" />
                )}
              </div>
              <span className="sr-only">User profile</span>
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar - Shows on very small screens */}
        <div className="xs:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="search"
              placeholder="Search celebrities, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/15"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
          </form>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;