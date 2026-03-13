"use client";

import { useEffect, useState, useRef, use } from "react";
import type { ScanResult } from "@/types/scan";
import ScanProgress from "@/components/ScanProgress";
import { AuditResults } from "@/components/AuditResults";
import Link from "next/link";

type ScanPageStatus = "loading" | "scanning" | "completed" | "error" | "not_found";

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = use(params);
  const [status, setStatus] = useState<ScanPageStatus>("loading");
  const [result, setResult] = useState<ScanResult["data"] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        const data = await res.json();

        if (cancelled) return;

        if (!data.success && res.status === 404) {
          setStatus("not_found");
          stopPolling();
          return;
        }

        if (data.status === "scanning") {
          setStatus("scanning");
          return;
        }

        if (data.status === "error") {
          setStatus("error");
          setErrorMessage(data.error || "Scan failed.");
          stopPolling();
          return;
        }

        if (data.status === "completed" && data.data) {
          setResult(data.data);
          setStatus("completed");
          stopPolling();
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Failed to load scan results.");
          stopPolling();
        }
      }
    };

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Initial fetch
    fetchResult();

    // Poll while scanning
    pollRef.current = setInterval(fetchResult, 2000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [scanId]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        New Scan
      </Link>

      {status === "loading" && (
        <div className="text-center py-20">
          <span className="w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin inline-block" />
          <p className="text-sm text-slate-500 mt-4">Loading scan...</p>
        </div>
      )}

      {status === "scanning" && (
        <ScanProgress isScanning={true} scanComplete={false} />
      )}

      {status === "completed" && result && (
        <AuditResults
          result={result}
          onRunNewTest={() => window.location.assign("/")}
        />
      )}

      {status === "error" && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-100 mb-4">
            <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Scan Failed</h2>
          <p className="text-sm text-rose-600 mb-6">{errorMessage}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Try Again
          </Link>
        </div>
      )}

      {status === "not_found" && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Scan Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">This scan ID does not exist or has expired.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Run a New Scan
          </Link>
        </div>
      )}
    </main>
  );
}
