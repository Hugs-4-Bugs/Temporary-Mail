import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setReconnected(true);
        setTimeout(() => setReconnected(false), 3000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actively ping the server to verify connection
    const interval = setInterval(() => {
      fetch('/api', { method: 'HEAD' })
        .then(() => {
          if (!isOnline) handleOnline();
        })
        .catch(() => {
          if (isOnline) handleOffline();
        });
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline, reconnected };
}

export default useNetworkStatus;
