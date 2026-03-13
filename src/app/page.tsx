"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ScanStatus } from "@/types/scan";
import { AuditForm } from "@/components/AuditForm";
import ScanProgress from "@/components/ScanProgress";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = useCallback(async (targetUrl: string, githubRepoUrl: string, axeTags: string[]) => {
    setStatus("running");
    setErrorMessage("");

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
        // Redirect to scan results page
        router.push(`/scan/${data.scanId}`);
        return;
      }

      if (!data.success) {
        setStatus("error");
        setErrorMessage(data.error ?? "Unknown error during scan.");
        return;
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    }
  }, [router]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <a
        href="#scan-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to scan form
      </a>

      <AuditForm status={status} errorMessage={errorMessage} onSubmit={handleSubmit} />

      <ScanProgress isScanning={status === "running"} scanComplete={false} />
    </main>
  );
}
