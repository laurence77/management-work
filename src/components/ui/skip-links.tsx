/**
 * Skip Links Component
 * Provides keyboard navigation shortcuts for accessibility
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useSkipLinks, a11yClasses } from '@/utils/accessibility-utils';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultSkipLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#search', label: 'Skip to search' },
  { href: '#footer', label: 'Skip to footer' }
];

export function SkipLinks({ links = defaultSkipLinks, className }: SkipLinksProps) {
  const { skipLinksRef } = useSkipLinks();

  return (
    <div 
      ref={skipLinksRef}
      className={cn('skip-links-container', className)}
      role="navigation"
      aria-label="Skip links"
    >
      {links.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            a11yClasses.skipLink,
            'skip-link',
            // Position each link with increasing z-index
            `z-[${50 + index}]`
          )}
          onFocus={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.transform = 'translateY(-100%)';
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Main Content Wrapper - Provides the main landmark
 */
interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      id="main-content"
      role="main"
      tabIndex={-1}
      className={cn(
        'focus:outline-none',
        a11yClasses.focusVisible,
        className
      )}
    >
      {children}
    </main>
  );
}

/**
 * Navigation Wrapper - Provides the navigation landmark
 */
interface NavigationWrapperProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function NavigationWrapper({ 
  children, 
  label = 'Main navigation',
  className 
}: NavigationWrapperProps) {
  return (
    <nav
      id="navigation"
      role="navigation"
      aria-label={label}
      className={cn(
        'focus:outline-none',
        a11yClasses.focusVisible,
        className
      )}
    >
      {children}
    </nav>
  );
}

/**
 * Search Wrapper - Provides the search landmark
 */
interface SearchWrapperProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function SearchWrapper({ 
  children, 
  label = 'Site search',
  className 
}: SearchWrapperProps) {
  return (
    <div
      id="search"
      role="search"
      aria-label={label}
      className={cn(
        'focus:outline-none',
        a11yClasses.focusVisible,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Footer Wrapper - Provides the contentinfo landmark
 */
interface FooterWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function FooterWrapper({ children, className }: FooterWrapperProps) {
  return (
    <footer
      id="footer"
      role="contentinfo"
      className={cn(
        'focus:outline-none',
        a11yClasses.focusVisible,
        className
      )}
    >
      {children}
    </footer>
  );
}