"use client";

import { useEffect, useState, useRef, useMemo } from "react";

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

function formatStepDetail(key: string, info: StepInfo): string | null {
  if (info.status !== "done") return null;
  if (key === "axe" && info.found !== undefined) return `${info.found} found`;
  if (key === "cdp" && info.found !== undefined) return `${info.found} found`;
  if (key === "pa11y" && info.found !== undefined) return `${info.found} found`;
  if (key === "merge" && info.merged !== undefined) {
    return `${info.merged} unique (axe: ${info.axe ?? 0}, cdp: ${info.cdp ?? 0}, pa11y: ${info.pa11y ?? 0})`;
  }
  if (key === "intelligence" && info.enriched !== undefined) return `${info.enriched} enriched`;
  return null;
}

interface ScanProgressProps {
  isScanning: boolean;
}

export default function ScanProgress({ isScanning }: ScanProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (isScanning) {
      startTimeRef.current = Date.now();
      setElapsed(0);
      setProgress(null);

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
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
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

  const steps = progress?.steps || {};

  // Completed steps with details (most recent first)
  const completedSteps = useMemo(() => {
    return STEPS
      .filter((s) => steps[s.key]?.status === "done")
      .map((s) => ({
        ...s,
        detail: formatStepDetail(s.key, steps[s.key]),
      }))
      .reverse();
  }, [steps]);

  // Current running step
  const currentStep = useMemo(() => {
    return STEPS.find((s) => steps[s.key]?.status === "running") ?? null;
  }, [steps]);

  // Compute step progress
  const doneCount = completedSteps.length;
  const totalSteps = STEPS.length;

  if (!isScanning) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Scan progress"
      className="w-full max-w-2xl mt-6"
    >
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        {/* Top row: current step + elapsed */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-indigo-700 truncate">
              {currentStep?.label ?? "Preparing..."}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-xs text-slate-400 tabular-nums">
            <span>{doneCount}/{totalSteps} steps</span>
            <span>{elapsed.toFixed(1)}s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(doneCount / totalSteps) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Completed steps feed (last 3) */}
        {completedSteps.length > 0 && (
          <div className="space-y-1">
            {completedSteps.slice(0, 3).map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-xs">
                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-500">{step.label}</span>
                {step.detail && (
                  <span className="text-slate-400 tabular-nums">{step.detail}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
