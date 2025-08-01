import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Zap,
  Wifi,
  Bell,
  Share2,
  Star
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/useToast';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const PWAInstallPrompt = ({ onInstall, onDismiss }: PWAInstallPromptProps) => {
  const { isInstallable, isStandalone, install, dismissInstall } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Show prompt after a delay if installable and not already installed
    if (isInstallable && !isStandalone && !hasBeenDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isStandalone, hasBeenDismissed]);

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await install();
      setShowPrompt(false);
      onInstall?.();
      
      toast({
        title: 'App Installed!',
        description: 'Celebrity Booking Admin has been installed successfully.',
        type: 'success',
      });
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: 'Installation Failed',
        description: 'Could not install the app. Please try again.',
        type: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setHasBeenDismissed(true);
    dismissInstall();
    onDismiss?.();
  };

  if (!showPrompt || !isInstallable || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Install App</h3>
                <p className="text-blue-100 text-sm">Get the best experience</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-blue-50 text-sm mb-4">
            Install Celebrity Booking Admin for faster access, offline features, 
            and push notifications.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span>Faster Loading</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Wifi className="h-4 w-4 text-green-300" />
              <span>Works Offline</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Bell className="h-4 w-4 text-orange-300" />
              <span>Push Notifications</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Monitor className="h-4 w-4 text-purple-300" />
              <span>Desktop App</span>
            </div>
          </div>

          {/* Install Button */}
          <div className="space-y-3">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install Now
                </>
              )}
            </Button>

            <div className="flex items-center justify-center space-x-4 text-xs text-blue-100">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-current" />
                <span>Free & Secure</span>
              </div>
              <div className="flex items-center space-x-1">
                <Share2 className="h-3 w-3" />
                <span>No App Store</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Floating install button for persistent access
export const PWAInstallButton = () => {
  const { isInstallable, isStandalone, install } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();

  if (!isInstallable || isStandalone) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await install();
      
      toast({
        title: 'App Installed!',
        description: 'You can now access the app from your home screen.',
        type: 'success',
      });
    } catch (error) {
      toast({
        title: 'Installation Failed',
        description: 'Please try again or check your browser settings.',
        type: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      onClick={handleInstall}
      disabled={isInstalling}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isInstalling ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Install App
        </>
      )}
    </Button>
  );
};

// PWA status indicator
export const PWAStatusIndicator = () => {
  const { isStandalone, isOnline } = usePWA();

  return (
    <div className="flex items-center space-x-2">
      {isStandalone && (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <Smartphone className="h-3 w-3 mr-1" />
          PWA Mode
        </Badge>
      )}
      
      <Badge 
        variant="outline" 
        className={
          isOnline 
            ? "bg-green-100 text-green-800 border-green-300" 
            : "bg-red-100 text-red-800 border-red-300"
        }
      >
        <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  );
};