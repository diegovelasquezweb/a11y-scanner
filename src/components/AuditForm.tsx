"use client";

import { useState, useRef, useId, useMemo, useEffect } from "react";
import { Info, Check, Search } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";
import * as Toggle from "@radix-ui/react-toggle";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ScanStatus, ConformanceLevel, EngineSelection } from "@/types/scan";
import {
  CONFORMANCE_LEVELS,
  CONFORMANCE_TAG_MAP,
  DEFAULT_CONFORMANCE,
  DEFAULT_ENGINES,
  ENGINE_OPTIONS,
} from "@/types/scan";
import { WcagEducation, WcagEducationTrigger } from "@/components/WcagEducation";

interface AuditFormProps {
  status: ScanStatus;
  errorMessage: string;
  onSubmit: (targetUrl: string, githubRepoUrl: string, axeTags: string[], engines: EngineSelection) => void;
}

export function AuditForm({ status, errorMessage, onSubmit }: AuditFormProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [conformance, setConformance] = useState<ConformanceLevel>(DEFAULT_CONFORMANCE);
  const [bestPractices, setBestPractices] = useState(false);
  const [engines, setEngines] = useState<EngineSelection>({ ...DEFAULT_ENGINES });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const targetInputRef = useRef<HTMLInputElement>(null);
  const scanErrorRef = useRef<HTMLDivElement>(null);
  const targetErrorId = useId();
  const repoErrorId = useId();
  const statusId = useId();

  useEffect(() => {
    if (status === "error" && errorMessage && scanErrorRef.current) {
      scanErrorRef.current.focus();
    }
  }, [status, errorMessage]);

  const sliderIndex = CONFORMANCE_LEVELS.findIndex((l) => l.id === conformance);

  const axeTags = useMemo(() => {
    const tags = [...CONFORMANCE_TAG_MAP[conformance]];
    if (bestPractices) tags.push("best-practice");
    return tags;
  }, [conformance, bestPractices]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!targetUrl.trim()) {
      errors.targetUrl = "Target URL is required.";
    } else {
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          errors.targetUrl = "URL must start with https:// or http://";
        }
      } catch {
        errors.targetUrl = "Please enter a valid URL (e.g. https://example.com).";
      }
    }

    if (githubRepoUrl.trim()) {
      try {
        const parsed = new URL(githubRepoUrl);
        if (parsed.hostname !== "github.com") {
          errors.githubRepoUrl = "Must be a GitHub URL (https://github.com/owner/repo).";
        } else if (parsed.pathname.split("/").filter(Boolean).length < 2) {
          errors.githubRepoUrl = "Must include owner and repo (https://github.com/owner/repo).";
        }
      } catch {
        errors.githubRepoUrl = "Please enter a valid GitHub URL.";
      }
    }

    if (!engines.axe && !engines.cdp && !engines.pa11y) {
      errors.engines = "Select at least one scan engine.";
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      targetInputRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "running") return;
    if (!validate()) return;
    onSubmit(targetUrl.trim(), githubRepoUrl.trim(), axeTags, engines);
  };

  const isRunning = status === "running";

  return (
    <WcagEducation>
    <div className="premium-card rounded-md p-8 w-full max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Web Accessibility Scanner
          </h1>
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <Info className="w-4 h-4" aria-hidden="true" />
                  <span className="text-[11px] font-medium sm:sr-only">How it works</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="z-50 max-w-xs rounded-md bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200 shadow-xl animate-in fade-in-0 zoom-in-95"
                >
                  Runs axe-core and pa11y together for broader WCAG coverage,
                  then enriches each finding with code fixes, MDN references,
                  and framework-specific guidance.
                  <Tooltip.Arrow className="fill-slate-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Scan any URL for actionable accessibility issues.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div>
            <label
              htmlFor="target-url"
              className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2"
            >
              Target URL <span className="text-rose-500">*</span>
            </label>
            <input
              ref={targetInputRef}
              type="url"
              id="target-url"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                if (validationErrors.targetUrl) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.targetUrl;
                    return next;
                  });
                }
              }}
              placeholder="https://example.com"
              required
              aria-describedby={
                validationErrors.targetUrl ? targetErrorId : undefined
              }
              aria-invalid={!!validationErrors.targetUrl}
              disabled={isRunning}
              className={`w-full px-4 py-3 bg-white border rounded-md text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm ${
                validationErrors.targetUrl
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                  : "border-slate-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {validationErrors.targetUrl && (
              <p
                id={targetErrorId}
                className="mt-2 text-xs font-medium text-rose-600"
                role="alert"
              >
                {validationErrors.targetUrl}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="github-repo"
              className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2"
            >
              GitHub Repo URL{" "}
              <span className="text-slate-400 font-normal normal-case tracking-normal">
                (optional, enables source pattern scan)
              </span>
            </label>
            <input
              type="url"
              id="github-repo"
              value={githubRepoUrl}
              onChange={(e) => {
                setGithubRepoUrl(e.target.value);
                if (validationErrors.githubRepoUrl) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.githubRepoUrl;
                    return next;
                  });
                }
              }}
              placeholder="https://github.com/owner/repo"
              aria-describedby={
                validationErrors.githubRepoUrl ? repoErrorId : undefined
              }
              aria-invalid={!!validationErrors.githubRepoUrl}
              disabled={isRunning}
              className={`w-full px-4 py-3 bg-white border rounded-md text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm ${
                validationErrors.githubRepoUrl
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                  : "border-slate-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {validationErrors.githubRepoUrl && (
              <p
                id={repoErrorId}
                className="mt-2 text-xs font-medium text-rose-600"
                role="alert"
              >
                {validationErrors.githubRepoUrl}
              </p>
            )}
          </div>
        </div>

        <fieldset className="mb-6" disabled={isRunning}>
          <legend className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-4">
            WCAG Conformance Level
          </legend>

          <div className="bg-sky-50/60 border border-sky-100 rounded-md p-5">
            <Slider.Root
              min={0}
              max={CONFORMANCE_LEVELS.length - 1}
              step={1}
              value={[sliderIndex]}
              onValueChange={([val]) => setConformance(CONFORMANCE_LEVELS[val].id)}
              disabled={isRunning}
              aria-label="WCAG conformance level"
              className="relative flex items-center select-none touch-none h-5 mb-3"
            >
              <Slider.Track className="relative grow h-2 bg-sky-200 rounded-full">
                <Slider.Range className="absolute h-full bg-sky-500 rounded-full" />
              </Slider.Track>
              <Slider.Thumb
                aria-valuetext={`Level ${conformance}`}
                className="block w-5 h-5 bg-sky-600 rounded-full shadow-md border-2 border-white transition-colors focus:outline-none focus:ring-4 focus:ring-sky-500/20 hover:bg-sky-700 disabled:cursor-not-allowed"
              />
            </Slider.Root>

            <div className="flex justify-between px-0.5">
              {CONFORMANCE_LEVELS.map((level) => {
                const isActive = conformance === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setConformance(level.id)}
                    disabled={isRunning}
                    className={`text-center transition-colors disabled:cursor-not-allowed ${
                      isActive ? "" : "opacity-60 hover:opacity-80"
                    }`}
                  >
                    <span
                      className={`block text-sm font-bold ${
                        isActive ? "text-sky-700" : "text-slate-500"
                      }`}
                    >
                      {level.label}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        isActive ? "text-sky-500" : "text-slate-400"
                      }`}
                    >
                      {level.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 pt-3 border-t border-sky-100 text-sm text-slate-600">
              Current:{" "}
              <span className="font-bold text-sky-700">WCAG {conformance}</span>
              {conformance === "AA" && (
                <span className="text-slate-400 ml-1">(Recommended for most websites)</span>
              )}
              {conformance === "A" && (
                <span className="text-slate-400 ml-1">(Minimum baseline)</span>
              )}
              {conformance === "AAA" && (
                <span className="text-slate-400 ml-1">(Strictest — not required by most regulations)</span>
              )}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Toggle.Root
              pressed={bestPractices}
              onPressedChange={(pressed) => setBestPractices(pressed)}
              disabled={isRunning}
              className="flex items-center gap-2.5 px-1 py-2 text-sm font-medium cursor-pointer transition-all select-none text-slate-600 hover:text-slate-800 data-[state=on]:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  bestPractices ? "bg-sky-600 border-sky-600" : "border-sky-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {bestPractices && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                )}
              </span>
              Include Best Practices
              <span className={`text-[10px] ${bestPractices ? "text-slate-300" : "text-slate-400"}`}>
                (beyond WCAG)
              </span>
            </Toggle.Root>
            <WcagEducationTrigger />
          </div>
        </fieldset>

        <fieldset className="mb-6" disabled={isRunning}>
          <legend className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">
            Scan Engines
          </legend>
          <div className="flex flex-wrap gap-3">
            {ENGINE_OPTIONS.map((engine) => {
              const checked = engines[engine.id];
              return (
                <label
                  key={engine.id}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-md border cursor-pointer select-none transition-all text-sm font-medium ${
                    checked
                      ? "bg-sky-50 border-sky-300 text-sky-800"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setEngines((prev) => ({ ...prev, [engine.id]: !prev[engine.id] }))
                    }
                    disabled={isRunning}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    {engine.label}
                    <span className="text-[10px] text-slate-400 ml-1 font-normal">
                      {engine.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {validationErrors.engines && (
            <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
              {validationErrors.engines}
            </p>
          )}
        </fieldset>

        {!isRunning && (
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="px-8 py-3 bg-sky-600 text-white font-bold text-sm rounded-md shadow-md hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/20 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Run Audit
            </button>

            <div
              ref={scanErrorRef}
              tabIndex={-1}
              aria-live="polite"
              aria-atomic="true"
              id={statusId}
              className="outline-none"
            >
              {status === "error" && errorMessage && (
                <p className="text-sm text-rose-600 font-medium" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
    </WcagEducation>
  );
}
