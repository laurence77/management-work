import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6", 
        lg: "h-8 w-8",
        xl: "h-12 w-12"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, text, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn("flex flex-col items-center justify-center", className)}
        {...props}
      >
        <div className={cn(spinnerVariants({ size }))} />
        {text && (
          <span className="mt-2 text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner, spinnerVariants };