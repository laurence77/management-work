import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPrompt {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
  dismiss: () => void;
}

interface PWAStatus {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<void>;
  dismissInstall: () => void;
  updateApp: () => Promise<void>;
  shareContent: (data: ShareData) => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
}

interface UsePWAReturn extends PWAStatus, PWAActions {}

export const usePWA = (): UsePWAReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is running in standalone mode (installed)
  useEffect(() => {
    const checkStandaloneMode = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        // @ts-ignore
        window.navigator.standalone === true;
      
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    checkStandaloneMode();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkStandaloneMode();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
      return () => mediaQuery.removeEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
      return () => mediaQuery.removeListener(handleDisplayModeChange);
    }
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker registration and update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setServiceWorkerRegistration(registration);

          // Check for updates
          const checkForUpdates = () => {
            registration.update();
          };

          // Check for updates every 5 minutes
          const updateInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true);
                }
              });
            }
          });

          return () => {
            clearInterval(updateInterval);
          };
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Install the PWA
  const install = useCallback(async (): Promise<void> => {
    if (!installPrompt) {
      throw new Error('Install prompt is not available');
    }

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
      throw error;
    }
  }, [installPrompt]);

  // Dismiss install prompt
  const dismissInstall = useCallback((): void => {
    setIsInstallable(false);
    setInstallPrompt(null);
  }, []);

  // Update the app
  const updateApp = useCallback(async (): Promise<void> => {
    if (!serviceWorkerRegistration) {
      throw new Error('Service Worker is not registered');
    }

    try {
      const newWorker = serviceWorkerRegistration.waiting;
      if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the new service worker to take control
        await new Promise<void>((resolve) => {
          const handleControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        });

        // Reload the page to use the new service worker
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update app:', error);
      throw error;
    }
  }, [serviceWorkerRegistration]);

  // Share content using Web Share API
  const shareContent = useCallback(async (data: ShareData): Promise<void> => {
    if (!navigator.share) {
      throw new Error('Web Share API is not supported');
    }

    try {
      await navigator.share(data);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to share content:', error);
        throw error;
      }
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported');
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }, []);

  // Show notification
  const showNotification = useCallback(async (
    title: string, 
    options?: NotificationOptions
  ): Promise<void> => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      if (serviceWorkerRegistration) {
        // Use service worker to show notification (better for PWAs)
        await serviceWorkerRegistration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'celebrity-booking-notification',
          renotify: true,
          ...options,
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          ...options,
        });
      }
    } else {
      throw new Error('Notification permission denied');
    }
  }, [serviceWorkerRegistration, requestNotificationPermission]);

  return {
    // Status
    isOnline,
    isInstallable,
    isInstalled,
    isStandalone,
    isUpdateAvailable,
    installPrompt,

    // Actions
    install,
    dismissInstall,
    updateApp,
    shareContent,
    requestNotificationPermission,
    showNotification,
  };
};

// Additional hook for PWA capabilities detection
export const usePWACapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    serviceWorker: false,
    webShare: false,
    notifications: false,
    backgroundSync: false,
    pushMessaging: false,
    installPrompt: false,
    displayModes: [] as string[],
  });

  useEffect(() => {
    const detectCapabilities = () => {
      const detected = {
        serviceWorker: 'serviceWorker' in navigator,
        webShare: 'share' in navigator,
        notifications: 'Notification' in window,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        pushMessaging: 'serviceWorker' in navigator && 'PushManager' in window,
        installPrompt: 'BeforeInstallPromptEvent' in window,
        displayModes: [] as string[],
      };

      // Detect supported display modes
      const displayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
      detected.displayModes = displayModes.filter(mode => 
        window.matchMedia(`(display-mode: ${mode})`).matches
      );

      setCapabilities(detected);
    };

    detectCapabilities();
  }, []);

  return capabilities;
};

// Hook for offline storage management
export const useOfflineStorage = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [storageQuota, setStorageQuota] = useState<{
    quota: number;
    usage: number;
    available: number;
  } | null>(null);

  useEffect(() => {
    const checkStorageSupport = async () => {
      setIsSupported('storage' in navigator && 'estimate' in navigator.storage);

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageQuota({
            quota: estimate.quota || 0,
            usage: estimate.usage || 0,
            available: (estimate.quota || 0) - (estimate.usage || 0),
          });
        } catch (error) {
          console.error('Failed to estimate storage:', error);
        }
      }
    };

    checkStorageSupport();
  }, []);

  const requestPersistentStorage = useCallback(async (): Promise<boolean> => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        return persistent;
      } catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
      }
    }
    return false;
  }, []);

  const clearStorage = useCallback(async (): Promise<void> => {
    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      // Clear IndexedDB (if used)
      if ('indexedDB' in window) {
        // Implementation would depend on your IndexedDB usage
      }

      // Update storage estimate
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageQuota({
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
        });
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }, []);

  return {
    isSupported,
    storageQuota,
    requestPersistentStorage,
    clearStorage,
  };
};