"use client";

import { useEffect, useState, useRef } from "react";

interface StepInfo {
  status: "pending" | "running" | "done" | "error";
  updatedAt?: string;
  found?: number;
  axe?: number;
  cdp?: number;
  pa11y?: number;
  merged?: number;
  enriched?: number;
  fixCodes?: number;
  frameworkNotes?: number;
  guardrails?: number;
  relatedRules?: number;
  totalEnrichments?: number;
}

interface ProgressData {
  steps: Record<string, StepInfo>;
  currentStep: string | null;
}

const STEPS = [
  { key: "browser", label: "Acquiring browser" },
  { key: "page", label: "Loading page" },
  { key: "axe", label: "Running axe-core" },
  { key: "cdp", label: "Running CDP checks" },
  { key: "pa11y", label: "Running pa11y" },
  { key: "merge", label: "Merging results" },
  { key: "intelligence", label: "Processing with Intelligence" },
  { key: "sonnet", label: "Processing with Sonnet", subtitle: "(available with API key)" },
] as const;

interface ScanProgressProps {
  isScanning: boolean;
  scanComplete: boolean;
}

export default function ScanProgress({ isScanning, scanComplete }: ScanProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);

  // Start/stop elapsed timer
  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      setFinalElapsed(null);

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed((Date.now() - startTimeRef.current) / 1000);
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (startTimeRef.current && elapsed > 0) {
        setFinalElapsed(elapsed);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  // Poll progress
  useEffect(() => {
    if (!isScanning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch("/api/progress");
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
        }
      } catch {
        // ignore polling errors
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 800);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isScanning]);

  const showComponent = isScanning || scanComplete;
  if (!showComponent) return null;

  const steps = progress?.steps || {};
  const displayElapsed = finalElapsed ?? elapsed;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Scan progress"
      className="w-full max-w-xl mx-auto mt-8"
    >
      <div className="premium-card p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-5">
          Scan Progress
        </h3>
        <ol className="space-y-3" aria-label="Scan steps">
          {STEPS.map((step) => {
            const isSonnet = step.key === "sonnet";
            const info = steps[step.key] as StepInfo | undefined;
            const status = isSonnet ? "skipped" : (info?.status || "pending");

            return (
              <li
                key={step.key}
                className={`flex flex-col gap-1.5 ${isSonnet ? "opacity-50" : ""}`}
                aria-current={status === "running" ? "step" : undefined}
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {status === "done" && (
                      <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {status === "running" && (
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    )}
                    {status === "pending" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                    )}
                    {status === "skipped" && (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 ring-2 ring-slate-200" aria-hidden="true" />
                    )}
                    {status === "error" && (
                      <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`flex-1 ${
                      status === "running"
                        ? "text-blue-700 font-semibold"
                        : status === "done"
                          ? "text-slate-500"
                          : status === "skipped"
                            ? "text-slate-400 line-through"
                            : "text-slate-400"
                    }`}
                  >
                    {step.label}
                    {"subtitle" in step && step.subtitle && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400 no-underline" style={{ textDecoration: "none" }}>
                        {step.subtitle}
                      </span>
                    )}
                  </span>
                  {status === "done" && info?.found !== undefined && step.key !== "intelligence" && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {info.found} found
                    </span>
                  )}
                  {status === "done" && step.key === "merge" && info?.merged !== undefined && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {info.merged} unique
                    </span>
                  )}
                  {status === "done" && step.key === "intelligence" && info?.enriched !== undefined && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {info.enriched} enriched
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Duration & Status footer */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
              Test Duration
            </p>
            <p className="text-lg font-extrabold text-slate-800 tabular-nums">
              {displayElapsed.toFixed(1)}s
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
              Status
            </p>
            {scanComplete ? (
              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 justify-end">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                completed
              </p>
            ) : (
              <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5 justify-end">
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                scanning
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
