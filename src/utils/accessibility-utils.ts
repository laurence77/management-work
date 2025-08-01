/**
 * Accessibility Utilities for Celebrity Booking Platform
 * Provides ARIA utilities, keyboard navigation, and accessibility helpers
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ARIA role definitions
export type AriaRole = 
  | 'button' | 'link' | 'menuitem' | 'tab' | 'tabpanel' | 'dialog' | 'alertdialog'
  | 'banner' | 'main' | 'navigation' | 'complementary' | 'contentinfo' | 'search'
  | 'form' | 'region' | 'article' | 'section' | 'heading' | 'list' | 'listitem'
  | 'grid' | 'gridcell' | 'row' | 'columnheader' | 'rowheader' | 'table'
  | 'menu' | 'menubar' | 'tooltip' | 'status' | 'alert' | 'log' | 'marquee'
  | 'timer' | 'progressbar' | 'slider' | 'spinbutton' | 'textbox' | 'combobox'
  | 'listbox' | 'option' | 'radiogroup' | 'radio' | 'checkbox' | 'switch';

// Keyboard navigation keys
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const;

/**
 * Generate unique IDs for ARIA relationships
 */
export function generateId(prefix = 'accessibility'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARIA attributes helper
 */
export interface AriaAttributes {
  role?: AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-busy'?: boolean;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-multiselectable'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  'aria-level'?: number;
  tabIndex?: number;
}

/**
 * Create standardized ARIA attributes
 */
export function createAriaAttributes(options: AriaAttributes): AriaAttributes {
  const filtered: AriaAttributes = {};
  
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      filtered[key as keyof AriaAttributes] = value;
    }
  });
  
  return filtered;
}

/**
 * Hook for managing focus trapping within a component
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const firstFocusableRef = useRef<HTMLElement>(null);
  const lastFocusableRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstFocusableRef.current = firstElement;
    lastFocusableRef.current = lastElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return { containerRef, firstFocusableRef, lastFocusableRef };
}

/**
 * Hook for keyboard navigation in lists/menus
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  items: T[],
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
    onSelect?: (item: T, index: number) => void;
    onEscape?: () => void;
  } = {}
) {
  const { loop = true, orientation = 'vertical', onSelect, onEscape } = options;
  const [currentIndex, setCurrentIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? KEYBOARD_KEYS.ARROW_DOWN : KEYBOARD_KEYS.ARROW_RIGHT;
    const prevKey = isVertical ? KEYBOARD_KEYS.ARROW_UP : KEYBOARD_KEYS.ARROW_LEFT;

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= items.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
        break;

      case prevKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev - 1;
          if (next < 0) {
            return loop ? items.length - 1 : prev;
          }
          return next;
        });
        break;

      case KEYBOARD_KEYS.HOME:
        e.preventDefault();
        setCurrentIndex(0);
        break;

      case KEYBOARD_KEYS.END:
        e.preventDefault();
        setCurrentIndex(items.length - 1);
        break;

      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        e.preventDefault();
        if (currentIndex >= 0 && items[currentIndex] && onSelect) {
          onSelect(items[currentIndex], currentIndex);
        }
        break;

      case KEYBOARD_KEYS.ESCAPE:
        e.preventDefault();
        onEscape?.();
        break;
    }
  }, [items, currentIndex, loop, orientation, onSelect, onEscape]);

  useEffect(() => {
    if (currentIndex >= 0 && items[currentIndex]) {
      items[currentIndex].focus();
    }
  }, [currentIndex, items]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown
  };
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null);

  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#footer', label: 'Skip to footer' }
  ];

  const handleSkipLinkFocus = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('skip-link')) {
      target.style.transform = 'translateY(0)';
    }
  }, []);

  const handleSkipLinkBlur = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('skip-link')) {
      target.style.transform = 'translateY(-100%)';
    }
  }, []);

  useEffect(() => {
    const container = skipLinksRef.current;
    if (!container) return;

    const links = container.querySelectorAll('.skip-link');
    links.forEach(link => {
      link.addEventListener('focus', handleSkipLinkFocus);
      link.addEventListener('blur', handleSkipLinkBlur);
    });

    return () => {
      links.forEach(link => {
        link.removeEventListener('focus', handleSkipLinkFocus);
        link.removeEventListener('blur', handleSkipLinkBlur);
      });
    };
  }, [handleSkipLinkFocus, handleSkipLinkBlur]);

  return { skipLinksRef, skipLinks };
}

/**
 * Hook for announcing screen reader messages
 */
export function useScreenReader() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;

    const announcer = announceRef.current;
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }, []);

  const ScreenReaderAnnouncer = () => (
    <div
      ref={announceRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    />
  );

  return { announce, ScreenReaderAnnouncer };
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for managing high contrast preferences
 */
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = () => setPrefersHighContrast(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

/**
 * Accessibility CSS classes
 */
export const a11yClasses = {
  // Screen reader only
  srOnly: 'sr-only',
  
  // Focus management
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  focusWithin: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
  
  // Skip links
  skipLink: 'skip-link absolute -top-10 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded transform -translate-y-full transition-transform focus:translate-y-0',
  
  // High contrast support
  highContrast: 'contrast-more:border-black contrast-more:text-black contrast-more:bg-white',
  
  // Reduced motion
  reduceMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
  
  // Interactive elements
  interactive: 'cursor-pointer select-none touch-manipulation',
  
  // Loading states
  loading: 'cursor-wait pointer-events-none opacity-50',
  
  // Error states
  error: 'border-red-500 text-red-900 bg-red-50',
  
  // Success states
  success: 'border-green-500 text-green-900 bg-green-50'
};

/**
 * ARIA live region utilities
 */
export const liveRegions = {
  status: {
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-atomic': true
  },
  alert: {
    role: 'alert' as const,
    'aria-live': 'assertive' as const,
    'aria-atomic': true
  },
  log: {
    role: 'log' as const,
    'aria-live': 'polite' as const,
    'aria-atomic': false
  }
};

/**
 * Common ARIA patterns
 */
export const ariaPatterns = {
  button: (label: string, options: { expanded?: boolean; controls?: string; disabled?: boolean } = {}) => ({
    role: 'button' as const,
    'aria-label': label,
    'aria-expanded': options.expanded,
    'aria-controls': options.controls,
    'aria-disabled': options.disabled,
    tabIndex: options.disabled ? -1 : 0
  }),

  link: (label: string, options: { current?: boolean; external?: boolean } = {}) => ({
    'aria-label': label,
    'aria-current': options.current ? 'page' as const : undefined,
    ...(options.external && { target: '_blank', rel: 'noopener noreferrer' })
  }),

  dialog: (labelId: string, options: { modal?: boolean } = {}) => ({
    role: 'dialog' as const,
    'aria-labelledby': labelId,
    'aria-modal': options.modal,
    tabIndex: -1
  }),

  form: (labelId: string, options: { invalid?: boolean; required?: boolean } = {}) => ({
    role: 'form' as const,
    'aria-labelledby': labelId,
    'aria-invalid': options.invalid,
    'aria-required': options.required
  }),

  menu: (labelId: string, options: { orientation?: 'horizontal' | 'vertical' } = {}) => ({
    role: 'menu' as const,
    'aria-labelledby': labelId,
    'aria-orientation': options.orientation || 'vertical'
  }),

  menuitem: (label: string, options: { selected?: boolean; disabled?: boolean } = {}) => ({
    role: 'menuitem' as const,
    'aria-label': label,
    'aria-selected': options.selected,
    'aria-disabled': options.disabled,
    tabIndex: options.disabled ? -1 : 0
  }),

  tab: (label: string, options: { selected?: boolean; controls?: string } = {}) => ({
    role: 'tab' as const,
    'aria-label': label,
    'aria-selected': options.selected,
    'aria-controls': options.controls,
    tabIndex: options.selected ? 0 : -1
  }),

  tabpanel: (labelId: string) => ({
    role: 'tabpanel' as const,
    'aria-labelledby': labelId,
    tabIndex: 0
  }),

  grid: (label: string, options: { readonly?: boolean; multiselectable?: boolean } = {}) => ({
    role: 'grid' as const,
    'aria-label': label,
    'aria-readonly': options.readonly,
    'aria-multiselectable': options.multiselectable
  }),

  gridcell: (options: { selected?: boolean; readonly?: boolean } = {}) => ({
    role: 'gridcell' as const,
    'aria-selected': options.selected,
    'aria-readonly': options.readonly,
    tabIndex: options.selected ? 0 : -1
  })
};

/**
 * Validation for accessibility requirements
 */
export function validateAccessibility(element: HTMLElement): string[] {
  const errors: string[] = [];

  // Check for missing alt text on images
  const images = element.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      errors.push(`Image at index ${index} is missing alt text`);
    }
  });

  // Check for buttons without accessible names
  const buttons = element.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const hasAccessibleName = 
      button.textContent?.trim() ||
      button.getAttribute('aria-label') ||
      button.getAttribute('aria-labelledby');
    
    if (!hasAccessibleName) {
      errors.push(`Button at index ${index} is missing an accessible name`);
    }
  });

  // Check for form inputs without labels
  const inputs = element.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const hasLabel = 
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby') ||
      element.querySelector(`label[for="${input.id}"]`);
    
    if (!hasLabel) {
      errors.push(`Form input at index ${index} is missing a label`);
    }
  });

  // Check for proper heading structure
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (level > lastLevel + 1 && lastLevel !== 0) {
      errors.push(`Heading level jumps from h${lastLevel} to h${level} at index ${index}`);
    }
    lastLevel = level;
  });

  return errors;
}