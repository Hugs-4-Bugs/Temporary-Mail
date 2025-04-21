import React from "react";
import { formatDistanceToNow } from "date-fns";
import { MailOpen, ShieldAlert, Clock } from "lucide-react";

export interface EmailItem {
  id: number;
  from: string;
  subject: string;
  receivedAt: string;
  deleted: boolean;
  otp?: string;
  otpExpiresAt?: string;
}

interface EmailListProps {
  emails: EmailItem[];
  selectedEmailId: number | null;
  onSelectEmail: (id: number) => void;
  loading: boolean;
  emptyMessage?: string;
}

export function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  loading,
  emptyMessage = "No emails yet.",
}: EmailListProps) {
  // Helper function to format relative time
  const relativeTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Unknown time";
    }
  };

  // Function to check if an email might contain an OTP based on the subject
  const hasOtpInSubject = (subject: string): boolean => {
    if (!subject) return false;
    const otpKeywords = ['otp', 'code', 'verification', 'verify', 'one-time', 'password', 'login', 'sign in'];
    return otpKeywords.some(keyword => subject.toLowerCase().includes(keyword));
  };

  // Check if OTP is expired
  const isOtpExpired = (email: EmailItem): boolean => {
    if (!email.otpExpiresAt) return false;
    return new Date() > new Date(email.otpExpiresAt);
  };

  // Get the sender name in a more readable format
  const getSenderName = (from: string): string => {
    try {
      const atIndex = from.indexOf('@');
      if (atIndex === -1) return from;

      // Get domain for company identification
      const domain = from.substring(atIndex + 1);
      const domainFirstPart = domain.split('.')[0];

      // Special case for known senders
      if (from.includes('noreply') || from.includes('no-reply')) {
        return domainFirstPart.charAt(0).toUpperCase() + domainFirstPart.slice(1);
      }

      // Try to extract a name from the local part
      let name = from.substring(0, atIndex);

      // If it's access@workos-mail.com, return "WorkOS"
      if (name === 'access' && domain.includes('workos')) {
        return 'WorkOS';
      }

      // If it's verify@stripe.com, return "Stripe"
      if (name === 'verify' && domain.includes('stripe')) {
        return 'Stripe';
      }

      // Otherwise just clean up the local part
      return name
        .replace(/\./g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (e) {
      return from;
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full mx-auto mb-3"></div>
        <div className="text-zinc-500">Loading messages...</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-zinc-500 text-center">
        <MailOpen className="w-12 h-12 text-zinc-300 mb-3" />
        <div className="text-lg font-medium mb-1">Your inbox is empty</div>
        <div className="text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-700 max-h-[500px] overflow-y-auto">
      {emails.map((email) => {
        const isOtp = email.otp || hasOtpInSubject(email.subject);
        const expired = isOtp && isOtpExpired(email);
        const senderName = getSenderName(email.from);

        return (
          <li key={email.id}>
            <button
              className={`flex w-full text-left items-center p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition focus:outline-none ${
                selectedEmailId === email.id ? "bg-zinc-200 dark:bg-zinc-700" : ""
              }`}
              onClick={() => onSelectEmail(email.id)}
            >
              <div className="flex-grow min-w-0 pr-2">
                <div className="font-medium text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-2 mb-1">
                  <span className="truncate">{email.subject || <em>(No subject)</em>}</span>
                  {isOtp && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap flex items-center gap-0.5 ${
                        expired
                          ? "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                          : "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200"
                      }`}
                    >
                      {expired ? (
                        <>
                          <Clock size={12} />
                          <span>Expired</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={12} />
                          <span>OTP</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                  <div className="text-xs text-zinc-800 dark:text-zinc-300 font-medium truncate">
                    {senderName}
                  </div>
                  <div className="hidden xs:block text-zinc-400 text-xs">•</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {relativeTime(email.receivedAt)}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
