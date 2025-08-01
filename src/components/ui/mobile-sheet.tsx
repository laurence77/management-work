import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
  snapPoints?: string[];
  defaultSnap?: number;
}

interface MobileSheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileSheetContentProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileSheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

const MobileSheet: React.FC<MobileSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  className,
  position = 'bottom'
}) => {
  if (!isOpen) return null;

  const positionClasses = {
    bottom: 'items-end',
    top: 'items-start',
    left: 'items-center justify-start',
    right: 'items-center justify-end'
  };

  const contentClasses = {
    bottom: 'rounded-t-2xl sm:rounded-2xl w-full max-w-lg',
    top: 'rounded-b-2xl sm:rounded-2xl w-full max-w-lg',
    left: 'rounded-r-2xl sm:rounded-2xl h-full max-w-sm',
    right: 'rounded-l-2xl sm:rounded-2xl h-full max-w-sm'
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet Container */}
      <div className={cn(
        'fixed inset-0 z-50 flex',
        positionClasses[position]
      )}>
        <div className={cn(
          'mobile-modal-content',
          contentClasses[position],
          position !== 'bottom' && position !== 'top' && 'mx-0',
          className
        )}>
          {/* Handle for bottom sheets */}
          {position === 'bottom' && (
            <div className="flex justify-center p-2">
              <div className="w-8 h-1 bg-muted rounded-full" />
            </div>
          )}
          
          {/* Header */}
          {(title || description) && (
            <MobileSheetHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {title && (
                    <h2 className="mobile-subheading font-semibold text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mobile-text text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="touch-target p-2 -mr-2"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </MobileSheetHeader>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

const MobileSheetHeader: React.FC<MobileSheetHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('p-6 pb-4 border-b border-border', className)}>
      {children}
    </div>
  );
};

const MobileSheetContent: React.FC<MobileSheetContentProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('p-6 space-y-4', className)}>
      {children}
    </div>
  );
};

const MobileSheetFooter: React.FC<MobileSheetFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('p-6 pt-4 border-t border-border safe-bottom', className)}>
      {children}
    </div>
  );
};

// Specialized Sheet Components
interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
}

const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  actions
}) => {
  return (
    <MobileSheet isOpen={isOpen} onClose={onClose} title={title}>
      <MobileSheetContent>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className="w-full justify-start h-12 text-left"
            >
              {action.icon && (
                <action.icon className="h-5 w-5 mr-3" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </MobileSheetContent>
    </MobileSheet>
  );
};

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  filters: React.ReactNode;
  onApply: () => void;
  onReset: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  title = 'Filters',
  filters,
  onApply,
  onReset
}) => {
  return (
    <MobileSheet isOpen={isOpen} onClose={onClose} title={title}>
      <MobileSheetContent>
        {filters}
      </MobileSheetContent>
      
      <MobileSheetFooter>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="w-full sm:w-auto btn-luxury"
          >
            Apply Filters
          </Button>
        </div>
      </MobileSheetFooter>
    </MobileSheet>
  );
};

export {
  MobileSheet,
  MobileSheetHeader,
  MobileSheetContent,
  MobileSheetFooter,
  QuickActionSheet,
  FilterSheet
};