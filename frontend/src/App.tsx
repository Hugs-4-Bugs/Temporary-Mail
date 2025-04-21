import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import DOMPurify from "dompurify";

const BACKEND_BASE_URL = "/api";

interface Inbox {
  uuid: string;
  address: string;
  expiresAt: string;
}

interface Email {
  id: number;
  from: string;
  subject: string;
  receivedAt: string;
  deleted: boolean;
}

interface EmailDetail {
  id: number;
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
  content: string;
  deleted: boolean;
}

function relativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString();
}

export default function App() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Handle system theme changes (optional enhancement)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fetch/generate inbox on mount
  useEffect(() => {
    fetch(`${BACKEND_BASE_URL}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setInbox(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch emails when inbox loaded
  useEffect(() => {
    if (!inbox) return;
    setEmailsLoading(true);
    fetch(`${BACKEND_BASE_URL}/inbox/${inbox.uuid}/emails`)
      .then((res) => res.json())
      .then((data) => {
        setEmails(data.filter((em: Email) => !em.deleted));
        setEmailsLoading(false);
      })
      .catch(() => setEmailsLoading(false));
  }, [inbox]);

  // Fetch email detail when selectedEmailId changes
  useEffect(() => {
    if (!selectedEmailId) {
      setEmailDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`${BACKEND_BASE_URL}/email/${selectedEmailId}`)
      .then((res) => res.json())
      .then((data) => {
        setEmailDetail(data);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
  }, [selectedEmailId]);

  const handleCopy = () => {
    if (inbox) {
      navigator.clipboard.writeText(inbox.address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center pt-16 transition-colors">
      <Card className="w-full max-w-lg shadow-xl relative">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">Temporary Mail</CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                aria-label="Toggle dark mode"
              />
              <span className="text-xs text-muted-foreground select-none">{darkMode ? "Dark" : "Light"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-center my-8">Loading...</div>}
          {!loading && inbox && (
            <div className="flex flex-col gap-4 items-center w-full">
              <div className="flex gap-2 items-center">
                <span className="font-mono text-lg text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded">
                  {inbox.address}
                </span>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
              {copySuccess && (
                <span className="text-green-600 text-sm">Copied!</span>
              )}
              {/* Refresh, Change address, Countdown coming next */}
              <div className="mt-4 w-full">
                <div className="font-semibold text-lg mb-1">Inbox</div>
                {emailsLoading && <div className="py-8 text-center">Loading messages...</div>}
                {!emailsLoading && emails.length === 0 && <div className="py-8 text-zinc-500 text-center">No emails yet.</div>}
                {!emailsLoading && emails.length > 0 && (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {emails.map((email) => (
                      <li key={email.id}>
                        <button
                          className={`flex w-full text-left items-center justify-between px-2 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition focus:outline-none ${selectedEmailId === email.id ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
                          onClick={() => setSelectedEmailId(email.id)}
                        >
                          <div>
                            <div className="font-medium text-zinc-800 dark:text-zinc-100 truncate max-w-xs">{email.subject || <em>(No subject)</em>}</div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">From: <span className="font-mono">{email.from}</span></div>
                          </div>
                          <div className="text-xs text-zinc-500">{relativeTime(email.receivedAt)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Detail side panel/modal */}
        {selectedEmailId && (
          <div
            ref={detailPanelRef}
            className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
            onClick={e => { if (e.target === detailPanelRef.current) setSelectedEmailId(null); }}
          >
            <div className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-md mx-auto rounded-lg shadow-xl p-6 relative">
              <button
                className="absolute top-2 right-2 text-zinc-700 dark:text-zinc-300 hover:text-red-600 text-xl font-bold"
                onClick={() => setSelectedEmailId(null)}
                aria-label="Close"
              >×</button>
              {detailLoading && <div className="text-center text-zinc-500">Loading…</div>}
              {!detailLoading && emailDetail && (
                <>
                  <div className="mb-2 flex flex-col gap-1">
                    <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{emailDetail.subject || <em>(No subject)</em>}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">From: <span className="font-mono">{emailDetail.from}</span></div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">To: <span className="font-mono">{emailDetail.to}</span></div>
                    <div className="text-xs text-zinc-500">{relativeTime(emailDetail.receivedAt)}</div>
                  </div>
                  <div
                    className="my-4 px-2 prose prose-zinc dark:prose-invert max-w-full overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailDetail.content) }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
