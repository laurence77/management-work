import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  isSupported: boolean;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  skipWaiting: () => Promise<void>;
}

/**
 * Custom hook for PWA functionality
 * Handles installation, updates, offline status, and service worker management
 */
export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    isUpdateAvailable: false,
    isSupported: 'serviceWorker' in navigator
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is already installed
  const checkInstallStatus = useCallback(() => {
    // Check if app is installed (various methods)
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Handle service worker registration
  useEffect(() => {
    if (!state.isSupported) return;

    const registerSW = async () => {
      // Skip service worker registration in development
      if (import.meta.env.DEV) {
        console.log('Service Worker registration skipped in development mode');
        // Unregister any existing service workers in development
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Unregistered existing service worker');
          }
        } catch (error) {
          console.log('No existing service workers to unregister');
        }
        return;
      }
      
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });

        // Listen for controlling service worker changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, [state.isSupported]);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(prev => ({ ...prev, isOffline: !navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Check install status on mount
  useEffect(() => {
    checkInstallStatus();
  }, [checkInstallStatus]);

  // Install the app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false }));
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update the app
  const updateApp = useCallback(async (): Promise<void> => {
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    try {
      await registration.update();
      console.log('App update initiated');
    } catch (error) {
      console.error('App update failed:', error);
      throw error;
    }
  }, [registration]);

  // Check for updates manually
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!registration) {
      console.warn('Service worker not registered');
      return;
    }

    try {
      const reg = await registration.update();
      if (reg.waiting) {
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }, [registration]);

  // Skip waiting and activate new service worker
  const skipWaiting = useCallback(async (): Promise<void> => {
    if (!registration || !registration.waiting) {
      return;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setState(prev => ({ ...prev, isUpdateAvailable: false }));
  }, [registration]);

  return {
    ...state,
    installApp,
    updateApp,
    checkForUpdates,
    skipWaiting
  };
}

/**
 * Hook for managing offline capabilities
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      
      if (!online && !isOffline) {
        setWasOffline(true);
      }
      
      setIsOffline(!online);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isOffline]);

  const resetOfflineStatus = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOffline,
    wasOffline,
    resetOfflineStatus,
    isOnline: !isOffline
  };
}

/**
 * Hook for PWA-specific storage (with fallbacks)
 */
export function usePWAStorage() {
  const setItem = useCallback(async (key: string, value: any): Promise<void> => {
    try {
      // Try IndexedDB first for PWA
      if ('indexedDB' in window) {
        // In a full implementation, this would use a proper IndexedDB wrapper
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Failed to store item:', error);
      throw error;
    }
  }, []);

  const getItem = useCallback(async (key: string): Promise<any> => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }, []);

  const removeItem = useCallback(async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, []);

  return {
    setItem,
    getItem,
    removeItem
  };
}

/**
 * Hook for handling PWA sharing
 */
export function usePWAShare() {
  const [isShareSupported] = useState('share' in navigator);

  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!isShareSupported) {
      // Fallback to clipboard or custom share modal
      if ('clipboard' in navigator) {
        try {
          await navigator.clipboard.writeText(data.url || window.location.href);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }, [isShareSupported]);

  const canShare = useCallback((data?: ShareData): boolean => {
    if (!isShareSupported) return false;
    return data ? navigator.canShare(data) : true;
  }, [isShareSupported]);

  return {
    share,
    canShare,
    isShareSupported
  };
}

/**
 * Hook for PWA notifications
 */
export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions): Promise<boolean> => {
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      try {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options
        });
        return true;
      } catch (error) {
        console.error('Failed to show notification:', error);
        return false;
      }
    },
    [permission]
  );

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window
  };
}