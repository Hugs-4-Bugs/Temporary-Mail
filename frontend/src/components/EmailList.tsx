import React from "react";
import { formatDistanceToNow } from "date-fns";
import { MailOpen } from "lucide-react";

export interface EmailItem {
  id: number;
  from: string;
  subject: string;
  receivedAt: string;
  deleted: boolean;
  otp?: string;
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
    const otpKeywords = ['otp', 'code', 'verification', 'verify', 'one-time', 'password', 'login'];
    return otpKeywords.some(keyword => subject.toLowerCase().includes(keyword));
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
        return (
          <li key={email.id}>
            <button
              className={`flex w-full text-left items-center justify-between px-3 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition focus:outline-none ${
                selectedEmailId === email.id ? "bg-zinc-200 dark:bg-zinc-700" : ""
              }`}
              onClick={() => onSelectEmail(email.id)}
            >
              <div className="flex-grow min-w-0 pr-2">
                <div className="font-medium text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-2">
                  <span className="truncate">{email.subject || <em>(No subject)</em>}</span>
                  {isOtp && (
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs whitespace-nowrap">
                      OTP
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  From: <span className="font-mono">{email.from}</span>
                </div>
              </div>
              <div className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                {relativeTime(email.receivedAt)}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
