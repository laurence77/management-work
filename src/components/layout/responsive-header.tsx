/**
 * Responsive Header Component
 * Mobile-first navigation header with responsive design
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User, 
  Search, 
  Star, 
  Phone, 
  MessageCircle, 
  Crown,
  Settings,
  LogOut,
  ChevronDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useScreenSize, mobileUtils, containerClasses } from '@/utils/responsive-utils';
import { OfflineIndicator } from '@/components/ui/offline-banner';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}

interface User {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface ResponsiveHeaderProps {
  user?: User;
  onLogin?: () => void;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

const navigationItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Star
  },
  {
    label: 'Celebrities',
    href: '/celebrities',
    icon: Crown,
    children: [
      { label: 'Browse All', href: '/celebrities' },
      { label: 'Actors', href: '/celebrities?category=actors' },
      { label: 'Musicians', href: '/celebrities?category=musicians' },
      { label: 'Athletes', href: '/celebrities?category=athletes' },
      { label: 'Influencers', href: '/celebrities?category=influencers' }
    ]
  },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'Private Meetings', href: '/services/meetings' },
      { label: 'Event Appearances', href: '/services/events' },
      { label: 'Brand Consulting', href: '/services/consulting' },
      { label: 'VIP Experiences', href: '/vip' }
    ]
  },
  {
    label: 'VIP',
    href: '/vip',
    badge: 'Premium'
  },
  {
    label: 'Contact',
    href: '/contact',
    icon: Phone
  }
];

export function ResponsiveHeader({
  user,
  onLogin,
  onLogout,
  onSearch,
  className
}: ResponsiveHeaderProps) {
  const { isMobile, isTablet } = useScreenSize();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== '/' && location.pathname.startsWith(href));
  };

  // Desktop Navigation Item
  const DesktopNavItem = ({ item }: { item: NavItem }) => {
    if (item.children) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-auto p-2 font-medium text-sm',
                'hover:bg-gray-100 hover:text-gray-900',
                isActiveLink(item.href) && 'text-blue-600 bg-blue-50'
              )}
            >
              {item.icon && <item.icon className="h-4 w-4 mr-2" />}
              {item.label}
              <ChevronDown className="h-3 w-3 ml-1" />
              {item.badge && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {item.children.map((child) => (
              <DropdownMenuItem key={child.href} asChild>
                <Link
                  to={child.href}
                  className="flex items-center w-full px-2 py-1.5 text-sm"
                >
                  {child.icon && <child.icon className="h-4 w-4 mr-2" />}
                  {child.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link to={item.href}>
        <Button
          variant="ghost"
          className={cn(
            'h-auto p-2 font-medium text-sm',
            'hover:bg-gray-100 hover:text-gray-900',
            isActiveLink(item.href) && 'text-blue-600 bg-blue-50'
          )}
        >
          {item.icon && <item.icon className="h-4 w-4 mr-2" />}
          {item.label}
          {item.badge && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    );
  };

  // Mobile Navigation Item
  const MobileNavItem = ({ item }: { item: NavItem }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (item.children) {
      return (
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'w-full justify-between h-12 px-4 text-base font-medium',
              'hover:bg-gray-100',
              isActiveLink(item.href) && 'text-blue-600 bg-blue-50'
            )}
          >
            <div className="flex items-center">
              {item.icon && <item.icon className="h-5 w-5 mr-3" />}
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="ml-2">
                  {item.badge}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </Button>
          
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children.map((child) => (
                <Link key={child.href} to={child.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-11 px-4 text-sm',
                      'hover:bg-gray-50',
                      isActiveLink(child.href) && 'text-blue-600 bg-blue-50'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {child.icon && <child.icon className="h-4 w-4 mr-3" />}
                    {child.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link to={item.href}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-12 px-4 text-base font-medium',
            'hover:bg-gray-100',
            isActiveLink(item.href) && 'text-blue-600 bg-blue-50'
          )}
          onClick={() => setIsOpen(false)}
        >
          {item.icon && <item.icon className="h-5 w-5 mr-3" />}
          {item.label}
          {item.badge && (
            <Badge variant="secondary" className="ml-2">
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    );
  };

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60',
      className
    )}>
      <div className={containerClasses.container}>
        <div className={cn(
          'flex items-center justify-between',
          mobileUtils.mobileNav.height
        )}>
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Star className="h-4 w-4 text-white" />
              </div>
              <span className={cn(
                'font-bold text-gray-900',
                'text-lg sm:text-xl',
                'hidden sm:block'
              )}>
                Celebrity Booking
              </span>
              <span className="font-bold text-gray-900 text-lg sm:hidden">
                CB
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <DesktopNavItem key={item.href} item={item} />
              ))}
            </nav>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Offline Indicator */}
            <OfflineIndicator />

            {/* Search - Desktop */}
            {!isMobile && onSearch && (
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="search"
                  placeholder="Search celebrities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 h-9"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </form>
            )}

            {/* Search - Mobile */}
            {isMobile && onSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  mobileUtils.touchTarget,
                  'p-2'
                )}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'relative h-9 w-9 rounded-full',
                      mobileUtils.touchTarget
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/management" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={onLogin}
                size={isMobile ? 'default' : 'sm'}
                className={cn(
                  mobileUtils.touchTarget,
                  isMobile && mobileUtils.buttonSize
                )}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      mobileUtils.touchTarget,
                      'p-2'
                    )}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-80">
                  <SheetHeader>
                    <SheetTitle className="text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  
                  <nav className="mt-6 space-y-1">
                    {navigationItems.map((item) => (
                      <MobileNavItem key={item.href} item={item} />
                    ))}
                  </nav>

                  {/* Mobile User Section */}
                  {user && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Link to="/management">
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-11"
                            onClick={() => setIsOpen(false)}
                          >
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={onLogout}
                          className="w-full justify-start h-11 text-red-600"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Log out
                        </Button>
                      </div>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isMobile && isSearchOpen && onSearch && (
          <div className="py-3 border-t">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Search celebrities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-12 text-base"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}