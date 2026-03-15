"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { CircleX, CircleCheck, RefreshCw } from "lucide-react";

interface EngineSelection {
  axe: boolean;
  cdp: boolean;
  pa11y: boolean;
}

interface StepInfo {
  status: "pending" | "running" | "done" | "error";
  updatedAt?: string;
}

interface ProgressData {
  steps: Record<string, StepInfo>;
  currentStep: string | null;
  scanId?: string;
}

const ALL_STEPS = [
  { key: "page", label: "Loading website", engine: null },
  { key: "axe", label: "Running accessibility scans", engine: "axe" as const },
  { key: "cdp", label: "Checking dynamic content", engine: "cdp" as const },
  { key: "pa11y", label: "Analyzing rendered HTML", engine: "pa11y" as const },
  { key: "merge", label: "Processing results", engine: null },
  { key: "intelligence", label: "Powering up your report", engine: null },
] as const;

interface CompletedStep {
  key: string;
  label: string;
}

interface ScanProgressProps {
  isScanning: boolean;
  initialScanId?: string | null;
  scanStartTime?: number | null;
  scanError?: string | null;
  onRetry?: () => void;
  activeEngines?: EngineSelection;
}

export default function ScanProgress({ isScanning, initialScanId, scanStartTime, scanError, onRetry, activeEngines }: ScanProgressProps) {
  const engines = activeEngines ?? { axe: true, cdp: true, pa11y: true };

  const STEPS = useMemo(() =>
    ALL_STEPS.filter((step) => {
      if (!step.engine) return true;
      return engines[step.engine];
    }), [engines]);

  const TOTAL_STEPS = STEPS.length;

  const activeStepKeys = useMemo(() => new Set<string>(STEPS.map((s) => s.key)), [STEPS]);

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

  useEffect(() => {
    if (scanStartTime) {
      startTimeRef.current = scanStartTime;
    }
  }, [scanStartTime]);

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

    if (data.scanId) {
      setScanId(data.scanId);
    }

    for (const step of STEPS) {
      if (!activeStepKeys.has(step.key)) continue;

      const info = steps[step.key];
      if (!info) continue;

      if (info.status === "done" && !seenDoneRef.current.has(step.key)) {
        seenDoneRef.current.add(step.key);
        // Count only active steps
        const activeDone = [...seenDoneRef.current].filter((k) => activeStepKeys.has(k)).length;
        setDoneCount(activeDone);
        setCompletedSteps((prev) => [
          ...prev,
          {
            key: step.key,
            label: step.label,
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
  }, [STEPS, activeStepKeys]);

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

  useEffect(() => {
    if (allDone && timerRef.current) {
      if (startTimeRef.current) {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [allDone]);

  useEffect(() => {
    if (allDone && !hasError && scanId) {
      const timeout = setTimeout(() => {
        window.location.href = `/scan/${scanId}`;
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [allDone, hasError, scanId]);

  useEffect(() => {
    if (hasError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [hasError]);

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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {hasError ? (
              <CircleX className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
            ) : allDone ? (
              <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0 motion-reduce:transition-none" aria-hidden="true" />
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

        {!allDone && !hasError && (
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-semibold text-sky-700 mb-3 motion-reduce:transition-none"
          >
            {currentStepLabel}
          </p>
        )}

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
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Try again
              </button>
            )}
          </div>
        )}

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

        {completedSteps.length > 0 && (
          <div className="space-y-1.5">
            {completedSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-xs motion-reduce:animate-none animate-in fade-in-0 slide-in-from-top-1 duration-300">
                <CircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span className="text-slate-600">{step.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
