import React from 'react';
import { Wifi, WifiOff, XCircle } from 'lucide-react';
import useNetworkStatus from '@/hooks/useNetworkStatus';

const NetworkStatusBanner: React.FC = () => {
  const { isOnline, reconnected } = useNetworkStatus();

  if (isOnline && !reconnected) {
    return null; // Don't show anything when online and not just reconnected
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-sm text-center transition-all duration-300 flex items-center justify-center ${
        !isOnline
          ? 'bg-red-600 text-white'
          : reconnected
          ? 'bg-green-600 text-white'
          : ''
      }`}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        {!isOnline ? (
          <>
            <WifiOff size={16} className="flex-shrink-0" />
            <span className="flex-grow">
              You are currently offline. Some features may be unavailable.
            </span>
          </>
        ) : reconnected ? (
          <>
            <Wifi size={16} className="flex-shrink-0" />
            <span className="flex-grow">
              Your connection has been restored. All features are now available.
            </span>
          </>
        ) : null}

        {reconnected && (
          <button
            onClick={() => window.location.reload()}
            className="ml-2 bg-green-700 hover:bg-green-800 rounded-md py-1 px-2 text-xs"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusBanner;
