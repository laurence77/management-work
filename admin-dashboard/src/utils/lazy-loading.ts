import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy loading utilities for admin dashboard
 */

interface LazyLoadOptions {
  fallback?: ComponentType;
  retryAttempts?: number;
  retryDelay?: number;
  preload?: boolean;
}

/**
 * Enhanced lazy loading with retry mechanism
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const { retryAttempts = 3, retryDelay = 1000 } = options;

  const retryImport = async (attempt = 1): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempt < retryAttempts) {
        console.warn(`Failed to load admin component (attempt ${attempt}/${retryAttempts}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return retryImport(attempt + 1);
      }
      throw error;
    }
  };

  return lazy(() => retryImport());
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return importFn().catch(error => {
    console.warn('Failed to preload admin component:', error);
  });
}

/**
 * Admin dashboard lazy routes
 */
export const LazyAdminRoutes = {
  Dashboard: createLazyComponent(
    () => import('@/pages/Dashboard'),
    { preload: true }
  ),
  
  Login: createLazyComponent(
    () => import('@/pages/Login'),
    { preload: true }
  )
};

/**
 * Admin component lazy loading
 */
export const LazyAdminComponents = {
  // Core dashboard components
  StatsOverview: createLazyComponent(
    () => import('@/components/dashboard/StatsOverview'),
    { preload: true }
  ),
  
  RecentCelebrities: createLazyComponent(
    () => import('@/components/dashboard/RecentCelebrities'),
    { preload: true }
  ),
  
  DashboardHeader: createLazyComponent(
    () => import('@/components/dashboard/DashboardHeader'),
    { preload: true }
  ),
  
  // Management components
  CelebrityManager: createLazyComponent(
    () => import('@/components/CelebrityManager')
  ),
  
  BookingsManager: createLazyComponent(
    () => import('@/components/dashboard/BookingsManager')
  ),
  
  UsersManager: createLazyComponent(
    () => import('@/components/dashboard/UsersManager')
  ),
  
  FormsManager: createLazyComponent(
    () => import('@/components/dashboard/FormsManager')
  ),
  
  SiteSettingsManager: createLazyComponent(
    () => import('@/components/SiteSettingsManager')
  ),
  
  // Analytics components
  AnalyticsDashboard: createLazyComponent(
    () => import('@/components/analytics/AnalyticsDashboard')
  ),
  
  // Automation components
  AutomationDashboard: createLazyComponent(
    () => import('@/components/automation/AutomationDashboard')
  ),
  
  AutomationActivityDashboard: createLazyComponent(
    () => import('@/components/automation/AutomationActivityDashboard')
  ),
  
  EdgeFunctionsManager: createLazyComponent(
    () => import('@/components/automation/EdgeFunctionsManager')
  ),
  
  // AI components\n  AIBookingAssistant: createLazyComponent(\n    () => import('@/components/ai/AIBookingAssistant')\n  ),\n  \n  SmartAssistant: createLazyComponent(\n    () => import('@/components/ai/SmartAssistant')\n  ),\n  \n  // Chat components\n  ChatList: createLazyComponent(\n    () => import('@/components/chat/ChatList')\n  ),\n  \n  ChatRoom: createLazyComponent(\n    () => import('@/components/chat/ChatRoom')\n  ),\n  \n  LiveChatSystem: createLazyComponent(\n    () => import('@/components/chat/LiveChatSystem')\n  ),\n  \n  // Calendar components\n  CalendarIntegration: createLazyComponent(\n    () => import('@/components/calendar/CalendarIntegration')\n  ),\n  \n  CalendarSettings: createLazyComponent(\n    () => import('@/components/calendar/CalendarSettings')\n  ),\n  \n  ConflictChecker: createLazyComponent(\n    () => import('@/components/calendar/ConflictChecker')\n  ),\n  \n  // Settings components\n  EmailSettingsManager: createLazyComponent(\n    () => import('@/components/settings/EmailSettingsManager')\n  ),\n  \n  EmailTemplateManager: createLazyComponent(\n    () => import('@/components/settings/EmailTemplateManager')\n  ),\n  \n  PaymentOptionsManager: createLazyComponent(\n    () => import('@/components/settings/PaymentOptionsManager')\n  ),\n  \n  ServicePricingManager: createLazyComponent(\n    () => import('@/components/settings/ServicePricingManager')\n  ),\n  \n  // Fraud detection\n  FraudDashboard: createLazyComponent(\n    () => import('@/components/fraud/FraudDashboard')\n  ),\n  \n  FraudAssessments: createLazyComponent(\n    () => import('@/components/fraud/FraudAssessments')\n  ),\n  \n  // Realtime components\n  RealtimeDashboard: createLazyComponent(\n    () => import('@/components/realtime/RealtimeDashboard')\n  ),\n  \n  // PWA components\n  PWAInstallPrompt: createLazyComponent(\n    () => import('@/components/pwa/PWAInstallPrompt')\n  )\n};\n\n/**\n * Admin-specific preloading strategies\n */\nexport function preloadAdminCriticalComponents() {\n  // Preload most commonly used admin components\n  const criticalComponents = [\n    () => import('@/components/dashboard/StatsOverview'),\n    () => import('@/components/dashboard/RecentCelebrities'),\n    () => import('@/components/dashboard/DashboardHeader'),\n    () => import('@/components/CelebrityManager')\n  ];\n\n  criticalComponents.forEach(component => {\n    preloadComponent(component);\n  });\n}\n\n/**\n * Preload components based on user role\n */\nexport function preloadByRole(userRole: string) {\n  const roleComponentMap = {\n    'super_admin': [\n      () => import('@/components/automation/AutomationDashboard'),\n      () => import('@/components/analytics/AnalyticsDashboard'),\n      () => import('@/components/fraud/FraudDashboard'),\n      () => import('@/components/settings/EmailSettingsManager')\n    ],\n    'admin': [\n      () => import('@/components/dashboard/BookingsManager'),\n      () => import('@/components/dashboard/UsersManager'),\n      () => import('@/components/CelebrityManager')\n    ],\n    'manager': [\n      () => import('@/components/dashboard/BookingsManager'),\n      () => import('@/components/calendar/CalendarIntegration')\n    ]\n  };\n\n  const componentsToPreload = roleComponentMap[userRole as keyof typeof roleComponentMap] || [];\n  componentsToPreload.forEach(component => {\n    preloadComponent(component);\n  });\n}\n\n/**\n * Context-aware preloading based on current admin section\n */\nexport function preloadAdminSection(section: string) {\n  const sectionComponentMap = {\n    'dashboard': [\n      () => import('@/components/analytics/AnalyticsDashboard'),\n      () => import('@/components/realtime/RealtimeDashboard')\n    ],\n    'celebrities': [\n      () => import('@/components/CelebrityManager')\n    ],\n    'bookings': [\n      () => import('@/components/dashboard/BookingsManager'),\n      () => import('@/components/calendar/CalendarIntegration')\n    ],\n    'users': [\n      () => import('@/components/dashboard/UsersManager')\n    ],\n    'automation': [\n      () => import('@/components/automation/AutomationDashboard'),\n      () => import('@/components/automation/EdgeFunctionsManager')\n    ],\n    'chat': [\n      () => import('@/components/chat/LiveChatSystem'),\n      () => import('@/components/chat/ChatList')\n    ],\n    'settings': [\n      () => import('@/components/settings/EmailSettingsManager'),\n      () => import('@/components/settings/PaymentOptionsManager')\n    ]\n  };\n\n  const componentsToPreload = sectionComponentMap[section as keyof typeof sectionComponentMap] || [];\n  componentsToPreload.forEach(component => {\n    preloadComponent(component);\n  });\n}\n\n/**\n * Admin bundle size analyzer\n */\nexport function analyzeAdminBundleSize() {\n  if (process.env.NODE_ENV === 'development') {\n    console.group('Admin Dashboard Bundle Analysis');\n    console.log('Estimated chunk sizes:');\n    \n    const estimates = {\n      'react-vendor': '~45KB gzipped',\n      'admin-ui': '~40KB gzipped',\n      'dashboard': '~70KB gzipped (includes charts)',\n      'forms': '~20KB gzipped',\n      'data': '~15KB gzipped',\n      'utils': '~15KB gzipped',\n      'analytics': '~35KB gzipped (lazy loaded)',\n      'automation': '~25KB gzipped (lazy loaded)',\n      'chat': '~30KB gzipped (lazy loaded)',\n      'settings': '~20KB gzipped (lazy loaded)'\n    };\n    \n    Object.entries(estimates).forEach(([chunk, size]) => {\n      console.log(`${chunk}: ${size}`);\n    });\n    \n    console.log('\\nTotal estimated initial bundle: ~205KB gzipped');\n    console.log('Lazy loaded features: ~110KB gzipped');\n    \n    console.groupEnd();\n  }\n}\n\n/**\n * Performance monitoring for lazy loaded components\n */\nexport class AdminComponentPerformanceMonitor {\n  private loadTimes = new Map<string, number>();\n\n  startLoading(componentName: string) {\n    this.loadTimes.set(componentName, Date.now());\n  }\n\n  endLoading(componentName: string) {\n    const startTime = this.loadTimes.get(componentName);\n    if (startTime) {\n      const loadTime = Date.now() - startTime;\n      console.log(`Admin component '${componentName}' loaded in ${loadTime}ms`);\n      this.loadTimes.delete(componentName);\n      \n      // Send to analytics if load time is concerning\n      if (loadTime > 2000) {\n        console.warn(`Slow loading admin component detected: ${componentName} (${loadTime}ms)`);\n      }\n    }\n  }\n\n  getMetrics() {\n    return {\n      pendingLoads: Array.from(this.loadTimes.keys()),\n      activeBundles: this.loadTimes.size\n    };\n  }\n}\n\nexport const adminPerfMonitor = new AdminComponentPerformanceMonitor();