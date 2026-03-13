"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ScanStatus } from "@/types/scan";
import { AuditForm } from "@/components/AuditForm";
import ScanProgress from "@/components/ScanProgress";


export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingScanId, setPendingScanId] = useState<string | null>(null);
  const delayResolveRef = useRef<(() => void) | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);

  const isScanning = status === "running";

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setScanError(null);
    setPendingScanId(null);
  }, []);

  const handleSkipDelay = useCallback(() => {
    if (delayResolveRef.current) {
      delayResolveRef.current();
      delayResolveRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(async (targetUrl: string, githubRepoUrl: string, axeTags: string[]) => {
    setStatus("running");
    setErrorMessage("");
    setScanError(null);
    setPendingScanId(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          githubRepoUrl: githubRepoUrl || undefined,
          axeTags: axeTags.length > 0 ? axeTags : undefined,
        }),
      });

      const data = await response.json();

      if (data.scanId) {
        setPendingScanId(data.scanId);
        // Pause 3s so user can read final progress — skippable via "View results now"
        await new Promise<void>((resolve) => {
          delayResolveRef.current = resolve;
          setTimeout(resolve, 3000);
        });
        delayResolveRef.current = null;
        router.push(`/scan/${data.scanId}`);
        return;
      }

      if (!data.success) {
        setScanError(data.error ?? "Unknown error during scan.");
        return;
      }
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    }
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <a
        href="#target-url"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded focus:shadow-lg"
      >
        Skip to scan form
      </a>

      {/* Form — animates out when scanning */}
      <div
        className={`transition-all duration-500 ease-out motion-reduce:transition-none w-full flex justify-center ${
          isScanning
            ? "opacity-0 -translate-y-4 motion-reduce:translate-y-0 max-h-0 overflow-hidden pointer-events-none"
            : "opacity-100 translate-y-0 max-h-[2000px]"
        }`}
      >
        <AuditForm status={status} errorMessage={errorMessage} onSubmit={handleSubmit} />
      </div>

      {/* Progress — animates in when scanning */}
      <div
        className={`transition-all duration-500 ease-out motion-reduce:transition-none w-full flex justify-center ${
          isScanning
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 motion-reduce:translate-y-0 max-h-0 overflow-hidden pointer-events-none"
        }`}
      >
        <ScanProgress
          isScanning={isScanning}
          scanId={pendingScanId}
          scanError={scanError}
          onSkipDelay={handleSkipDelay}
          onRetry={handleRetry}
        />
      </div>

    </main>
  );
}
