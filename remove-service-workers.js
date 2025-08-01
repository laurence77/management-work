// Service Worker Removal Script
// This script removes all service workers causing the reload issue

console.log('🔍 Starting Service Worker removal...');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    console.log(`Found ${registrations.length} service worker registrations`);
    
    if (registrations.length === 0) {
      console.log('✅ No service workers found - already clean!');
      return;
    }
    
    // Unregister all service workers
    const promises = registrations.map((registration, index) => {
      console.log(`🗑️ Unregistering SW ${index + 1}: ${registration.scope}`);
      return registration.unregister().then(success => {
        if (success) {
          console.log(`✅ Successfully unregistered SW ${index + 1}`);
        } else {
          console.log(`❌ Failed to unregister SW ${index + 1}`);
        }
        return success;
      });
    });
    
    Promise.all(promises).then(results => {
      const successful = results.filter(r => r).length;
      console.log(`🎉 Unregistered ${successful}/${registrations.length} service workers`);
      console.log('💡 Auto-reloading should now be stopped!');
      
      // Also clear caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          console.log(`🧹 Clearing ${cacheNames.length} caches...`);
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log(`🗑️ Deleting cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
        }).then(() => {
          console.log('✅ All caches cleared');
          console.log('🎯 Service worker cleanup complete!');
        });
      }
    });
  });
} else {
  console.log('ℹ️ Service Worker API not supported');
}