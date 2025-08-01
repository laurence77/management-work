/**
 * Accessible Navigation Components
 * Navigation with comprehensive keyboard support and ARIA patterns
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useKeyboardNavigation,
  generateId,
  createAriaAttributes,
  a11yClasses,
  KEYBOARD_KEYS,
  ariaPatterns
} from '@/utils/accessibility-utils';
import { AccessibleButton } from './accessible-button';

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: NavItem[];
  disabled?: boolean;
  external?: boolean;
}

interface AccessibleNavigationProps {
  items: NavItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
  onItemSelect?: (item: NavItem) => void;
}

export function AccessibleNavigation({
  items,
  orientation = 'horizontal',
  className,
  label = 'Main navigation',
  onItemSelect
}: AccessibleNavigationProps) {
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Create flat list of focusable items for keyboard navigation
  const getFocusableItems = (): HTMLElement[] => {
    const elements: HTMLElement[] = [];
    items.forEach(item => {
      const element = itemRefs.current.get(item.id);
      if (element && !item.disabled) {
        elements.push(element);
      }
    });
    return elements;
  };

  const { currentIndex, handleKeyDown } = useKeyboardNavigation(
    getFocusableItems(),
    {
      orientation,
      loop: true,
      onSelect: (element) => {
        element.click();
      },
      onEscape: () => {
        setOpenSubmenu(null);
        setFocusedItem(null);
      }
    }
  );

  // Handle submenu keyboard navigation
  const handleSubmenuKeyDown = (e: React.KeyboardEvent, parentId: string) => {
    const parent = items.find(item => item.id === parentId);
    if (!parent?.children) return;

    switch (e.key) {
      case KEYBOARD_KEYS.ESCAPE:
        e.preventDefault();
        setOpenSubmenu(null);
        const parentElement = itemRefs.current.get(parentId);
        parentElement?.focus();
        break;
        
      case KEYBOARD_KEYS.ARROW_DOWN:
        e.preventDefault();
        // Focus first submenu item
        const firstChild = parent.children[0];
        if (firstChild) {
          const firstElement = itemRefs.current.get(firstChild.id);
          firstElement?.focus();
        }
        break;
    }
  };

  const isCurrentPage = (href: string) => {
    return location.pathname === href || 
           (href !== '/' && location.pathname.startsWith(href));
  };

  const handleItemClick = (item: NavItem, e?: React.MouseEvent) => {
    if (item.disabled) {
      e?.preventDefault();
      return;
    }

    // Handle submenu toggle
    if (item.children) {
      e?.preventDefault();
      setOpenSubmenu(openSubmenu === item.id ? null : item.id);
      return;
    }

    // Handle external links
    if (item.external && item.href) {
      e?.preventDefault();
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }

    onItemSelect?.(item);
    setOpenSubmenu(null);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, item: NavItem) => {
    switch (e.key) {
      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        e.preventDefault();
        handleItemClick(item);
        break;
        
      case KEYBOARD_KEYS.ARROW_DOWN:
        if (item.children && orientation === 'horizontal') {
          e.preventDefault();
          setOpenSubmenu(item.id);
          // Focus first child
          setTimeout(() => {
            const firstChild = item.children![0];
            const firstElement = itemRefs.current.get(firstChild.id);
            firstElement?.focus();
          }, 0);
        }
        break;
        
      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (item.children && orientation === 'vertical') {
          e.preventDefault();
          setOpenSubmenu(item.id);
        }
        break;
        
      case KEYBOARD_KEYS.ARROW_LEFT:
        if (openSubmenu === item.id) {
          e.preventDefault();
          setOpenSubmenu(null);
        }
        break;
    }

    // Call parent navigation handler
    handleKeyDown(e);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasSubmenu = item.children && item.children.length > 0;
    const isOpen = openSubmenu === item.id;
    const isCurrent = item.href ? isCurrentPage(item.href) : false;
    const isTopLevel = level === 0;

    const navItemProps = createAriaAttributes({
      role: hasSubmenu ? 'button' : 'menuitem',
      'aria-expanded': hasSubmenu ? isOpen : undefined,
      'aria-haspopup': hasSubmenu ? 'menu' : undefined,
      'aria-current': isCurrent ? 'page' : undefined,
      'aria-disabled': item.disabled,
      tabIndex: item.disabled ? -1 : 0
    });

    const itemContent = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {item.icon && (
            <span className="mr-2 flex-shrink-0" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
          {item.badge && (
            <span 
              className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
              aria-label={`${item.badge} badge`}
            >
              {item.badge}
            </span>
          )}
        </div>
        
        {hasSubmenu && (
          <span aria-hidden="true">
            {orientation === 'horizontal' ? (
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )} />
            ) : (
              <ChevronRight className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-90'
              )} />
            )}
          </span>
        )}
      </div>
    );

    const baseItemClasses = cn(
      'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      {
        // Current page styles
        'bg-blue-100 text-blue-900': isCurrent && !item.disabled,
        // Default styles
        'text-gray-700 hover:text-gray-900 hover:bg-gray-100': !isCurrent && !item.disabled,
        // Disabled styles
        'text-gray-400 cursor-not-allowed': item.disabled,
        // Submenu styles
        'pl-6': !isTopLevel
      }
    );

    const itemElement = hasSubmenu ? (
      <AccessibleButton
        ref={(el) => el && itemRefs.current.set(item.id, el)}
        variant="ghost"
        className={baseItemClasses}
        onClick={(e) => handleItemClick(item, e)}
        onKeyDown={(e) => handleItemKeyDown(e, item)}
        onFocus={() => setFocusedItem(item.id)}
        disabled={item.disabled}
        {...navItemProps}
      >
        {itemContent}
      </AccessibleButton>
    ) : item.href ? (
      <Link
        ref={(el) => el && itemRefs.current.set(item.id, el)}
        to={item.href}
        className={baseItemClasses}
        onClick={(e) => handleItemClick(item, e)}
        onKeyDown={(e) => handleItemKeyDown(e, item)}
        onFocus={() => setFocusedItem(item.id)}
        {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
        {...navItemProps}
      >
        {itemContent}
      </Link>
    ) : (
      <div
        ref={(el) => el && itemRefs.current.set(item.id, el)}
        className={baseItemClasses}
        onClick={(e) => handleItemClick(item, e)}
        onKeyDown={(e) => handleItemKeyDown(e, item)}
        onFocus={() => setFocusedItem(item.id)}
        {...navItemProps}
      >
        {itemContent}
      </div>
    );

    return (
      <li key={item.id} className="relative">
        {itemElement}
        
        {/* Submenu */}
        {hasSubmenu && isOpen && (
          <ul
            role="menu"
            aria-labelledby={item.id}
            className={cn(
              'mt-1 space-y-1',
              orientation === 'horizontal' && 'absolute left-0 top-full bg-white border border-gray-200 rounded-md shadow-lg min-w-48 py-1 z-50',
              orientation === 'vertical' && 'ml-4 border-l border-gray-200 pl-4'
            )}
            onKeyDown={(e) => handleSubmenuKeyDown(e, item.id)}
          >
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      ref={navRef}
      className={cn(className)}
      aria-label={label}
      role="navigation"
    >
      <ul
        role="menubar"
        className={cn(
          'space-y-1',
          orientation === 'horizontal' && 'flex space-y-0 space-x-1'
        )}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
      >
        {items.map(item => renderNavItem(item))}
      </ul>
    </nav>
  );
}

/**
 * Breadcrumb Navigation - Accessible breadcrumb component
 */
interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface AccessibleBreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export function AccessibleBreadcrumb({
  items,
  separator = <ChevronRight className="h-4 w-4" />,
  className
}: AccessibleBreadcrumbProps) {
  
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        role="list"
        className="flex items-center space-x-2 text-sm"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {item.href && !isCurrent ? (
                <Link
                  to={item.href}
                  className={cn(
                    'hover:text-blue-600 transition-colors',
                    a11yClasses.focusVisible
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isCurrent && 'text-gray-900 font-medium'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Tab Navigation - Accessible tab component
 */
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

interface AccessibleTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function AccessibleTabs({
  tabs,
  activeTab,
  onTabChange,
  orientation = 'horizontal',
  className
}: AccessibleTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { handleKeyDown } = useKeyboardNavigation(
    Array.from(tabRefs.current.values()),
    {
      orientation,
      loop: true,
      onSelect: (element) => {
        const tabId = element.getAttribute('data-tab-id');
        if (tabId) {
          onTabChange(tabId);
        }
      }
    }
  );

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    onTabChange(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          'flex border-b border-gray-200',
          orientation === 'vertical' && 'flex-col border-b-0 border-r'
        )}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabPanelId = `${tab.id}-panel`;
          
          return (
            <button
              key={tab.id}
              ref={(el) => el && tabRefs.current.set(tab.id, el)}
              role="tab"
              data-tab-id={tab.id}
              aria-selected={isActive}
              aria-controls={tabPanelId}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                {
                  'border-b-2 border-blue-500 text-blue-600': isActive && !tab.disabled,
                  'text-gray-500 hover:text-gray-700': !isActive && !tab.disabled,
                  'text-gray-400 cursor-not-allowed': tab.disabled
                }
              )}
            >
              <span className="flex items-center">
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={activeTab}
        tabIndex={0}
        className="mt-4 focus:outline-none"
      >
        {activeTabContent}
      </div>
    </div>
  );
}