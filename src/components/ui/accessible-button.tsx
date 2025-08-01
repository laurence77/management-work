/**
 * Accessible Button Component
 * Enhanced button with comprehensive accessibility features
 */

import React, { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createAriaAttributes, ariaPatterns, a11yClasses, KEYBOARD_KEYS } from '@/utils/accessibility-utils';
import { Loader2 } from 'lucide-react';

interface AccessibleButtonProps extends Omit<ButtonProps, 'aria-label'> {
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  
  // Enhanced functionality
  loading?: boolean;
  loadingText?: string;
  tooltip?: string;
  confirmAction?: boolean;
  confirmMessage?: string;
  
  // Keyboard navigation
  onKeyDown?: (e: React.KeyboardEvent) => void;
  
  // Icon support
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  
  // Advanced accessibility
  role?: 'button' | 'menuitem' | 'tab' | 'link';
  pressed?: boolean;
  selected?: boolean;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    className,
    disabled,
    loading = false,
    loadingText = 'Loading...',
    tooltip,
    confirmAction = false,
    confirmMessage = 'Are you sure?',
    onKeyDown,
    onClick,
    icon,
    iconPosition = 'left',
    role = 'button',
    pressed,
    selected,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    'aria-haspopup': ariaHaspopup,
    ...props
  }, ref) => {
    
    const isDisabled = disabled || loading;
    
    // Generate ARIA attributes
    const ariaAttributes = createAriaAttributes({
      role,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedby,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'aria-haspopup': ariaHaspopup,
      'aria-pressed': pressed,
      'aria-selected': selected,
      'aria-disabled': isDisabled,
      'aria-busy': loading,
      tabIndex: isDisabled ? -1 : 0
    });

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }

      if (confirmAction) {
        if (window.confirm(confirmMessage)) {
          onClick?.(e);
        }
      } else {
        onClick?.(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Handle keyboard activation
      if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
        e.preventDefault();
        if (!isDisabled) {
          const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          });
          e.currentTarget.dispatchEvent(mouseEvent);
        }
      }

      // Call custom keydown handler
      onKeyDown?.(e);
    };

    const buttonContent = () => {
      if (loading) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {loadingText}
          </>
        );
      }

      if (icon && iconPosition === 'left') {
        return (
          <>
            <span className="mr-2" aria-hidden="true">{icon}</span>
            {children}
          </>
        );
      }

      if (icon && iconPosition === 'right') {
        return (
          <>
            {children}
            <span className="ml-2" aria-hidden="true">{icon}</span>
          </>
        );
      }

      return children;
    };

    return (
      <Button
        ref={ref}
        className={cn(
          // Base accessibility classes
          a11yClasses.focusVisible,
          a11yClasses.interactive,
          a11yClasses.reduceMotion,
          
          // Loading state
          loading && a11yClasses.loading,
          
          // High contrast support
          a11yClasses.highContrast,
          
          // Custom styles
          className
        )}
        disabled={isDisabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={tooltip}
        {...ariaAttributes}
        {...props}
      >
        {buttonContent()}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

/**
 * Icon Button - Accessible button with only an icon
 */
interface IconButtonProps extends Omit<AccessibleButtonProps, 'children' | 'icon'> {
  icon: React.ReactNode;
  'aria-label': string; // Required for icon-only buttons
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <AccessibleButton
        ref={ref}
        className={cn('p-2 aspect-square', className)}
        {...props}
      >
        <span aria-hidden="true">{icon}</span>
      </AccessibleButton>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * Toggle Button - Accessible button with pressed state
 */
interface ToggleButtonProps extends Omit<AccessibleButtonProps, 'pressed'> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  pressedLabel?: string;
  unpressedLabel?: string;
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ 
    pressed, 
    onPressedChange, 
    pressedLabel = 'Active',
    unpressedLabel = 'Inactive',
    onClick,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onPressedChange(!pressed);
      onClick?.(e);
    };

    return (
      <AccessibleButton
        ref={ref}
        pressed={pressed}
        aria-label={ariaLabel || (pressed ? pressedLabel : unpressedLabel)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = 'ToggleButton';

/**
 * Menu Button - Accessible button that opens a menu
 */
interface MenuButtonProps extends Omit<AccessibleButtonProps, 'aria-haspopup' | 'aria-expanded'> {
  menuOpen: boolean;
  menuId?: string;
}

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ menuOpen, menuId, ...props }, ref) => {
    return (
      <AccessibleButton
        ref={ref}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        {...props}
      />
    );
  }
);

MenuButton.displayName = 'MenuButton';

/**
 * Link Button - Button that behaves like a link
 */
interface LinkButtonProps extends Omit<AccessibleButtonProps, 'role'> {
  href?: string;
  external?: boolean;
}

export const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ href, external = false, onClick, ...props }, ref) => {
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (href) {
        if (external) {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = href;
        }
      }
      onClick?.(e);
    };

    return (
      <AccessibleButton
        ref={ref}
        role="link"
        onClick={handleClick}
        {...props}
      />
    );
  }
);

LinkButton.displayName = 'LinkButton';