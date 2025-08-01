import React from 'react';
import { Home, Search, Calendar, User, Plus, Star, Bell, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MobileNavigationProps {
  currentPath?: string;
  notifications?: number;
  onNavigate?: (path: string) => void;
  onQuickAction?: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPath,
  notifications = 0,
  onNavigate,
  onQuickAction
}) => {
  const navigationItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/dashboard',
      isActive: currentPath === '/dashboard' || currentPath === '/'
    },
    {
      icon: Search,
      label: 'Explore',
      path: '/explore',
      isActive: currentPath?.startsWith('/explore') || currentPath?.startsWith('/celebrities') || currentPath?.startsWith('/events')
    },
    {
      icon: Plus,
      label: 'Book',
      path: '/book',
      isActive: currentPath?.startsWith('/book'),
      isAction: true
    },
    {
      icon: Bell,
      label: 'Activity',
      path: '/notifications',
      isActive: currentPath?.startsWith('/notifications'),
      badge: notifications
    },
    {
      icon: User,
      label: 'Profile',
      path: '/profile',
      isActive: currentPath?.startsWith('/profile') || currentPath?.startsWith('/settings')
    }
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="mobile-nav">
        {navigationItems.map((item) => {
          const isActive = item.isActive;
          
          if (item.isAction) {
            return (
              <Button
                key={item.path}
                onClick={onQuickAction}
                className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <item.icon className="h-6 w-6 text-black" />
                <span className="sr-only">{item.label}</span>
              </Button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => onNavigate?.(item.path)}
              className={`mobile-nav-item relative ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer to prevent content from being hidden behind fixed navigation */}
      <div className="h-20 sm:h-0" />
    </>
  );
};

export default MobileNavigation;