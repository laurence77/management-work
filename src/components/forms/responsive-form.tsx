/**
 * Responsive Form Components
 * Mobile-optimized form layouts and input components
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useScreenSize, mobileUtils, containerClasses } from '@/utils/responsive-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ResponsiveFormProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  layout?: 'card' | 'inline';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function ResponsiveForm({
  title,
  description,
  children,
  onSubmit,
  className,
  layout = 'card',
  maxWidth = 'md'
}: ResponsiveFormProps) {
  const { isMobile } = useScreenSize();

  const formClasses = cn(
    'w-full',
    {
      'max-w-sm': maxWidth === 'sm',
      'max-w-md': maxWidth === 'md',
      'max-w-lg': maxWidth === 'lg',
      'max-w-xl': maxWidth === 'xl',
      'max-w-none': maxWidth === 'full'
    },
    'mx-auto',
    className
  );

  const formContent = (
    <form onSubmit={onSubmit} className="space-y-6">
      {children}
    </form>
  );

  if (layout === 'card') {
    return (
      <div className={formClasses}>
        <Card className={cn(
          'border-0 shadow-lg',
          isMobile && 'rounded-none shadow-none border-t'
        )}>
          {(title || description) && (
            <CardHeader className={cn(
              'text-center',
              isMobile ? 'px-4 py-6' : 'px-6 py-8'
            )}>
              {title && (
                <CardTitle className={cn(
                  'text-2xl font-bold',
                  isMobile && 'text-xl'
                )}>
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className={cn(
                  'text-base mt-2',
                  isMobile && 'text-sm'
                )}>
                  {description}
                </CardDescription>
              )}
            </CardHeader>
          )}
          <CardContent className={cn(
            isMobile ? 'px-4 pb-6' : 'px-6 pb-8'
          )}>
            {formContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={formClasses}>
      {(title || description) && (
        <div className={cn(
          'text-center mb-8',
          isMobile && 'mb-6'
        )}>
          {title && (
            <h1 className={cn(
              'text-3xl font-bold text-gray-900',
              isMobile && 'text-2xl'
            )}>
              {title}
            </h1>
          )}
          {description && (
            <p className={cn(
              'text-lg text-gray-600 mt-2',
              isMobile && 'text-base'
            )}>
              {description}
            </p>
          )}
        </div>
      )}
      {formContent}
    </div>
  );
}

/**
 * Responsive Form Section - Groups related form fields
 */
interface ResponsiveFormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function ResponsiveFormSection({
  title,
  description,
  children,
  className,
  columns = 1
}: ResponsiveFormSectionProps) {
  const { isMobile } = useScreenSize();

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className={cn(
              'text-lg font-semibold text-gray-900',
              isMobile && 'text-base'
            )}>
              {title}
            </h3>
          )}
          {description && (
            <p className={cn(
              'text-sm text-gray-600 mt-1',
              isMobile && 'text-xs'
            )}>
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1 || isMobile,
          'grid-cols-1 sm:grid-cols-2': columns === 2 && !isMobile,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': columns === 3 && !isMobile
        }
      )}>
        {children}
      </div>
    </div>
  );
}

/**
 * Responsive Form Field - Enhanced form field with mobile optimization
 */
interface ResponsiveFormFieldProps {
  label: string;
  children: React.ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function ResponsiveFormField({
  label,
  children,
  description,
  error,
  required,
  className,
  fullWidth = true
}: ResponsiveFormFieldProps) {
  const { isMobile } = useScreenSize();

  return (
    <div className={cn(
      'space-y-2',
      fullWidth && 'w-full',
      className
    )}>
      <Label className={cn(
        'text-sm font-medium text-gray-900',
        isMobile && 'text-base',
        required && "after:content-['*'] after:ml-1 after:text-red-500"
      )}>
        {label}
      </Label>
      
      {description && (
        <p className={cn(
          'text-xs text-gray-600',
          isMobile && 'text-sm'
        )}>
          {description}
        </p>
      )}
      
      <div className="w-full">
        {children}
      </div>
      
      {error && (
        <p className={cn(
          'text-xs text-red-600',
          isMobile && 'text-sm'
        )}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Responsive Input - Mobile-optimized input component
 */
interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export function ResponsiveInput({
  label,
  description,
  error,
  className,
  ...props
}: ResponsiveInputProps) {
  const { isMobile } = useScreenSize();

  const input = (
    <Input
      className={cn(
        isMobile && 'h-12 text-base px-4',
        error && 'border-red-500 focus:border-red-500',
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <ResponsiveFormField
        label={label}
        description={description}
        error={error}
        required={props.required}
      >
        {input}
      </ResponsiveFormField>
    );
  }

  return input;
}

/**
 * Responsive Textarea - Mobile-optimized textarea component
 */
interface ResponsiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
}

export function ResponsiveTextarea({
  label,
  description,
  error,
  className,
  ...props
}: ResponsiveTextareaProps) {
  const { isMobile } = useScreenSize();

  const textarea = (
    <Textarea
      className={cn(
        'min-h-[100px]',
        isMobile && 'min-h-[120px] text-base px-4 py-3',
        error && 'border-red-500 focus:border-red-500',
        className
      )}
      {...props}
    />
  );

  if (label) {
    return (
      <ResponsiveFormField
        label={label}
        description={description}
        error={error}
        required={props.required}
      >
        {textarea}
      </ResponsiveFormField>
    );
  }

  return textarea;
}

/**
 * Responsive Select - Mobile-optimized select component
 */
interface ResponsiveSelectProps {
  label?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function ResponsiveSelect({
  label,
  description,
  error,
  placeholder,
  value,
  onValueChange,
  children,
  required,
  className
}: ResponsiveSelectProps) {
  const { isMobile } = useScreenSize();

  const select = (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(
        isMobile && 'h-12 text-base px-4',
        error && 'border-red-500 focus:border-red-500',
        className
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );

  if (label) {
    return (
      <ResponsiveFormField
        label={label}
        description={description}
        error={error}
        required={required}
      >
        {select}
      </ResponsiveFormField>
    );
  }

  return select;
}

/**
 * Responsive Checkbox - Mobile-optimized checkbox component
 */
interface ResponsiveCheckboxProps {
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  required?: boolean;
  className?: string;
}

export function ResponsiveCheckbox({
  label,
  description,
  checked,
  onCheckedChange,
  required,
  className
}: ResponsiveCheckboxProps) {
  const { isMobile } = useScreenSize();

  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'mt-1',
          isMobile && 'w-5 h-5'
        )}
      />
      <div className="flex-1 min-w-0">
        <Label className={cn(
          'text-sm font-medium cursor-pointer',
          isMobile && 'text-base',
          required && "after:content-['*'] after:ml-1 after:text-red-500"
        )}>
          {label}
        </Label>
        {description && (
          <p className={cn(
            'text-xs text-gray-600 mt-1',
            isMobile && 'text-sm'
          )}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Responsive Form Actions - Button group for form actions
 */
interface ResponsiveFormActionsProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'horizontal' | 'vertical' | 'auto';
  align?: 'left' | 'center' | 'right';
}

export function ResponsiveFormActions({
  children,
  className,
  layout = 'auto',
  align = 'right'
}: ResponsiveFormActionsProps) {
  const { isMobile } = useScreenSize();

  const effectiveLayout = layout === 'auto' 
    ? (isMobile ? 'vertical' : 'horizontal')
    : layout;

  return (
    <div className={cn(
      'pt-6 border-t border-gray-200',
      {
        'flex flex-col space-y-3': effectiveLayout === 'vertical',
        'flex space-x-3': effectiveLayout === 'horizontal',
        'justify-start': align === 'left',
        'justify-center': align === 'center',
        'justify-end': align === 'right'
      },
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive Submit Button - Mobile-optimized submit button
 */
interface ResponsiveSubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
}

export function ResponsiveSubmitButton({
  children,
  loading,
  disabled,
  variant = 'default',
  className
}: ResponsiveSubmitButtonProps) {
  const { isMobile } = useScreenSize();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={disabled || loading}
      className={cn(
        'font-medium',
        isMobile && 'w-full h-12 text-base',
        !isMobile && 'px-8',
        className
      )}
    >
      {loading ? 'Processing...' : children}
    </Button>
  );
}