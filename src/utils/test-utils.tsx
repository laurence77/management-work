/**
 * Test Utilities for Celebrity Booking Platform
 * Provides testing helpers, mocks, and utilities
 */

import React from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock data generators
export const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  avatar: 'https://example.com/avatar.jpg'
};

export const mockCelebrity = {
  id: '1',
  name: 'Celebrity Name',
  category: 'Actor',
  description: 'Famous actor known for blockbuster movies',
  profileImage: 'https://example.com/celebrity.jpg',
  availability: true,
  basePrice: 10000,
  services: ['meet-and-greet', 'event-appearance'],
  tags: ['movies', 'entertainment']
};

export const mockBooking = {
  id: '1',
  celebrityId: '1',
  serviceId: 'meet-and-greet',
  eventDate: '2024-12-25T18:00:00Z',
  clientInfo: {
    name: 'John Client',
    email: 'client@example.com',
    phone: '+1-555-123-4567'
  },
  eventDetails: {
    location: 'Los Angeles, CA',
    duration: 2,
    eventType: 'Private Meeting',
    guestCount: 10,
    requirements: ['Security', 'Photography'],
    specialRequests: 'Meet at venue early',
    cateringNeeded: false,
    transportNeeded: true,
    accommodationNeeded: false
  },
  pricing: {
    basePrice: 10000,
    additionalFees: 1500,
    total: 11500
  },
  status: 'confirmed' as const
};

export const mockContactForm = {
  id: '1',
  name: 'Contact Person',
  email: 'contact@example.com',
  phone: '+1-555-987-6543',
  subject: 'Booking Inquiry',
  message: 'I would like to book a celebrity for my event.',
  type: 'booking' as const
};

// Mock functions
export const mockFunctions = {
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  onClick: jest.fn(),
  onChange: jest.fn(),
  onSelect: jest.fn(),
  onClose: jest.fn(),
  onOpen: jest.fn(),
  onLogin: jest.fn(),
  onLogout: jest.fn(),
  onSearch: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  Object.values(mockFunctions).forEach(fn => fn.mockReset());
});

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    }),
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// Accessibility testing helpers
export const accessibilityHelpers = {
  // Check for required ARIA attributes
  expectAriaLabel: (element: HTMLElement, label: string) => {
    expect(element).toHaveAttribute('aria-label', label);
  },

  expectAriaLabelledBy: (element: HTMLElement, labelId: string) => {
    expect(element).toHaveAttribute('aria-labelledby', labelId);
  },

  expectAriaDescribedBy: (element: HTMLElement, descriptionId: string) => {
    expect(element).toHaveAttribute('aria-describedby', descriptionId);
  },

  // Check for proper focus management
  expectFocusable: (element: HTMLElement) => {
    expect(element).toHaveAttribute('tabindex');
    expect(element.tabIndex).toBeGreaterThanOrEqual(0);
  },

  expectNotFocusable: (element: HTMLElement) => {
    expect(element.tabIndex).toBe(-1);
  },

  // Check for keyboard navigation
  expectKeyboardActivation: async (element: HTMLElement, key: string = 'Enter') => {
    const user = userEvent.setup();
    element.focus();
    await user.keyboard(`{${key}}`);
    expect(element).toHaveFocus();
  },

  // Check for screen reader content
  expectScreenReaderText: (text: string) => {
    expect(screen.getByText(text)).toBeInTheDocument();
  },

  // Check for proper heading hierarchy
  expectHeadingLevel: (text: string, level: number) => {
    expect(screen.getByRole('heading', { name: text, level })).toBeInTheDocument();
  }
};

// Form testing helpers
export const formHelpers = {
  fillInput: async (labelText: string, value: string) => {
    const user = userEvent.setup();
    const input = screen.getByLabelText(labelText);
    await user.clear(input);
    await user.type(input, value);
    return input;
  },

  selectOption: async (labelText: string, optionText: string) => {
    const user = userEvent.setup();
    const select = screen.getByLabelText(labelText);
    await user.selectOptions(select, optionText);
    return select;
  },

  checkCheckbox: async (labelText: string) => {
    const user = userEvent.setup();
    const checkbox = screen.getByLabelText(labelText);
    await user.click(checkbox);
    return checkbox;
  },

  submitForm: async (buttonText: string = 'Submit') => {
    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: buttonText });
    await user.click(submitButton);
    return submitButton;
  },

  expectFormError: (message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },

  expectFormValid: (buttonText: string = 'Submit') => {
    const submitButton = screen.getByRole('button', { name: buttonText });
    expect(submitButton).not.toBeDisabled();
  }
};

// API mocking helpers
export const apiMocks = {
  mockFetch: (responseData: any, status = 200) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(responseData),
        text: () => Promise.resolve(JSON.stringify(responseData))
      })
    ) as jest.Mock;
  },

  mockFetchError: (error: string, status = 500) => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error(error))
    ) as jest.Mock;
  },

  resetFetch: () => {
    if (global.fetch && typeof (global.fetch as any).mockRestore === 'function') {
      (global.fetch as jest.Mock).mockRestore();
    }
  }
};

// Component testing helpers
export const componentHelpers = {
  expectVisible: (element: HTMLElement) => {
    expect(element).toBeVisible();
  },

  expectHidden: (element: HTMLElement) => {
    expect(element).not.toBeVisible();
  },

  expectDisabled: (element: HTMLElement) => {
    expect(element).toBeDisabled();
  },

  expectEnabled: (element: HTMLElement) => {
    expect(element).not.toBeDisabled();
  },

  waitForElement: async (selector: string) => {
    return await waitFor(() => screen.getByTestId(selector));
  },

  waitForText: async (text: string) => {
    return await waitFor(() => screen.getByText(text));
  }
};

// Local storage mocking
export const localStorageMock = {
  setup: () => {
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    return localStorageMock;
  },

  cleanup: () => {
    if (window.localStorage && typeof window.localStorage.mockRestore === 'function') {
      (window.localStorage as any).mockRestore();
    }
  }
};

// IndexedDB mocking for offline functionality
export const indexedDBMock = {
  setup: () => {
    const mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null })),
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null }))
        }))
      }))
    };

    global.indexedDB = {
      open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      }))
    } as any;

    return mockDB;
  },

  cleanup: () => {
    delete (global as any).indexedDB;
  }
};

// Service Worker mocking
export const serviceWorkerMock = {
  setup: () => {
    const mockServiceWorker = {
      register: jest.fn(() => Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn(() => Promise.resolve())
      })),
      getRegistration: jest.fn(() => Promise.resolve(null)),
      ready: Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        sync: {
          register: jest.fn(() => Promise.resolve())
        }
      })
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    });

    return mockServiceWorker;
  },

  cleanup: () => {
    delete (navigator as any).serviceWorker;
  }
};

// Responsive design testing
export const responsiveHelpers = {
  setMobileViewport: () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    window.dispatchEvent(new Event('resize'));
  },

  setTabletViewport: () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
    window.dispatchEvent(new Event('resize'));
  },

  setDesktopViewport: () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });
    window.dispatchEvent(new Event('resize'));
  },

  matchMedia: (query: string) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }
};

// Custom matchers for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveNoAccessibilityViolations(): R;
    }
  }
}

// Performance testing helpers
export const performanceHelpers = {
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    await waitFor(() => {});
    const end = performance.now();
    return end - start;
  },

  expectFastRender: async (renderFn: () => void, maxTime = 100) => {
    const renderTime = await performanceHelpers.measureRenderTime(renderFn);
    expect(renderTime).toBeLessThan(maxTime);
  }
};

// Cleanup function for tests
export const cleanup = () => {
  apiMocks.resetFetch();
  localStorageMock.cleanup();
  indexedDBMock.cleanup();
  serviceWorkerMock.cleanup();
  Object.values(mockFunctions).forEach(fn => fn.mockReset());
};

// Export everything for easy importing
export * from '@testing-library/react';
export { userEvent };
export { renderWithProviders as render };