import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui/toaster'
// Temporarily disable PWA to fix reloading issue
// import { usePWA } from './hooks/usePWA'
import { useEffect } from 'react'

export const App = () => {
  // Disable PWA hooks that cause reloading
  // const { isOnline, isInstallable, isUpdateAvailable, install, updateApp } = usePWA();

  /* Disabled PWA auto-install and update logic
  useEffect(() => {
    // Auto-install prompt for admin users after delay
    if (isInstallable) {
      setTimeout(() => {
        if (confirm('Install Celebrity Booking Admin as a desktop app for better performance?')) {
          install().catch(console.error);
        }
      }, 3000);
    }

    // Notify about available updates
    if (isUpdateAvailable) {
      if (confirm('A new version of the admin app is available. Update now?')) {
        updateApp().catch(console.error);
      }
    }
  }, [isInstallable, isUpdateAvailable, install, updateApp]);
  */

  return (
    <BrowserRouter>
      {/* Offline indicator for admin */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-50 text-sm">
          ⚠️ Offline Mode - Limited functionality available
        </div>
      )}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
};