import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

interface MobileCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

interface MobileCardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileCardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileCardActionsProps {
  children: React.ReactNode;
  className?: string;
}

const MobileCard: React.FC<MobileCardProps> = ({ 
  children, 
  className, 
  onClick, 
  hoverable = false 
}) => {
  const cardClasses = cn(
    'mobile-card',
    hoverable && 'cursor-pointer hover:bg-white/[0.08] hover:border-white/20 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200',
    onClick && 'cursor-pointer',
    className
  );

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  );
};

const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({ 
  children, 
  className, 
  icon: Icon, 
  action 
}) => {
  return (
    <div className={cn('mobile-card-header', className)}>
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

const MobileCardTitle: React.FC<MobileCardTitleProps> = ({ children, className }) => {
  return (
    <h3 className={cn('mobile-card-title', className)}>
      {children}
    </h3>
  );
};

const MobileCardContent: React.FC<MobileCardContentProps> = ({ children, className }) => {
  return (
    <div className={cn('mobile-card-content', className)}>
      {children}
    </div>
  );
};

const MobileCardFooter: React.FC<MobileCardFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('pt-4 border-t border-border', className)}>
      {children}
    </div>
  );
};

const MobileCardActions: React.FC<MobileCardActionsProps> = ({ children, className }) => {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-2 sm:gap-3', className)}>
      {children}
    </div>
  );
};

// Quick Card Components for common patterns
interface QuickCardProps {
  title: string;
  description?: string;
  value?: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

const QuickStatCard: React.FC<QuickCardProps> = ({
  title,
  description,
  value,
  icon: Icon,
  trend,
  onClick,
  className
}) => {
  return (
    <MobileCard onClick={onClick} hoverable={!!onClick} className={className}>
      <MobileCardHeader icon={Icon}>
        <div>
          <MobileCardTitle className="text-sm text-muted-foreground">
            {title}
          </MobileCardTitle>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </MobileCardHeader>
      
      <MobileCardContent>
        <div className="flex items-end justify-between">
          <div className="text-2xl sm:text-3xl font-bold text-foreground">
            {value}
          </div>
          {trend && (
            <div className={cn(
              'text-xs font-medium flex items-center',
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </MobileCardContent>
    </MobileCard>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  primaryAction,
  secondaryAction,
  className
}) => {
  return (
    <MobileCard className={className}>
      <MobileCardHeader icon={Icon}>
        <MobileCardTitle>{title}</MobileCardTitle>
      </MobileCardHeader>
      
      <MobileCardContent>
        <p className="mobile-text text-muted-foreground">{description}</p>
      </MobileCardContent>
      
      <MobileCardFooter>
        <MobileCardActions>
          <button
            onClick={primaryAction.onClick}
            className="btn-luxury w-full sm:w-auto text-center"
          >
            {primaryAction.label}
          </button>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="btn-glass w-full sm:w-auto text-center"
            >
              {secondaryAction.label}
            </button>
          )}
        </MobileCardActions>
      </MobileCardFooter>
    </MobileCard>
  );
};

export {
  MobileCard,
  MobileCardHeader,
  MobileCardTitle,
  MobileCardContent,
  MobileCardFooter,
  MobileCardActions,
  QuickStatCard,
  ActionCard
};