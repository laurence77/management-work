/**
 * Tests for Offline Booking Form Component
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render, mockFunctions, formHelpers } from '@/utils/test-utils';
import { OfflineBookingForm } from '@/components/offline-booking-form';
import { offlineStorage } from '@/utils/offline-storage';
import { useOfflineStatus } from '@/hooks/usePWA';

// Mock dependencies
jest.mock('@/utils/offline-storage');
jest.mock('@/hooks/usePWA');

const mockOfflineStorage = offlineStorage as jest.Mocked<typeof offlineStorage>;
const mockUseOfflineStatus = useOfflineStatus as jest.MockedFunction<typeof useOfflineStatus>;

describe('OfflineBookingForm', () => {
  const defaultProps = {
    onSubmit: mockFunctions.onSubmit,
    onCancel: mockFunctions.onCancel
  };

  const mockCelebrity = {
    id: 'celebrity-1',
    name: 'Famous Actor',
    category: 'Actor',
    description: 'Award-winning actor',
    profileImage: 'actor.jpg',
    availability: true,
    basePrice: 15000,
    services: ['meet-and-greet', 'video-message'],
    tags: ['movies', 'entertainment']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseOfflineStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
      resetOfflineStatus: jest.fn()
    });

    mockOfflineStorage.storeBooking.mockResolvedValue('booking-123');
    mockOfflineStorage.getCachedCelebrities.mockResolvedValue([
      { id: 'celebrity-1', data: mockCelebrity }
    ]);
  });

  describe('Form Rendering', () => {
    test('renders booking form with all fields', () => {
      render(<OfflineBookingForm {...defaultProps} />);

      expect(screen.getByLabelText(/celebrity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    });

    test('renders with preselected celebrity', async () => {
      render(
        <OfflineBookingForm 
          {...defaultProps} 
          preselectedCelebrity={mockCelebrity}
        />
      );

      await waitFor(() => {
        const celebritySelect = screen.getByDisplayValue('Famous Actor');
        expect(celebritySelect).toBeInTheDocument();
      });
    });

    test('shows offline indicator', () => {
      render(<OfflineBookingForm {...defaultProps} />);

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
    });

    test('loads cached celebrities for selection', async () => {
      render(<OfflineBookingForm {...defaultProps} />);

      await waitFor(() => {
        const celebritySelect = screen.getByLabelText(/celebrity/i);
        expect(celebritySelect).toBeInTheDocument();
      });

      expect(mockOfflineStorage.getCachedCelebrities).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    test('validates required fields', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/celebrity is required/i)).toBeInTheDocument();
        expect(screen.getByText(/service is required/i)).toBeInTheDocument();
        expect(screen.getByText(/event date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    test('validates phone number format', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '123');

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
      });
    });

    test('validates future event date', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dateInput = screen.getByLabelText(/event date/i);
      await user.type(dateInput, yesterday.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/future date/i)).toBeInTheDocument();
      });
    });

    test('validates minimum duration', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const durationInput = screen.getByLabelText(/duration/i);
      await user.clear(durationInput);
      await user.type(durationInput, '0');

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 1 hour/i)).toBeInTheDocument();
      });
    });
  });

  describe('Service Selection', () => {
    test('updates services when celebrity changes', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await waitFor(() => {
        const celebritySelect = screen.getByLabelText(/celebrity/i);
        expect(celebritySelect).toBeInTheDocument();
      });

      const celebritySelect = screen.getByLabelText(/celebrity/i);
      await user.selectOptions(celebritySelect, 'celebrity-1');

      await waitFor(() => {
        const serviceSelect = screen.getByLabelText(/service/i);
        expect(serviceSelect).toBeInTheDocument();
        expect(screen.getByText('Meet and Greet')).toBeInTheDocument();
        expect(screen.getByText('Video Message')).toBeInTheDocument();
      });
    });

    test('updates pricing when service changes', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await waitFor(() => {
        const celebritySelect = screen.getByLabelText(/celebrity/i);
        expect(celebritySelect).toBeInTheDocument();
      });

      const celebritySelect = screen.getByLabelText(/celebrity/i);
      await user.selectOptions(celebritySelect, 'celebrity-1');

      await waitFor(() => {
        const serviceSelect = screen.getByLabelText(/service/i);
        expect(serviceSelect).toBeInTheDocument();
      });

      const serviceSelect = screen.getByLabelText(/service/i);
      await user.selectOptions(serviceSelect, 'meet-and-greet');

      await waitFor(() => {
        expect(screen.getByText(/\$15,000/)).toBeInTheDocument();
      });
    });

    test('calculates total with additional fees', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      // Fill in required fields to show pricing
      await formHelpers.fillBookingForm(user, {
        celebrity: 'celebrity-1',
        service: 'meet-and-greet',
        duration: '2'
      });

      await waitFor(() => {
        expect(screen.getByText(/base price/i)).toBeInTheDocument();
        expect(screen.getByText(/additional fees/i)).toBeInTheDocument();
        expect(screen.getByText(/total/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('saves booking to offline storage', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await formHelpers.fillBookingForm(user, {
        celebrity: 'celebrity-1',
        service: 'meet-and-greet',
        eventDate: '2024-12-25',
        clientName: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        location: 'Los Angeles, CA',
        duration: '2'
      });

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOfflineStorage.storeBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            celebrityId: 'celebrity-1',
            serviceId: 'meet-and-greet',
            eventDate: expect.any(String),
            clientInfo: expect.objectContaining({
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1-555-123-4567'
            })
          })
        );
      });
    });

    test('calls onSubmit callback with booking ID', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await formHelpers.fillBookingForm(user, {
        celebrity: 'celebrity-1',
        service: 'meet-and-greet',
        eventDate: '2024-12-25',
        clientName: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        location: 'Los Angeles, CA',
        duration: '2'
      });

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFunctions.onSubmit).toHaveBeenCalledWith('booking-123');
      });
    });

    test('shows loading state during submission', async () => {
      mockOfflineStorage.storeBooking.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('booking-123'), 100))
      );

      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await formHelpers.fillBookingForm(user, {
        celebrity: 'celebrity-1',
        service: 'meet-and-greet',
        eventDate: '2024-12-25',
        clientName: 'John Doe',
        email: 'john@example.com'
      });

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockFunctions.onSubmit).toHaveBeenCalled();
      });
    });

    test('handles submission errors', async () => {
      mockOfflineStorage.storeBooking.mockRejectedValue(new Error('Storage failed'));

      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await formHelpers.fillBookingForm(user, {
        celebrity: 'celebrity-1',
        service: 'meet-and-greet',
        eventDate: '2024-12-25',
        clientName: 'John Doe',
        email: 'john@example.com'
      });

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });

      expect(mockFunctions.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Controls', () => {
    test('handles cancel action', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockFunctions.onCancel).toHaveBeenCalledTimes(1);
    });

    test('shows unsaved changes warning', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/client name/i);
      await user.type(nameInput, 'John Doe');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    test('resets form when reset button clicked', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} showResetButton={true} />);

      const nameInput = screen.getByLabelText(/client name/i);
      await user.type(nameInput, 'John Doe');

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      expect(nameInput).toHaveValue('');
    });
  });

  describe('Auto-save Functionality', () => {
    test('auto-saves form data periodically', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} autoSave={true} />);

      const nameInput = screen.getByLabelText(/client name/i);
      await user.type(nameInput, 'John Doe');

      // Wait for auto-save delay
      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('restores auto-saved data on mount', async () => {
      // Mock auto-saved data in localStorage
      const savedData = {
        clientInfo: { name: 'John Doe', email: 'john@example.com' },
        eventDetails: { location: 'LA' }
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => JSON.stringify(savedData)),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      render(<OfflineBookingForm {...defaultProps} autoSave={true} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('LA')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels and associations', () => {
      render(<OfflineBookingForm {...defaultProps} />);

      expect(screen.getByLabelText(/celebrity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    test('shows validation errors with proper ARIA attributes', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /save booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/client name/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        expect(nameInput).toHaveAttribute('aria-describedby');
      });
    });

    test('supports keyboard navigation', async () => {
      const { user } = render(<OfflineBookingForm {...defaultProps} />);

      await user.tab(); // Celebrity select
      await user.tab(); // Service select
      await user.tab(); // Event date
      await user.tab(); // Client name
      await user.tab(); // Email
      await user.tab(); // Phone

      const phoneInput = screen.getByLabelText(/phone/i);
      expect(phoneInput).toHaveFocus();
    });

    test('announces form status to screen readers', async () => {
      render(<OfflineBookingForm {...defaultProps} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent(/offline mode/i);
    });
  });

  describe('Online Mode Detection', () => {
    test('shows online mode indicator when online', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        wasOffline: false,
        resetOfflineStatus: jest.fn()
      });

      render(<OfflineBookingForm {...defaultProps} />);

      expect(screen.getByText(/online mode/i)).toBeInTheDocument();
      expect(screen.queryByText(/saved locally/i)).not.toBeInTheDocument();
    });

    test('disables form when offline storage not supported', () => {
      mockOfflineStorage.storeBooking.mockRejectedValue(new Error('Not supported'));

      render(<OfflineBookingForm {...defaultProps} />);

      expect(screen.getByText(/offline storage not available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save booking/i })).toBeDisabled();
    });
  });
});