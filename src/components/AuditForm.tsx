"use client";

import { useState, useRef, useId, useMemo, useEffect } from "react";
import { Info, Check, Search, Settings } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";
import * as Toggle from "@radix-ui/react-toggle";
import type { ScanStatus, EngineSelection, AdvancedScanOptions } from "@/types/scan";
import type { EngineKnowledge, ConformanceLevel } from "@diegovelasquezweb/a11y-engine";
import {
  DEFAULT_CONFORMANCE,
  DEFAULT_ENGINES,
  DEFAULT_ADVANCED,
} from "@/types/scan";
import { HowItWorks } from "@/components/HowItWorks";
import { AdvancedSettings } from "@/components/AdvancedSettings";

interface AuditFormProps {
  status: ScanStatus;
  errorMessage: string;
  knowledge?: EngineKnowledge | null;
  onSubmit: (targetUrl: string, githubRepoUrl: string, axeTags: string[], engines: EngineSelection, advanced: AdvancedScanOptions) => void;
}

export function AuditForm({ status, errorMessage, onSubmit, knowledge }: AuditFormProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [conformance, setConformance] = useState<ConformanceLevel["id"]>(DEFAULT_CONFORMANCE);
  const [bestPractices, setBestPractices] = useState(false);
  const [engines, setEngines] = useState<EngineSelection>({ ...DEFAULT_ENGINES });
  const [advanced, setAdvanced] = useState<AdvancedScanOptions>({ ...DEFAULT_ADVANCED });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const conformanceLevels = useMemo(() => knowledge?.conformanceLevels ?? [], [knowledge]);
  const sliderIndex = conformanceLevels.findIndex((l) => l.id === conformance);

  const axeTags = useMemo(() => {
    const level = conformanceLevels.find((l) => l.id === conformance);
    const tags = level ? [...level.tags] : [];
    if (bestPractices) tags.push("best-practice");
    return tags;
  }, [conformance, bestPractices, conformanceLevels]);

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
      if (errors.engines) {
        setAdvancedOpen(true);
      } else {
        targetInputRef.current?.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "running") return;
    if (!validate()) return;
    onSubmit(targetUrl.trim(), githubRepoUrl.trim(), axeTags, engines, advanced);
  };

  const isRunning = status === "running";

  return (
    <>
    <div className="premium-card rounded-md p-8 w-full max-w-2xl relative">
      <button
        type="button"
        onClick={() => setHowItWorksOpen(true)}
        className="absolute top-4 right-4 w-7 h-7 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        aria-label="Help"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Web Accessibility Scanner
          </h1>
          {advanced.aiEnabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest border border-violet-200/60 self-center">
              AI Enhanced
            </span>
          )}
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
              Project Repository{" "}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 normal-case tracking-normal align-middle ml-1">
                Beta
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
            <p className="mt-1.5 text-xs text-slate-400">
              Optional — enables source pattern scan
            </p>
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
              max={Math.max(0, conformanceLevels.length - 1)}
              step={1}
              value={[Math.max(0, sliderIndex)]}
              onValueChange={([val]) => conformanceLevels[val] && setConformance(conformanceLevels[val].id)}
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
              {conformanceLevels.map((level) => {
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
                    <span className={`block text-sm font-bold ${isActive ? "text-sky-700" : "text-slate-500"}`}>
                      {level.label}
                    </span>
                    <span className={`block text-[11px] ${isActive ? "text-sky-500" : "text-slate-400"}`}>
                      {level.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {conformanceLevels.length > 0 && (
              <p className="mt-4 pt-3 border-t border-sky-100 text-sm text-slate-600">
                Current:{" "}
                <span className="font-bold text-sky-700">WCAG {conformance}</span>
                {conformanceLevels.find((l) => l.id === conformance)?.shortDescription && (
                  <span className="text-slate-400 ml-1">
                    ({conformanceLevels.find((l) => l.id === conformance)!.shortDescription})
                  </span>
                )}
              </p>
            )}
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
          </div>
        </fieldset>

        {validationErrors.engines && (
          <p className="mb-4 text-xs font-medium text-rose-600" role="alert">
            {validationErrors.engines}
          </p>
        )}

        {!isRunning && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-8 py-3 bg-sky-600 text-white font-bold text-sm rounded-md shadow-md hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/20 transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Run Audit
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest border border-slate-200 rounded-md bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              Advanced
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

    <HowItWorks open={howItWorksOpen} onOpenChange={setHowItWorksOpen} knowledge={knowledge} />
    <AdvancedSettings
      open={advancedOpen}
      onOpenChange={setAdvancedOpen}
      engines={engines}
      onEnginesChange={setEngines}
      advanced={advanced}
      onAdvancedChange={setAdvanced}
      knowledge={knowledge}
      disabled={isRunning}
    />
    </>
  );
}
