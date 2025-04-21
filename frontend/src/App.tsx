import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EmailDisplay } from "@/components/EmailDisplay";
import { EmailList, EmailItem } from "@/components/EmailList";
import { EmailAddressDisplay } from "@/components/EmailAddressDisplay";
import { AlertCircle, RotateCw } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import EmailSearch from "@/components/EmailSearch";
import ExportEmailButton from "@/components/ExportEmailButton";
import { useIsMobile, useIsSmallMobile } from "@/hooks/useMediaQuery";

// Use this for local development with Vite proxy
const BACKEND_BASE_URL = "/api";

interface Inbox {
  uuid: string;
  address: string;
  expiresAt: string;
}

interface EmailDetail {
  id: number;
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
  content: string;
  deleted: boolean;
  otp?: string;
}

export default function App() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailItem[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Error state
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Live updates state and SSE ref
  const [liveConnected, setLiveConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // Responsive layout
  const isMobile = useIsMobile();
  const isSmallMobile = useIsSmallMobile();
  const [mobileView, setMobileView] = useState<'inbox' | 'detail'>('inbox');

  // Debug state
  const [debugApiResult, setDebugApiResult] = useState<string>("");

  // Handle system theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fetch/generate inbox on mount with retry
  useEffect(() => {
    const fetchInbox = async () => {
      setApiError(null);
      setLoading(true);
      console.log("Fetching inbox...", `${BACKEND_BASE_URL}/inbox`);

      try {
        const res = await fetch(`${BACKEND_BASE_URL}/inbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          console.error("Failed to create inbox", res.status, res.statusText);
          setDebugApiResult(`Error ${res.status}: ${res.statusText}`);
          throw new Error(`Failed to create inbox: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Created inbox:", data);
        setDebugApiResult(`Success: ${JSON.stringify(data)}`);

        // Ensure we're using the correct property names from the API response
        setInbox({
          uuid: data.id,
          address: data.emailAddress,
          expiresAt: data.expiresAt,
        });
      } catch (err) {
        console.error("Error creating inbox:", err);
        const error = err instanceof Error ? err : new Error("Unknown error");
        setDebugApiResult(`Error: ${error.message}`);
        setApiError(
          "Could not create a temporary email inbox. Please try again later."
        );

        // Retry logic with exponential backoff
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, retryDelay);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInbox();
  }, [retryCount]);

  // Fetch emails when inbox loaded
  useEffect(() => {
    if (!inbox || !inbox.uuid) return;

    setEmailsLoading(true);
    setApiError(null);

    fetch(`${BACKEND_BASE_URL}/inbox/${encodeURIComponent(inbox.uuid)}/emails`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch emails");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched emails:", data);
        const nonDeletedEmails = data.filter((em: EmailItem) => !em.deleted);
        setEmails(nonDeletedEmails);
        setFilteredEmails(nonDeletedEmails);
        setEmailsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching emails:", err);
        setApiError("Could not fetch emails. Please try refreshing.");
        setEmailsLoading(false);
      });
  }, [inbox]);

  // Live email updates: SSE via /api/inbox/{uuid}/stream
  useEffect(() => {
    if (!inbox || !inbox.uuid) return;

    let reconnectTimeout: NodeJS.Timeout | null = null;
    let closed = false;

    function connect() {
      if (sseRef.current) {
        sseRef.current.close();
      }

      console.log("Connecting to SSE...");
      const sse = new EventSource(
        `${BACKEND_BASE_URL}/inbox/${encodeURIComponent(inbox.uuid)}/stream`
      );
      sseRef.current = sse;

      sse.onopen = () => {
        console.log("SSE connected");
        setLiveConnected(true);
        setApiError(null);
      };

      sse.onmessage = (event) => {
        try {
          console.log("SSE message received:", event.data);
          const mail = JSON.parse(event.data);

          // Special handling for the initial connection message
          if (mail.connected) {
            console.log("SSE connection confirmed");
            if (mail.initialEmail) {
              setEmails((prev) => {
                if (mail.initialEmail.deleted) return prev;
                if (prev.some((e) => e.id === mail.initialEmail.id)) return prev;
                const updatedEmails = [mail.initialEmail, ...prev];
                setFilteredEmails(updatedEmails);
                return updatedEmails;
              });
            }
            return;
          }

          setEmails((prev) => {
            // Check for duplicate or deleted email
            if (mail.deleted) return prev;
            if (prev.some((e) => e.id === mail.id)) return prev;
            const updatedEmails = [mail, ...prev];
            setFilteredEmails(updatedEmails);
            return updatedEmails;
          });
        } catch (err) {
          console.error("Error processing SSE message:", err);
        }
      };

      sse.onerror = (error) => {
        console.error("SSE error:", error);
        setLiveConnected(false);

        if (!closed) {
          // Try to reconnect in 2 seconds if unexpected close
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      setLiveConnected(false);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (sseRef.current) sseRef.current.close();
    };
  }, [inbox]);

  // Fetch email detail when selectedEmailId changes
  useEffect(() => {
    if (!selectedEmailId) {
      setEmailDetail(null);
      return;
    }

    // On mobile, switch to detail view when an email is selected
    if (isMobile) {
      setMobileView('detail');
    }

    setDetailLoading(true);
    setApiError(null);

    fetch(`${BACKEND_BASE_URL}/email/${encodeURIComponent(selectedEmailId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch email details");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched email detail:", data);
        setEmailDetail(data);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching email detail:", err);
        setApiError("Could not fetch email details. Please try again.");
        setDetailLoading(false);
      });
  }, [selectedEmailId, isMobile]);

  const handleDeleteEmail = async (id: number) => {
    setApiError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/email/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete email");

      // Remove from email list
      setEmails((prev) => {
        const updated = prev.filter((email) => email.id !== id);
        setFilteredEmails(updated);
        return updated;
      });

      // On mobile, go back to inbox view after deleting
      if (isMobile) {
        setMobileView('inbox');
      }

      setSelectedEmailId(null);
      setEmailDetail(null);
    } catch (err) {
      console.error("Error deleting email:", err);
      setApiError("Failed to delete email. Please try again.");
    }
  };

  const handleRefresh = async () => {
    if (!inbox) return;

    setApiError(null);
    setEmailsLoading(true);

    try {
      await fetch(`${BACKEND_BASE_URL}/inbox/${encodeURIComponent(inbox.uuid)}/refresh`, {
        method: "POST",
      });

      // reload emails
      const res = await fetch(
        `${BACKEND_BASE_URL}/inbox/${encodeURIComponent(inbox.uuid)}/emails`
      );
      if (!res.ok) throw new Error("Failed to refresh emails");

      const data = await res.json();
      const nonDeletedEmails = data.filter((em: EmailItem) => !em.deleted);
      setEmails(nonDeletedEmails);
      setFilteredEmails(nonDeletedEmails);
    } catch (err) {
      console.error("Error refreshing inbox:", err);
      setApiError("Failed to refresh inbox. Please try again.");
    } finally {
      setEmailsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!inbox) return;

    setApiError(null);

    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/inbox/${encodeURIComponent(inbox.uuid)}/change`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to change email");

      const data = await res.json();
      console.log("Changed email:", data);

      setInbox({
        uuid: data.id,
        address: data.emailAddress,
        expiresAt: data.expiresAt,
      });

      setEmails([]);
      setFilteredEmails([]);
      setSelectedEmailId(null);
      setEmailDetail(null);
    } catch (err) {
      console.error("Error changing email:", err);
      setApiError("Failed to change email address. Please try again.");
    }
  };

  // Handle search results
  const handleSearchResults = (results: EmailItem[]) => {
    setFilteredEmails(results);
  };

  // Handle mobile view back button
  const handleBackToInbox = () => {
    setMobileView('inbox');
    setSelectedEmailId(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center pt-6 pb-6 px-4 transition-colors">
        <NetworkStatusBanner />

        <Card className="w-full max-w-5xl shadow-xl relative">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-semibold">
                Temporary Mail
              </CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
                <span className="text-xs text-muted-foreground select-none">
                  {darkMode ? "Dark" : "Light"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 lg:p-6">
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Error</div>
                  <div className="text-sm">{apiError}</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm bg-red-200 dark:bg-red-800 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <RotateCw size={14} />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {debugApiResult && (
              <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs">
                <div className="font-medium">Debug Info (API Response):</div>
                <div className="whitespace-pre-wrap overflow-auto max-h-32">
                  {debugApiResult}
                </div>
              </div>
            )}

            {loading && (
              <div className="py-24 flex flex-col items-center justify-center">
                <div className="animate-spin w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                <div className="mt-4 text-zinc-600 dark:text-zinc-400">
                  Creating your temporary inbox...
                </div>
              </div>
            )}

            {!loading && inbox && (
              <div className={`flex flex-col ${!isMobile ? 'lg:flex-row' : ''} gap-6`}>
                {isMobile && (
                  <>
                    {mobileView === 'inbox' ? (
                      // Mobile Inbox View
                      <div className="w-full flex flex-col gap-4">
                        {/* Email Address Display */}
                        <EmailAddressDisplay
                          emailAddress={inbox.address}
                          expiresAt={inbox.expiresAt}
                          onRefresh={handleRefresh}
                          onChangeEmail={handleChangeEmail}
                          liveConnected={liveConnected}
                        />

                        {/* Search Bar */}
                        <EmailSearch
                          emails={emails}
                          onFilteredResults={handleSearchResults}
                        />

                        {/* Inbox */}
                        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                          <div className="font-semibold text-lg p-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                            Inbox
                          </div>
                          <div className="max-h-[500px] overflow-hidden">
                            <EmailList
                              emails={filteredEmails}
                              selectedEmailId={selectedEmailId}
                              onSelectEmail={setSelectedEmailId}
                              loading={emailsLoading}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Mobile Detail View
                      <div className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 min-h-[500px]">
                        <div className="mb-4">
                          <button
                            onClick={handleBackToInbox}
                            className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md text-sm flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back to Inbox
                          </button>
                        </div>

                        {selectedEmailId && detailLoading && (
                          <div className="h-[400px] flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                          </div>
                        )}

                        {selectedEmailId && !detailLoading && emailDetail && (
                          <div className="min-h-[400px]">
                            <div className="mb-3">
                              <ExportEmailButton email={emailDetail} />
                            </div>
                            <EmailDisplay
                              id={emailDetail.id}
                              from={emailDetail.from}
                              to={emailDetail.to}
                              subject={emailDetail.subject}
                              receivedAt={emailDetail.receivedAt}
                              content={emailDetail.content}
                              onClose={handleBackToInbox}
                              onDelete={handleDeleteEmail}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Desktop View - Side by Side */}
                {!isMobile && (
                  <>
                    {/* Left Panel: Email Address and Inbox */}
                    <div className="w-full lg:w-2/5 flex flex-col gap-4">
                      {/* Email Address Display */}
                      <EmailAddressDisplay
                        emailAddress={inbox.address}
                        expiresAt={inbox.expiresAt}
                        onRefresh={handleRefresh}
                        onChangeEmail={handleChangeEmail}
                        liveConnected={liveConnected}
                      />

                      {/* Search Bar */}
                      <EmailSearch
                        emails={emails}
                        onFilteredResults={handleSearchResults}
                      />

                      {/* Inbox */}
                      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                        <div className="font-semibold text-lg p-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                          Inbox {emails.length !== filteredEmails.length ?
                                 `(${filteredEmails.length}/${emails.length})` :
                                 `(${emails.length})`}
                        </div>
                        <div className="max-h-[500px] overflow-hidden">
                          <EmailList
                            emails={filteredEmails}
                            selectedEmailId={selectedEmailId}
                            onSelectEmail={setSelectedEmailId}
                            loading={emailsLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Email Content */}
                    <div className="w-full lg:w-3/5 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 min-h-[500px]">
                      {!selectedEmailId && (
                        <div className="h-[400px] flex items-center justify-center text-center text-zinc-500">
                          <div>
                            <div className="text-xl mb-2">No email selected</div>
                            <p className="text-sm">
                              Click on an email in your inbox to view its contents.
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedEmailId && detailLoading && (
                        <div className="h-[400px] flex items-center justify-center">
                          <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                        </div>
                      )}

                      {selectedEmailId && !detailLoading && emailDetail && (
                        <div className="min-h-[400px]">
                          <div className="mb-3">
                            <ExportEmailButton email={emailDetail} />
                          </div>
                          <EmailDisplay
                            id={emailDetail.id}
                            from={emailDetail.from}
                            to={emailDetail.to}
                            subject={emailDetail.subject}
                            receivedAt={emailDetail.receivedAt}
                            content={emailDetail.content}
                            onClose={() => setSelectedEmailId(null)}
                            onDelete={handleDeleteEmail}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>

          <div className="border-t p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Temporary Mail Service - Your emails will expire in 10 minutes
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
