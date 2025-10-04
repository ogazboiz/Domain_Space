"use client";

import { useState, useEffect } from 'react';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isStandalone: boolean;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: navigator.onLine,
    isStandalone: false,
  });

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as Navigator & { standalone?: boolean }).standalone ||
                          document.referrer.includes('android-app://');
      
      setPwaState(prev => ({ ...prev, isStandalone }));
    };

    // Check online status
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }));

    // Check if installable
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState(prev => ({ ...prev, isInstallable: true }));
    };

    // Check if installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    };

    // Initial checks
    checkStandalone();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  return pwaState;
}
