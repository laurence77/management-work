/**
 * Accessible Modal Component
 * Modal dialog with comprehensive accessibility features
 */

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useFocusTrap, 
  useScreenReader, 
  generateId, 
  createAriaAttributes, 
  a11yClasses,
  KEYBOARD_KEYS
} from '@/utils/accessibility-utils';
import { AccessibleButton, IconButton } from './accessible-button';

interface AccessibleModalProps {
  // Basic modal props
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  
  // Accessibility props
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  // Enhanced functionality
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  preventBodyScroll?: boolean;
  
  // Focus management
  initialFocus?: React.RefObject<HTMLElement>;
  restoreFocus?: boolean;
  
  // Advanced options
  role?: 'dialog' | 'alertdialog';
  modal?: boolean;
  
  // Custom styling
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
}

export function AccessibleModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  preventBodyScroll = true,
  initialFocus,
  restoreFocus = true,
  role = 'dialog',
  modal = true,
  className,
  overlayClassName,
  contentClassName
}: AccessibleModalProps) {
  const titleId = generateId('modal-title');
  const descriptionId = generateId('modal-description');
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  
  const { containerRef } = useFocusTrap(open);
  const { announce } = useScreenReader();

  // Store previously focused element
  useEffect(() => {
    if (open) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Announce modal opening
      announce(`${title} dialog opened`, 'assertive');
      
      // Prevent body scroll
      if (preventBodyScroll) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      // Restore focus and body scroll
      if (restoreFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
      
      if (preventBodyScroll) {
        document.body.style.overflow = '';
      }
      
      announce(`${title} dialog closed`, 'polite');
    }

    return () => {
      if (preventBodyScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [open, title, announce, preventBodyScroll, restoreFocus]);

  // Handle keyboard events
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_KEYS.ESCAPE && closeOnEscape) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onOpenChange]);

  // Focus management
  useEffect(() => {
    if (open && contentRef.current) {
      const focusTarget = initialFocus?.current || contentRef.current;
      
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        focusTarget.focus();
      }, 100);
    }
  }, [open, initialFocus]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full min-h-screen'
  };

  const ariaAttributes = createAriaAttributes({
    role,
    'aria-labelledby': titleId,
    'aria-describedby': description ? descriptionId : undefined,
    'aria-modal': modal,
    tabIndex: -1
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={(el) => {
          contentRef.current = el;
          if (containerRef) {
            containerRef.current = el;
          }
        }}
        className={cn(
          // Base styles
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          'bg-black/50 backdrop-blur-sm',
          a11yClasses.focusVisible,
          overlayClassName
        )}
        onClick={handleOverlayClick}
        {...ariaAttributes}
      >
        <div
          className={cn(
            // Content container
            'relative w-full rounded-lg bg-white shadow-lg',
            'max-h-[90vh] overflow-hidden',
            sizeClasses[size],
            a11yClasses.highContrast,
            contentClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <DialogHeader className="flex items-center justify-between p-6 border-b">
            <div className="flex-1 min-w-0">
              <DialogTitle 
                id={titleId}
                className="text-lg font-semibold text-gray-900 pr-8"
              >
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription 
                  id={descriptionId}
                  className="mt-1 text-sm text-gray-600"
                >
                  {description}
                </DialogDescription>
              )}
            </div>
            
            {showCloseButton && (
              <IconButton
                icon={<X className="h-4 w-4" />}
                onClick={handleClose}
                variant="ghost"
                className="absolute top-4 right-4"
                aria-label={`Close ${title} dialog`}
              />
            )}
          </DialogHeader>

          {/* Content */}
          <div className={cn(
            'p-6 overflow-y-auto',
            'max-h-[calc(90vh-120px)]', // Account for header
            className
          )}>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Confirmation Modal - Accessible confirmation dialog
 */
interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false
}: ConfirmationModalProps) {
  
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AccessibleModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={message}
      role="alertdialog"
      size="sm"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <AccessibleButton
            variant="outline"
            onClick={handleCancel}
            className="sm:w-auto w-full"
          >
            {cancelLabel}
          </AccessibleButton>
          
          <AccessibleButton
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className="sm:w-auto w-full"
            autoFocus
          >
            {confirmLabel}
          </AccessibleButton>
        </div>
      </div>
    </AccessibleModal>
  );
}

/**
 * Form Modal - Modal optimized for forms
 */
interface FormModalProps extends Omit<AccessibleModalProps, 'children'> {
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitting?: boolean;
  formId?: string;
}

export function FormModal({
  children,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
  submitting = false,
  formId,
  ...modalProps
}: FormModalProps) {
  
  const handleCancel = () => {
    onCancel?.();
    modalProps.onOpenChange(false);
  };

  return (
    <AccessibleModal {...modalProps}>
      <div className="space-y-6">
        {children}
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
          <AccessibleButton
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
            className="sm:w-auto w-full"
          >
            {cancelLabel}
          </AccessibleButton>
          
          <AccessibleButton
            type={formId ? 'submit' : 'button'}
            form={formId}
            onClick={formId ? undefined : onSubmit}
            loading={submitting}
            loadingText="Submitting..."
            className="sm:w-auto w-full"
          >
            {submitLabel}
          </AccessibleButton>
        </div>
      </div>
    </AccessibleModal>
  );
}