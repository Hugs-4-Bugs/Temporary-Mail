import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Copy, CheckCircle2 } from "lucide-react";

interface EmailDisplayProps {
  id: number;
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
  content: string;
  onClose: () => void;
  onDelete: (id: number) => void;
}

interface OtpStatus {
  hasOtp: boolean;
  otp?: string;
  expired?: boolean;
  expiresAt?: string;
}

export function EmailDisplay({
  id,
  from,
  to,
  subject,
  receivedAt,
  content,
  onClose,
  onDelete,
}: EmailDisplayProps) {
  const [otpStatus, setOtpStatus] = useState<OtpStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Fetch OTP status when email is displayed
  useEffect(() => {
    async function checkOtp() {
      try {
        setLoading(true);
        const response = await fetch(`/api/email/${id}/otp-status`);
        if (!response.ok) return;
        const data = await response.json();
        setOtpStatus(data);
      } catch (error) {
        console.error("Error checking OTP status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkOtp();
  }, [id]);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (!otpStatus?.hasOtp || otpStatus?.expired) {
      setTimeLeft(otpStatus?.expired ? "Expired" : "");
      return;
    }

    if (otpStatus && otpStatus.expiresAt) {
      function updateCountdown() {
        const now = new Date();

        if (!otpStatus || !otpStatus.expiresAt) return;

        const expire = new Date(otpStatus.expiresAt);
        const diff = Math.max(0, Math.floor((expire.getTime() - now.getTime()) / 1000));

        if (diff <= 0) {
          setTimeLeft("Expired");
          setOtpStatus(prev => (prev ? { ...prev, expired: true } : prev));
          return;
        }

        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setTimeLeft(`Expires in ${minutes}:${seconds.toString().padStart(2, "0")}`);
      }

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft("Valid for 10 minutes");
    }
  }, [otpStatus]);

  // Highlight OTP in content if present
  const highlightOtp = (content: string, otp?: string) => {
    if (!otp) return content;

    const regex = new RegExp(`(\\b${otp}\\b)`, "g");
    return content.replace(
      regex,
      `<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-bold">$1</span>`
    );
  };

  const sanitizedContent =
    otpStatus?.hasOtp && otpStatus?.otp
      ? DOMPurify.sanitize(highlightOtp(content, otpStatus.otp))
      : DOMPurify.sanitize(content);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
    }
  };

  const copyOtp = () => {
    if (otpStatus?.otp) {
      navigator.clipboard.writeText(otpStatus.otp);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      formatted: date.toLocaleString(),
      relative: formatDistanceToNow(date, { addSuffix: true }),
    };
  };

  const { formatted, relative } = formatDate(receivedAt);

  const getSenderInfo = (fromEmail: string) => {
    try {
      const atIndex = fromEmail.indexOf("@");
      if (atIndex === -1) return { name: fromEmail, domain: "" };

      let name = fromEmail.substring(0, atIndex);
      const domain = fromEmail.substring(atIndex + 1);

      name = name
        .replace(/\./g, " ")
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (/^no-?reply/.test(name.toLowerCase())) {
        name = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
      }

      return { name, domain };
    } catch (e) {
      return { name: fromEmail, domain: "" };
    }
  };

  const { name: senderName, domain: senderDomain } = getSenderInfo(from);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center border-b pb-3 mb-3">
        <h3 className="text-lg font-semibold">{subject || "(No subject)"}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
        <div className="flex items-center">
          <span className="font-medium w-16">From:</span>
          <div>
            <span className="font-semibold">{senderName}</span>
            {senderDomain && (
              <span className="text-gray-500">
                {" <"}
                {from}
                {">"}
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="font-medium w-16">To:</span> {to}
        </div>
        <div className="flex justify-between">
          <div>
            <span className="font-medium">Date:</span> {formatted}
          </div>
          <div className="text-gray-500">{relative}</div>
        </div>
      </div>

      {otpStatus?.hasOtp && (
        <div
          className={`my-3 p-4 rounded-md text-sm ${
            otpStatus.expired
              ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
          }`}
        >
          <div className="font-medium text-base mb-2">One-Time Password</div>
          <div className="flex justify-between items-center">
            <div className="font-mono font-bold text-xl tracking-wide">{otpStatus.otp}</div>
            <button
              onClick={copyOtp}
              className={`p-1.5 rounded-full ${
                codeCopied
                  ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                  : "hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300"
              }`}
              title="Copy to clipboard"
              type="button"
            >
              {codeCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div
            className={`text-xs mt-1 ${
              otpStatus.expired ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            }`}
          >
            {codeCopied ? "Copied to clipboard!" : timeLeft}
          </div>
        </div>
      )}

      <div
        className="flex-grow overflow-auto p-4 rounded bg-white dark:bg-slate-800 my-3 border border-gray-100 dark:border-gray-700 email-content prose dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200 prose-p:text-zinc-600 dark:prose-p:text-zinc-300"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      <div className="flex justify-end mt-4">
        <button
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={deleting}
          type="button"
        >
          <Trash2 size={16} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
