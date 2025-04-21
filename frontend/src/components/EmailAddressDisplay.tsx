import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, RefreshCw, Loader2, RotateCw, Circle } from "lucide-react";

interface EmailAddressDisplayProps {
  emailAddress: string;
  expiresAt: string;
  onRefresh: () => Promise<void>;
  onChangeEmail: () => Promise<void>;
  liveConnected: boolean;
}

export function EmailAddressDisplay({
  emailAddress,
  expiresAt,
  onRefresh,
  onChangeEmail,
  liveConnected,
}: EmailAddressDisplayProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changing, setChanging] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  // Calculate expiry time
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("");
      return;
    }

    function updateCountdown() {
      const now = new Date();
      const expire = new Date(expiresAt);
      const diff = Math.max(0, Math.floor((expire.getTime() - now.getTime()) / 1000));

      if (diff <= 0) {
        setTimeLeft("Expired");
        setExpired(true);
        return;
      }

      setExpired(false);
      const min = String(Math.floor(diff/60)).padStart(2, "0");
      const sec = String(diff%60).padStart(2, "0");
      setTimeLeft(`${min}:${sec}`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1500);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleChangeEmail = async () => {
    setChanging(true);
    try {
      await onChangeEmail();
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex flex-col items-center gap-1">
        <div className="text-lg font-bold text-center">Your Disposable Email Address</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          Use this address to receive emails. Expires in {timeLeft}.
        </div>
      </div>

      {/* Email address with copy button */}
      <div className="flex gap-2 items-center w-full max-w-full justify-center">
        <div
          className={`font-mono text-lg text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 break-all select-all min-w-0 flex-1 text-center ${expired ? 'line-through opacity-60' : ''}`}
          onClick={() => { if (!expired) handleCopy(); }}
        >
          {emailAddress}
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
          aria-label="Copy email address"
          disabled={expired}
        >
          <CopyIcon className="w-5 h-5" />
        </Button>

        {/* Live connection indicator */}
        <div
          className="ml-1 flex items-center select-none"
          title={liveConnected ? 'Live: Connected' : 'Live: Disconnected. Reconnecting…'}
        >
          <Circle
            className={`w-3 h-3 mr-1 fill-current ${liveConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}
            aria-label={liveConnected ? 'Live connection' : 'Disconnected'}
          />
          <span className={`text-xs font-medium ${liveConnected ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`}>
            Live
          </span>
        </div>
      </div>

      {/* Controls: Refresh and Change */}
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm w-1/2"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh Inbox
        </Button>

        <Button
          variant={expired ? "default" : "secondary"}
          size="sm"
          onClick={handleChangeEmail}
          disabled={changing}
          className="text-sm w-1/2"
        >
          {changing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4 mr-2" />
          )}
          {expired ? "Generate New Address" : "Change Address"}
        </Button>
      </div>

      {copySuccess && (
        <div className="text-green-600 text-sm block text-center">
          Email address copied to clipboard!
        </div>
      )}
    </div>
  );
}
