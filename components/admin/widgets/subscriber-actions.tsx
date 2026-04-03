"use client";

import { useState } from "react";

export function SubscriberActions() {
  const [exporting, setExporting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/subscribers/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          res.headers
            .get("Content-Disposition")
            ?.split("filename=")[1] || "subscribers.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/subscribers/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      if (res.ok) {
        setSendResult("Test email sent successfully");
        setTestEmail("");
      } else {
        const data = await res.json();
        setSendResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setSendResult(`Error: ${err}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex items-center gap-3">
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="px-4 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Test Email */}
      <div>
        <p className="text-body-xs text-text-muted mb-2">
          Send a test email to verify delivery
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
          />
          <button
            onClick={sendTestEmail}
            disabled={sending || !testEmail.trim()}
            className="px-4 py-2 rounded-lg bg-accent text-black text-body-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Test"}
          </button>
        </div>
        {sendResult && (
          <p
            className={`text-body-xs mt-2 ${
              sendResult.startsWith("Error")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {sendResult}
          </p>
        )}
      </div>
    </div>
  );
}
