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

  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changing, setChanging] = useState(false);

  const [timeLeft, setTimeLeft] = useState<string>("");

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

  // Countdown timer for inbox expiration
  useEffect(() => {
    if (!inbox?.expiresAt) {
      setTimeLeft("");
      return;
    }
    function updateCountdown() {
      const now = new Date();
      const expire = new Date(inbox.expiresAt);
      const diff = Math.max(0, Math.floor((expire.getTime() - now.getTime()) / 1000));
      if (diff <= 0) return setTimeLeft("Expired");
      const min = String(Math.floor(diff/60)).padStart(2, "0");
      const sec = String(diff%60).padStart(2, "0");
      setTimeLeft(`Expires in ${min}:${sec}`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [inbox?.expiresAt]);

  const handleCopy = () => {
    if (inbox) {
      navigator.clipboard.writeText(inbox.address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/email/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error('Failed to delete.');
      // Remove from email list
      setEmails(prev => prev.filter(email => email.id !== id));
      setSelectedEmailId(null);
      setEmailDetail(null);
    } catch (err) {
      alert('Failed to delete email.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    if (!inbox) return;
    setRefreshing(true);
    try {
      await fetch(`${BACKEND_BASE_URL}/inbox/${inbox.uuid}/refresh`, { method: 'POST' });
      // reload emails
      setEmailsLoading(true);
      const res = await fetch(`${BACKEND_BASE_URL}/inbox/${inbox.uuid}/emails`);
      const data = await res.json();
      setEmails(data.filter((em: Email) => !em.deleted));
    } catch {
      alert('Failed to refresh inbox.');
    } finally {
      setRefreshing(false);
      setEmailsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!inbox) return;
    setChanging(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/inbox/${inbox.uuid}/change`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to change email');
      const newInbox = await res.json();
      setInbox(newInbox);
      setEmails([]);
      setSelectedEmailId(null);
      setEmailDetail(null);
    } catch {
      alert('Failed to change email address.');
    } finally {
      setChanging(false);
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleChangeEmail}
                  disabled={changing}
                  aria-label="Change email address"
                >
                  <svg viewBox="0 0 20 20" className={changing ? "animate-spin w-4 h-4" : "w-4 h-4"} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.657 16.657A8 8 0 1 1 19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh inbox"
                >
                  <svg className={refreshing ? "animate-spin w-4 h-4" : "w-4 h-4"} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4v5h.582M19 11c0 4.418-3.582 8-8 8a8 8 0 1 1 6.219-12.906" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                {timeLeft && (
                  <span className={`text-xs ml-2 px-2 py-0.5 rounded ${timeLeft==="Expired" ? 'bg-red-100 text-red-600 dark:bg-red-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100'} transition-all`}>
                    {timeLeft}
                  </span>
                )}
              </div>
              {copySuccess && (
                <span className="text-green-600 text-sm">Copied!</span>
              )}
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
                  <div className="flex justify-end mt-4">
                    <Button
                      variant="destructive"
                      disabled={deleting}
                      onClick={() => handleDeleteEmail(emailDetail.id)}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
