import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clean up any problematic URLs that might be stored in browser storage
const cleanupProblematicUrls = () => {
  console.log('🧹 Starting cleanup of problematic URLs...');
  
  // Clean localStorage
  Object.keys(localStorage).forEach((key) => {
    const value = localStorage.getItem(key) || '';
    if (key.includes('sueosblancos') || key.includes('blanqueria') || 
        key.includes('xn--') || value.includes('sueosblancos') || 
        value.includes('blanqueria') || value.includes('xn--')) {
      localStorage.removeItem(key);
      console.log('🧹 Removed problematic localStorage key:', key);
    }
  });

  // Clean sessionStorage
  Object.keys(sessionStorage || {}).forEach((key) => {
    const value = sessionStorage.getItem(key) || '';
    if (key.includes('sueosblancos') || key.includes('blanqueria') || 
        key.includes('xn--') || value.includes('sueosblancos') || 
        value.includes('blanqueria') || value.includes('xn--')) {
      sessionStorage.removeItem(key);
      console.log('🧹 Removed problematic sessionStorage key:', key);
    }
  });

  // Clean cookies
  document.cookie.split(";").forEach(function(c) { 
    const cookie = c.trim();
    if (cookie.includes('sueosblancos') || cookie.includes('blanqueria') || cookie.includes('xn--')) {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      console.log('🧹 Removed problematic cookie:', name);
    }
  });

  console.log('🧹 Cleanup completed');
};

// Run cleanup before rendering the app
cleanupProblematicUrls();

createRoot(document.getElementById("root")!).render(<App />);
