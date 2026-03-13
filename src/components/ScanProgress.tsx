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
}

const STEPS = [
  { key: "browser", label: "Acquiring browser" },
  { key: "page", label: "Loading page" },
  { key: "axe", label: "Running axe-core" },
  { key: "cdp", label: "Running CDP checks" },
  { key: "pa11y", label: "Running pa11y" },
  { key: "merge", label: "Merging results" },
  { key: "intelligence", label: "Enriching with intelligence" },
] as const;

const TOTAL_STEPS = STEPS.length;

function formatStepDetail(key: string, info: StepInfo): string | null {
  if (key === "axe" && info.found !== undefined) return `${info.found} found`;
  if (key === "cdp" && info.found !== undefined) return `${info.found} found`;
  if (key === "pa11y" && info.found !== undefined) return `${info.found} found`;
  if (key === "merge" && info.merged !== undefined) {
    return `${info.merged} unique (axe: ${info.axe ?? 0}, cdp: ${info.cdp ?? 0}, pa11y: ${info.pa11y ?? 0})`;
  }
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
}

export default function ScanProgress({ isScanning }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("Preparing...");
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const seenDoneRef = useRef<Set<string>>(new Set());
  const progressRef = useRef<HTMLDivElement>(null);

  // Reset state when scanning starts/stops
  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      setCurrentStepLabel("Preparing...");
      setCompletedSteps([]);
      seenDoneRef.current = new Set();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed((Date.now() - startTimeRef.current) / 1000);
        }
      }, 100);

      // Move focus to progress region when scan starts
      requestAnimationFrame(() => {
        progressRef.current?.focus();
      });
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

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

    for (const step of STEPS) {
      const info = steps[step.key];
      if (!info) continue;

      if (info.status === "done" && !seenDoneRef.current.has(step.key)) {
        seenDoneRef.current.add(step.key);
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
        const res = await fetch("/api/progress");
        if (res.ok) {
          const data: ProgressData = await res.json();
          processSnapshot(data);
        }
      } catch {
        // ignore
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 400);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isScanning, processSnapshot]);

  const doneCount = completedSteps.length;
  const allDone = doneCount >= TOTAL_STEPS;

  if (!isScanning) return null;

  return (
    <div
      ref={progressRef}
      tabIndex={-1}
      aria-label="Scan progress"
      className="w-full max-w-2xl outline-none"
    >
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        {/* Header: Step X of 7 + elapsed */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {allDone ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 motion-reduce:transition-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none flex-shrink-0" aria-hidden="true" />
            )}
            <span className={`text-sm font-bold truncate ${allDone ? "text-emerald-700" : "text-slate-800"}`}>
              {allDone
                ? "Scan complete — loading results..."
                : `Step ${doneCount + 1} of ${TOTAL_STEPS}`}
            </span>
          </div>
          <span className="flex-shrink-0 text-xs font-medium text-slate-500 tabular-nums">
            {elapsed.toFixed(1)}s
          </span>
        </div>

        {/* Current step label — isolated aria-live so only this text is announced */}
        {!allDone && (
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm font-semibold text-indigo-700 mb-3 motion-reduce:transition-none"
          >
            {currentStepLabel}
          </p>
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
            className={`h-full rounded-full transition-all duration-500 ease-out motion-reduce:transition-none ${allDone ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${(doneCount / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Completed steps feed */}
        {completedSteps.length > 0 && (
          <div className="space-y-1.5">
            {completedSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-xs motion-reduce:animate-none animate-in fade-in-0 slide-in-from-top-1 duration-300">
                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
