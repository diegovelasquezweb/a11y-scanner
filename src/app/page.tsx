"use client";

import { useState, useCallback } from "react";
import type { ScanStatus, EngineSelection, AdvancedScanOptions } from "@/types/scan";
import { AuditForm } from "@/components/AuditForm";
import ScanProgress from "@/components/ScanProgress";

export default function Home() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [activeEngines, setActiveEngines] = useState<EngineSelection>({ axe: true, cdp: true, pa11y: true });

  const isScanning = status === "running";

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setScanError(null);
    setPendingScanId(null);
    setScanStartTime(null);
    setActiveEngines({ axe: true, cdp: true, pa11y: true });
  }, []);

  const handleSubmit = useCallback(async (targetUrl: string, githubRepoUrl: string, axeTags: string[], engines: EngineSelection, advanced: AdvancedScanOptions) => {
    setStatus("running");
    setErrorMessage("");
    setScanError(null);
    setPendingScanId(null);
    setScanStartTime(Date.now());
    setActiveEngines(engines);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          githubRepoUrl: githubRepoUrl || undefined,
          axeTags: axeTags.length > 0 ? axeTags : undefined,
          engines,
          advanced,
        }),
      });

      let data: { success?: boolean; scanId?: string; error?: string } = {};
      try {
        data = await response.json();
      } catch {
        setScanError(`Server error (${response.status}). Please try again.`);
        setStatus("idle");
        return;
      }

      if (data.scanId) {
        setPendingScanId(data.scanId);
        return;
      }

      if (!data.success) {
        setScanError(data.error ?? "Unknown error during scan.");
        setStatus("idle");
        return;
      }
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      setStatus("idle");
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <a
        href="#target-url"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded focus:shadow-lg"
      >
        Skip to scan form
      </a>

      <div
        className={`transition-all duration-500 ease-out motion-reduce:transition-none w-full flex justify-center ${
          isScanning
            ? "opacity-0 -translate-y-4 motion-reduce:translate-y-0 max-h-0 overflow-hidden pointer-events-none"
            : "opacity-100 translate-y-0 max-h-500"
        }`}
      >
        <AuditForm status={status} errorMessage={errorMessage} onSubmit={handleSubmit} />
      </div>

      <div
        className={`transition-all duration-500 ease-out motion-reduce:transition-none w-full flex justify-center ${
          isScanning
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 motion-reduce:translate-y-0 max-h-0 overflow-hidden pointer-events-none"
        }`}
      >
        <ScanProgress
          isScanning={isScanning}
          initialScanId={pendingScanId}
          scanStartTime={scanStartTime}
          scanError={scanError}
          onRetry={handleRetry}
          activeEngines={activeEngines}
        />
      </div>
    </main>
  );
}
