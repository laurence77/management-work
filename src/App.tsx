import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { LazyRoutes, preloadCriticalRoutes } from "@/utils/lazy-loading";
import { performanceOptimizer } from "@/utils/performance-optimizer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePWA, useOfflineStatus } from "@/hooks/usePWA";
import { OfflineBanner } from "@/components/ui/offline-banner";

// Import only critical pages that need to load immediately
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for better performance
const Celebrities = LazyRoutes.Celebrities;
const CelebrityProfile = LazyRoutes.CelebrityProfile;
const Services = LazyRoutes.Services;
const Events = LazyRoutes.Events;
const Management = LazyRoutes.Management;
const Login = LazyRoutes.Login;
const Contact = LazyRoutes.Contact;
const PasswordReset = LazyRoutes.PasswordReset;
const Chat = LazyRoutes.Chat;
const VIP = LazyRoutes.VIP;
const Custom = LazyRoutes.Custom;
const FAQ = LazyRoutes.FAQ;

// Configure React Query with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Optimized loading component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  const { isInstallable, isOffline, installApp } = usePWA();
  const { isOnline, wasOffline } = useOfflineStatus();

  useEffect(() => {
    // Preload critical routes after initial render
    setTimeout(preloadCriticalRoutes, 100);
    
    // Initialize performance tracking
    performanceOptimizer.recordMetric({
      name: 'app-initialization',
      value: Date.now(),
      timestamp: Date.now(),
      type: 'custom'
    });

    // Show install prompt for PWA if available
    if (isInstallable) {
      setTimeout(() => {
        if (confirm('Install Celebrity Booking Platform as an app for a better experience?')) {
          installApp();
        }
      }, 5000); // Show after 5 seconds
    }
  }, [isInstallable, installApp]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        
        {/* Comprehensive offline status banner */}
        <OfflineBanner />
        
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Critical routes loaded immediately */}
              <Route path="/" element={<Index />} />
              
              {/* Lazy loaded routes */}
              <Route path="/celebrities" element={<Celebrities />} />
              <Route path="/celebrity/:id" element={<CelebrityProfile />} />
              <Route path="/services" element={<Services />} />
              <Route path="/events" element={<Events />} />
              <Route path="/management" element={<Management />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/vip" element={<VIP />} />
              <Route path="/custom" element={<Custom />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              
              {/* Route aliases for SEO and UX */}
              <Route path="/help-center" element={<Contact />} />
              <Route path="/help" element={<Contact />} />
              <Route path="/support" element={<Contact />} />
              <Route path="/private-meetings" element={<Services />} />
              <Route path="/meetings" element={<Services />} />
              <Route path="/event-appearances" element={<Events />} />
              <Route path="/privacy-policy" element={<Contact />} />
              <Route path="/terms-of-service" element={<Contact />} />
              <Route path="/security" element={<Contact />} />
              <Route path="/brand-consulting" element={<Services />} />
              <Route path="/consulting" element={<Services />} />
              <Route path="/luxury-accommodation" element={<Services />} />
              <Route path="/hotels" element={<Services />} />
              <Route path="/privacy" element={<Contact />} />
              <Route path="/terms" element={<Contact />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
