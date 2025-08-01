import { toast } from "@/hooks/use-toast";

/**
 * Secure toast notification helpers
 * These functions sanitize messages to prevent XSS vulnerabilities
 */

// Sanitize text content to prevent XSS
const sanitizeMessage = (message: string): string => {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }
  
  // Remove HTML tags and limit length
  return message
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .substring(0, 200) // Limit message length
    .trim();
};

// Success notifications
export const showSuccess = (message: string, title?: string) => {
  toast({
    title: title ? sanitizeMessage(title) : "Success",
    description: sanitizeMessage(message),
    variant: "default",
  });
};

// Error notifications
export const showError = (message: string, title?: string) => {
  // For error messages, use generic message if potentially unsafe
  const safeMessage = message.includes('<') || message.includes('>') 
    ? 'An error occurred. Please try again.' 
    : sanitizeMessage(message);
    
  toast({
    title: title ? sanitizeMessage(title) : "Error",
    description: safeMessage,
    variant: "destructive",
  });
};

// Authentication specific helpers
export const showAuthError = (error?: string) => {
  let safeMessage = 'Authentication failed. Please try again.';
  
  // Only show specific messages for known safe error types
  if (error) {
    const lowerError = error.toLowerCase();
    if (lowerError.includes('password') && lowerError.includes('match')) {
      safeMessage = 'Passwords do not match';
    } else if (lowerError.includes('invalid credentials')) {
      safeMessage = 'Invalid email or password';
    } else if (lowerError.includes('user not found')) {
      safeMessage = 'Account not found';
    } else if (lowerError.includes('email already exists')) {
      safeMessage = 'Email already registered';
    }
  }
  
  showError(safeMessage, 'Authentication Error');
};

// Network error helpers
export const showNetworkError = () => {
  showError('Network error. Please check your connection and try again.', 'Connection Error');
};

// Validation error helpers
export const showValidationError = (field: string) => {
  const safeField = sanitizeMessage(field);
  showError(`Please check your ${safeField} and try again.`, 'Validation Error');
};

// Booking specific helpers
export const showBookingSuccess = (bookingId?: string) => {
  const message = bookingId 
    ? `Booking confirmed! Reference: ${sanitizeMessage(bookingId)}`
    : 'Booking confirmed successfully!';
  showSuccess(message, 'Booking Confirmed');
};

export const showBookingError = () => {
  showError('Unable to process booking. Please try again or contact support.', 'Booking Error');
};