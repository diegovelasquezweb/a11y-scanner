"use client";

import { useState, useRef, useId } from "react";
import type { ScanStatus } from "@/types/scan";
import { WCAG_LEVELS } from "@/types/scan";

const DEFAULT_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

interface AuditFormProps {
  status: ScanStatus;
  errorMessage: string;
  onSubmit: (targetUrl: string, githubRepoUrl: string, axeTags: string[]) => void;
}

export function AuditForm({ status, errorMessage, onSubmit }: AuditFormProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set(DEFAULT_TAGS));
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const targetInputRef = useRef<HTMLInputElement>(null);
  const targetErrorId = useId();
  const repoErrorId = useId();
  const statusId = useId();

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
    const tags = Array.from(selectedLevels);
    onSubmit(targetUrl.trim(), githubRepoUrl.trim(), tags);
  };

  const isRunning = status === "running";

  return (
    <div className="premium-card rounded-2xl p-8 mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="px-3 h-10 rounded-lg bg-slate-900 text-white font-bold text-base font-mono flex items-center justify-center shadow-md">
          a11y
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Web Accessibility Scanner
          </h1>
          <p className="text-sm text-slate-500">
            WCAG 2.2 AA audit powered by axe-core + Playwright
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Target URL */}
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
              className={`w-full px-4 py-3 bg-white border rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm ${
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

          {/* GitHub Repo URL */}
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
              className={`w-full px-4 py-3 bg-white border rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm ${
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

        {/* WCAG Level Checkboxes */}
        <fieldset className="mb-6">
          <legend className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">
            WCAG Levels & Rules
          </legend>
          <div className="flex flex-wrap gap-3">
            {WCAG_LEVELS.map((level) => {
              const isChecked = level.tags.every((t) => selectedLevels.has(t));
              return (
                <label
                  key={level.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
                    isChecked
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isRunning}
                    onChange={() => {
                      setSelectedLevels((prev) => {
                        const next = new Set(prev);
                        if (isChecked) {
                          level.tags.forEach((t) => next.delete(t));
                        } else {
                          level.tags.forEach((t) => next.add(t));
                        }
                        return next;
                      });
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked
                        ? "bg-white border-white"
                        : "border-slate-300"
                    }`}
                    aria-hidden="true"
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="leading-tight">
                    <span className="block">{level.label}</span>
                    <span className={`block text-[10px] ${isChecked ? "text-slate-300" : "text-slate-400"}`}>
                      {level.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isRunning}
            className="px-8 py-3 bg-slate-900 text-white font-bold text-sm rounded-2xl shadow-md hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Run Audit
              </>
            )}
          </button>

          {/* Status indicator */}
          <div aria-live="polite" aria-atomic="true" id={statusId}>
            {isRunning && (
              <p className="text-sm text-slate-500 font-medium">
                Running accessibility scan...
              </p>
            )}
            {status === "error" && errorMessage && (
              <p className="text-sm text-rose-600 font-medium" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
