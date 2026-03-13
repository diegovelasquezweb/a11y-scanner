"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface StepInfo {
  status: "pending" | "running" | "done" | "error";
  updatedAt?: string;
  found?: number;
  axe?: number;
  cdp?: number;
  pa11y?: number;
  merged?: number;
  enriched?: number;
}

interface ProgressData {
  steps: Record<string, StepInfo>;
  currentStep: string | null;
  scanId?: string;
}

const STEPS = [
  { key: "page", label: "Loading website" },
  { key: "axe", label: "Running accessibility scans" },
  { key: "cdp", label: "Checking dynamic content" },
  { key: "pa11y", label: "Analyzing rendered HTML" },
  { key: "merge", label: "Processing results" },
  { key: "intelligence", label: "Powering up your report" },
] as const;

const TOTAL_STEPS = STEPS.length;

function formatStepDetail(key: string, info: StepInfo): string | null {
  if (key === "axe" && info.found !== undefined) return `${info.found} found`;
  if (key === "cdp" && info.found !== undefined) return `${info.found} found`;
  if (key === "pa11y" && info.found !== undefined) return `${info.found} found`;
  if (key === "intelligence" && info.enriched !== undefined) return `${info.enriched} enriched`;
  return null;
}

interface CompletedStep {
  key: string;
  label: string;
  detail: string | null;
}

interface ScanProgressProps {
  isScanning: boolean;
  initialScanId?: string | null;
  scanStartTime?: number | null;
  scanError?: string | null;
  onRetry?: () => void;
}

export default function ScanProgress({ isScanning, initialScanId, scanStartTime, scanError, onRetry }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("Loading website");
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [scanId, setScanId] = useState<string | null>(initialScanId || null);

  const [failedStep, setFailedStep] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(scanStartTime || null);
  const seenDoneRef = useRef<Set<string>>(new Set());
  const progressRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Sync startTimeRef if scanStartTime prop changes
  useEffect(() => {
    if (scanStartTime) {
      startTimeRef.current = scanStartTime;
    }
  }, [scanStartTime]);

  // Timer for elapsed time
  useEffect(() => {
    if (!isScanning) return;

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }
    }, 100);

    requestAnimationFrame(() => {
      progressRef.current?.focus();
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isScanning]);

  const processSnapshot = useCallback((data: ProgressData) => {
    const steps = data.steps || {};
    let runningLabel: string | null = null;

    // Capture scanId from progress data
    if (data.scanId) {
      setScanId(data.scanId);
    }

    for (const step of STEPS) {
      const info = steps[step.key];
      if (!info) continue;

      if (info.status === "done" && !seenDoneRef.current.has(step.key)) {
        seenDoneRef.current.add(step.key);
        setDoneCount(seenDoneRef.current.size);
        setCompletedSteps((prev) => [
          ...prev,
          {
            key: step.key,
            label: step.label,
            detail: formatStepDetail(step.key, info),
          },
        ]);
      }

      if (info.status === "running") {
        runningLabel = step.label;
      }

      if (info.status === "error") {
        setFailedStep(step.label);
      }
    }

    if (runningLabel) {
      setCurrentStepLabel(runningLabel);
    }
  }, []);

  // Poll progress — 400ms
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
        const id = scanId || initialScanId;
        const url = id ? `/api/progress?scanId=${encodeURIComponent(id)}` : "/api/progress";
        const res = await fetch(url);
        if (res.ok) {
          const data: ProgressData = await res.json();
          processSnapshot(data);
        }
      } catch {
        // ignore
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isScanning, processSnapshot, scanId, initialScanId]);

  const allDone = doneCount >= TOTAL_STEPS;
  const hasError = !!(scanError || failedStep);

  // Stop timer when scan completes and save final time
  useEffect(() => {
    if (allDone && timerRef.current) {
      if (startTimeRef.current) {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [allDone]);

  // Auto-redirect to results after 3 seconds
  useEffect(() => {
    if (allDone && !hasError && scanId) {
      const timeout = setTimeout(() => {
        window.location.href = `/scan/${scanId}`;
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [allDone, hasError, scanId]);

  // Focus error message when error appears
  useEffect(() => {
    if (hasError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [hasError]);

  // Stop polling when error occurs
  useEffect(() => {
    if (hasError && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [hasError]);

  if (!isScanning) return null;

  return (
    <div
      ref={progressRef}
      tabIndex={-1}
      aria-label="Scan progress"
      className="w-full max-w-2xl outline-none"
    >
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-md px-5 py-4 shadow-sm">
        {/* Header: Step X of 7 + elapsed */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {hasError ? (
              <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : allDone ? (
              <svg className="w-4 h-4 text-emerald-500 shrink-0 motion-reduce:transition-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
            )}
            <span className={`text-sm font-bold truncate ${hasError ? "text-rose-700" : allDone ? "text-emerald-700" : "text-slate-800"}`}>
              {hasError
                ? `Failed at: ${failedStep || currentStepLabel}`
                : allDone
                  ? "Scan complete — loading results..."
                  : `Step ${doneCount + 1} of ${TOTAL_STEPS}`}
            </span>
          </div>
          <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        </div>

        {/* Current step label — isolated aria-live so only this text is announced */}
        {!allDone && !hasError && (
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-semibold text-sky-700 mb-3 motion-reduce:transition-none"
          >
            {currentStepLabel}
          </p>
        )}

        {/* Error message + retry */}
        {hasError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mb-3 outline-none"
          >
            {scanError && (
              <p className="text-sm text-rose-600 mb-2">{scanError}</p>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-800 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:ring-offset-2 rounded"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try again
              </button>
            )}
          </div>
        )}

        {/* Progressbar — semantic */}
        <div
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`${doneCount} of ${TOTAL_STEPS} steps completed`}
          className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none ${hasError ? "bg-rose-500" : allDone ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${(doneCount / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Completed steps feed */}
        {completedSteps.length > 0 && (
          <div className="space-y-1.5">
            {completedSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-xs motion-reduce:animate-none animate-in fade-in-0 slide-in-from-top-1 duration-300">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-600">{step.label}</span>
                {step.detail && (
                  <span className="text-slate-500 tabular-nums">{step.detail}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
