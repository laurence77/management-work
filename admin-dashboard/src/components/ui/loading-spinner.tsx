import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export const LoadingSpinner = ({ 
  size = 'md', 
  className, 
  text 
}: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size],
          className
        )}
      />
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export const LoadingSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <LoadingSkeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <LoadingSkeleton className="h-3 w-full" />
        <LoadingSkeleton className="h-3 w-4/5" />
        <LoadingSkeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded">
          <LoadingSkeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-3 w-1/6" />
          </div>
          <LoadingSkeleton className="h-4 w-1/8" />
          <LoadingSkeleton className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
};