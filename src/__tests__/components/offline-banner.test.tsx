/**
 * Tests for Offline Banner Component
 */

import React from 'react';
import { screen, act, waitFor } from '@testing-library/react';
import { render, mockFunctions } from '@/utils/test-utils';
import { OfflineBanner } from '@/components/offline-banner';
import { useOfflineStatus } from '@/hooks/usePWA';

// Mock the PWA hook
jest.mock('@/hooks/usePWA');
const mockUseOfflineStatus = useOfflineStatus as jest.MockedFunction<typeof useOfflineStatus>;

describe('OfflineBanner', () => {
  const defaultOfflineStatus = {
    isOnline: true,
    isOffline: false,
    wasOffline: false,
    resetOfflineStatus: mockFunctions.resetOfflineStatus
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOfflineStatus.mockReturnValue(defaultOfflineStatus);
  });

  describe('Online State', () => {
    test('does not render when online', () => {
      render(<OfflineBanner />);

      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('shows connection restored message when coming back online', () => {
      mockUseOfflineStatus.mockReturnValue({
        ...defaultOfflineStatus,
        wasOffline: true
      });

      render(<OfflineBanner />);

      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('auto-hides connection restored message after timeout', async () => {
      mockUseOfflineStatus.mockReturnValue({
        ...defaultOfflineStatus,
        wasOffline: true
      });

      render(<OfflineBanner autoHideDelay={1000} />);

      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockFunctions.resetOfflineStatus).toHaveBeenCalled();
    });
  });

  describe('Offline State', () => {
    beforeEach(() => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });
    });

    test('renders offline banner when offline', () => {
      render(<OfflineBanner />);

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('shows default offline message', () => {
      render(<OfflineBanner />);

      expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument();
      expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument();
    });

    test('shows custom offline message', () => {
      render(
        <OfflineBanner 
          offlineMessage="Custom offline message"
          offlineDescription="Custom description"
        />
      );

      expect(screen.getByText('Custom offline message')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });

    test('applies offline styling', () => {
      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('bg-red-50');
      expect(banner).toHaveClass('border-red-200');
      expect(banner).toHaveClass('text-red-800');
    });

    test('shows offline icon', () => {
      render(<OfflineBanner />);

      const icon = screen.getByTestId('offline-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Connection Restored State', () => {
    beforeEach(() => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        wasOffline: true,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });
    });

    test('shows default connection restored message', () => {
      render(<OfflineBanner />);

      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      expect(screen.getByText(/you are back online/i)).toBeInTheDocument();
    });

    test('shows custom connection restored message', () => {
      render(
        <OfflineBanner 
          onlineMessage="Custom online message"
          onlineDescription="Custom online description"
        />
      );

      expect(screen.getByText('Custom online message')).toBeInTheDocument();
      expect(screen.getByText('Custom online description')).toBeInTheDocument();
    });

    test('applies online styling', () => {
      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('bg-green-50');
      expect(banner).toHaveClass('border-green-200');
      expect(banner).toHaveClass('text-green-800');
    });

    test('shows online icon', () => {
      render(<OfflineBanner />);

      const icon = screen.getByTestId('online-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Dismissible Behavior', () => {
    test('shows dismiss button when dismissible', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner dismissible={true} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    test('hides dismiss button when not dismissible', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner dismissible={false} />);

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    test('dismisses banner when dismiss button clicked', async () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      const { user } = render(<OfflineBanner dismissible={true} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    test('calls onDismiss callback when provided', async () => {
      const mockOnDismiss = jest.fn();
      
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      const { user } = render(
        <OfflineBanner 
          dismissible={true} 
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Buttons', () => {
    test('renders retry action when provided', () => {
      const mockRetry = jest.fn();
      
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(
        <OfflineBanner 
          actions={[
            { label: 'Retry', onClick: mockRetry, variant: 'primary' }
          ]}
        />
      );

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      expect(retryButton).toBeInTheDocument();
    });

    test('handles action button clicks', async () => {
      const mockAction = jest.fn();
      
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      const { user } = render(
        <OfflineBanner 
          actions={[
            { label: 'Test Action', onClick: mockAction, variant: 'secondary' }
          ]}
        />
      );

      const actionButton = screen.getByRole('button', { name: 'Test Action' });
      await user.click(actionButton);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    test('renders multiple action buttons', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(
        <OfflineBanner 
          actions={[
            { label: 'Retry', onClick: jest.fn(), variant: 'primary' },
            { label: 'Settings', onClick: jest.fn(), variant: 'secondary' }
          ]}
        />
      );

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
      expect(banner).toHaveAttribute('aria-atomic', 'true');
    });

    test('uses assertive live region for urgent offline state', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner priority="assertive" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'assertive');
    });

    test('has proper focus management for dismiss button', async () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      const { user } = render(<OfflineBanner dismissible={true} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      
      await user.tab();
      expect(dismissButton).toHaveFocus();
    });

    test('supports keyboard navigation for action buttons', async () => {
      const mockAction = jest.fn();
      
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      const { user } = render(
        <OfflineBanner 
          actions={[
            { label: 'Retry', onClick: mockAction, variant: 'primary' }
          ]}
        />
      );

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      retryButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Animation and Transitions', () => {
    test('applies entrance animation classes', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner animated={true} />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('transition-all');
      expect(banner).toHaveClass('duration-300');
    });

    test('respects reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner animated={true} />);

      const banner = screen.getByRole('alert');
      expect(banner).not.toHaveClass('transition-all');
    });
  });

  describe('Custom Positioning', () => {
    test('applies top position by default', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('top-0');
    });

    test('applies bottom position when specified', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner position="bottom" />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveClass('bottom-0');
    });

    test('applies custom z-index', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        wasOffline: false,
        resetOfflineStatus: mockFunctions.resetOfflineStatus
      });

      render(<OfflineBanner zIndex={9999} />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveStyle({ zIndex: '9999' });
    });
  });
});