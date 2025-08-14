import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force clear all caches and reload service worker
const forceRefresh = async () => {
  console.log('🔄 Force refreshing application...');
  
  // Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('🧹 All caches cleared');
  }

  // Unregister service worker and re-register
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('🗑️ Service worker unregistered');
    }
    
    // Re-register service worker
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service worker re-registered');
    } catch (error) {
      console.log('❌ Service worker registration failed:', error);
    }
  }

  // Clean problematic localStorage
  Object.keys(localStorage).forEach((key) => {
    const value = localStorage.getItem(key) || '';
    if (key.includes('sueosblancos') || key.includes('blanqueria') || 
        key.includes('xn--') || value.includes('sueosblancos') || 
        value.includes('blanqueria') || value.includes('xn--')) {
      localStorage.removeItem(key);
      console.log('🧹 Removed problematic localStorage key:', key);
    }
  });

  console.log('🔄 Force refresh completed');
};

// Run force refresh before rendering the app
forceRefresh();

createRoot(document.getElementById("root")!).render(<App />);
