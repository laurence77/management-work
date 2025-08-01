/**
 * Tests for PWA Hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWA, useOfflineStatus, useInstallPrompt } from '@/hooks/usePWA';
import { serviceWorkerMock } from '@/utils/test-utils';

// Mock service worker
const mockSWRegistration = serviceWorkerMock.setup();

describe('usePWA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    serviceWorkerMock.cleanup();
  });

  describe('Initial State', () => {
    test('returns correct initial state', () => {
      const { result } = renderHook(() => usePWA());

      expect(result.current).toEqual({
        isSupported: true,
        isInstalled: false,
        isOnline: true,
        registration: null,
        updateAvailable: false,
        installPrompt: null
      });
    });

    test('detects unsupported environment', () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      delete (global.navigator as any).serviceWorker;

      const { result } = renderHook(() => usePWA());

      expect(result.current.isSupported).toBe(false);

      (global.navigator as any).serviceWorker = originalServiceWorker;
    });
  });

  describe('Service Worker Registration', () => {
    test('registers service worker when supported', async () => {
      const { result } = renderHook(() => usePWA());

      await waitFor(() => {
        expect(result.current.registration).toBeDefined();
      });

      expect(global.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    test('handles registration errors gracefully', async () => {
      const originalRegister = global.navigator.serviceWorker.register;
      global.navigator.serviceWorker.register = jest.fn().mockRejectedValue(new Error('Registration failed'));

      const { result } = renderHook(() => usePWA());

      await waitFor(() => {
        expect(result.current.registration).toBeNull();
      });

      global.navigator.serviceWorker.register = originalRegister;
    });
  });

  describe('Update Detection', () => {
    test('detects service worker updates', async () => {
      const { result } = renderHook(() => usePWA());

      await waitFor(() => {
        expect(result.current.registration).toBeDefined();
      });

      // Simulate update found
      act(() => {
        const updateFoundEvent = new Event('updatefound');
        if (mockSWRegistration.onupdatefound) {
          mockSWRegistration.onupdatefound(updateFoundEvent);
        }
      });

      await waitFor(() => {
        expect(result.current.updateAvailable).toBe(true);
      });
    });

    test('provides update function', async () => {
      const { result } = renderHook(() => usePWA());

      await waitFor(() => {
        expect(result.current.registration).toBeDefined();
      });

      // Simulate update available
      act(() => {
        const updateFoundEvent = new Event('updatefound');
        if (mockSWRegistration.onupdatefound) {
          mockSWRegistration.onupdatefound(updateFoundEvent);
        }
      });

      expect(typeof result.current.update).toBe('function');
    });
  });

  describe('Install Detection', () => {
    test('detects standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => usePWA());

      expect(result.current.isInstalled).toBe(true);
    });

    test('detects non-standalone mode', () => {
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

      const { result } = renderHook(() => usePWA());

      expect(result.current.isInstalled).toBe(false);
    });
  });
});

describe('useOfflineStatus', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine
    });
  });

  test('returns correct initial online status', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  test('returns correct initial offline status', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  test('responds to online events', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  test('responds to offline events', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  test('resets offline status', () => {
    const { result } = renderHook(() => useOfflineStatus());

    // Simulate going offline then online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    });

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.wasOffline).toBe(true);

    act(() => {
      result.current.resetOfflineStatus();
    });

    expect(result.current.wasOffline).toBe(false);
  });

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useOfflineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('useInstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns correct initial state', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalling).toBe(false);
    expect(typeof result.current.promptInstall).toBe('function');
  });

  test('detects install prompt availability', () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = {
      prompt: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
      preventDefault: jest.fn()
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );
    });

    expect(result.current.canInstall).toBe(true);
  });

  test('handles install prompt acceptance', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = {
      prompt: jest.fn().mockResolvedValue({ outcome: 'accepted' }),
      preventDefault: jest.fn()
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(false);
  });

  test('handles install prompt dismissal', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = {
      prompt: jest.fn().mockResolvedValue({ outcome: 'dismissed' }),
      preventDefault: jest.fn()
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(false);
  });

  test('handles install prompt errors', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = {
      prompt: jest.fn().mockRejectedValue(new Error('Install failed')),
      preventDefault: jest.fn()
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(result.current.isInstalling).toBe(false);
  });

  test('detects app installation', () => {
    const { result } = renderHook(() => useInstallPrompt());

    // First set up install prompt
    const mockEvent = {
      prompt: jest.fn(),
      preventDefault: jest.fn()
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockEvent)
      );
    });

    expect(result.current.canInstall).toBe(true);

    // Then simulate app installation
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.canInstall).toBe(false);
  });

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useInstallPrompt());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});