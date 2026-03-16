"use client";

import { useId } from "react";
import { Check, Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { SidePanel } from "@/components/SidePanel";
import type { EngineKnowledge } from "@diegovelasquezweb/a11y-engine";
import type {
  EngineSelection,
  AdvancedScanOptions,
  ColorScheme,
} from "@/types/scan";

interface EnumOptionValue {
  value: string;
  label: string;
  description?: string;
}
import {
  VIEWPORT_PRESETS,
  DEFAULT_ADVANCED,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/types/scan";




interface AdvancedSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engines: EngineSelection;
  onEnginesChange: (engines: EngineSelection) => void;
  advanced: AdvancedScanOptions;
  onAdvancedChange: (advanced: AdvancedScanOptions) => void;
  knowledge?: EngineKnowledge | null;
  disabled?: boolean;
}

export function AdvancedSettings({
  open,
  onOpenChange,
  engines,
  onEnginesChange,
  advanced,
  onAdvancedChange,
  knowledge,
  disabled = false,
}: AdvancedSettingsProps) {
  const maxRoutesId = useId();
  const crawlDepthId = useId();
  const timeoutId = useId();
  const viewportWId = useId();
  const viewportHId = useId();
  const enabledCount = Object.values(engines).filter(Boolean).length;
  const scannerHelp = knowledge?.scanner;
  const helpOptions = scannerHelp?.options;
  const engineList = scannerHelp?.engines ?? [];
  const waitUntilOption = helpOptions?.find((o) => o.id === "waitUntil");
  const waitUntilValues = (waitUntilOption?.allowedValues ?? []) as EnumOptionValue[];

  const isCustomViewport = !VIEWPORT_PRESETS.some(
    (p) => p.width === advanced.viewport.width && p.height === advanced.viewport.height
  );

  function setField<K extends keyof AdvancedScanOptions>(key: K, value: AdvancedScanOptions[K]) {
    onAdvancedChange({ ...advanced, [key]: value });
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Advanced Settings"
      description="Configure scan scope, browser behavior, and engines."
    >
      <Tooltip.Provider delayDuration={200}>
      <div className="space-y-8 pb-16" aria-disabled={disabled}>

        <section>
          <div className="flex items-center justify-between mb-1">
            <SectionHeading noMargin>Scan Engines</SectionHeading>
            <button
              type="button"
              onClick={() => {
                onAdvancedChange({ ...DEFAULT_ADVANCED });
                onEnginesChange({ axe: true, cdp: true, pa11y: true });
              }}
              disabled={disabled}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors disabled:opacity-50 mb-2"
            >
              Reset to defaults
            </button>
          </div>
          {enabledCount === 0 && (
            <p className="text-xs text-rose-600 font-medium mb-2">At least one engine must be selected.</p>
          )}
          <fieldset disabled={disabled} className="space-y-2.5">
            <legend className="sr-only">Scan engines</legend>
            {engineList.map((engine) => {
              const checked = !!engines[engine.id as keyof typeof engines];
              return (
                <label
                  key={engine.id}
                  className={`block rounded-md border p-3.5 cursor-pointer select-none transition-all ${
                    checked ? "bg-sky-50 border-sky-300" : "bg-white border-slate-200 hover:border-slate-300"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onEnginesChange({ ...engines, [engine.id]: !engines[engine.id as keyof typeof engines] })}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                      }`}
                      aria-hidden="true"
                    >
                      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-bold ${checked ? "text-sky-800" : "text-slate-700"}`}>
                          {engine.label}
                        </span>
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          engine.speed === "Fast" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {engine.speed}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{engine.coverage}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </fieldset>
        </section>

        <section>
          <SectionHeading>Crawling</SectionHeading>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <label htmlFor={maxRoutesId} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest">
                    Max Pages
                    <HintTip text="How many unique pages to discover and scan from the starting URL." />
                  </label>
                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    advanced.maxRoutes <= 3 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {advanced.maxRoutes <= 3 ? "Fast" : "Medium"}
                  </span>
                </div>
                <span className="text-sm font-bold text-sky-700 tabular-nums">
                  {advanced.maxRoutes === 1 ? "1 page" : `${advanced.maxRoutes} pages`}
                </span>
              </div>
              <input
                id={maxRoutesId}
                type="range"
                min={1}
                max={10}
                step={1}
                value={advanced.maxRoutes}
                onChange={(e) => setField("maxRoutes", Number(e.target.value))}
                disabled={disabled}
                className="w-full accent-sky-600 disabled:opacity-50"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">1</span>
                <span className="text-[10px] text-slate-400">10</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <label htmlFor={crawlDepthId} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest">
                    Crawl Depth
                    <HintTip text="How many link levels to follow from the starting URL." />
                  </label>
                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    advanced.crawlDepth === 1 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {advanced.crawlDepth === 1 ? "Fast" : "Medium"}
                  </span>
                </div>
                <span className="text-sm font-bold text-sky-700 tabular-nums">
                  {advanced.crawlDepth === 1 ? "1 level" : `${advanced.crawlDepth} levels`}
                </span>
              </div>
              <input
                id={crawlDepthId}
                type="range"
                min={1}
                max={3}
                step={1}
                value={advanced.crawlDepth}
                onChange={(e) => setField("crawlDepth", Number(e.target.value))}
                disabled={disabled}
                className="w-full accent-sky-600 disabled:opacity-50"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">1 (entry page only)</span>
                <span className="text-[10px] text-slate-400">3 (deep crawl)</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>Emulation</SectionHeading>
          <div className="space-y-4">

            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Viewport
                <HintTip text="Browser window size used during the audit." />
              </p>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {VIEWPORT_PRESETS.map((preset) => {
                  const active = advanced.viewport.width === preset.width && advanced.viewport.height === preset.height;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setField("viewport", { width: preset.width, height: preset.height })}
                      disabled={disabled}
                      className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all disabled:opacity-50 ${
                        active
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {preset.label}
                      <span className={`ml-1 font-normal ${active ? "text-sky-200" : "text-slate-400"}`}>
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setField("viewport", { width: advanced.viewport.width, height: advanced.viewport.height })}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all disabled:opacity-50 ${
                    isCustomViewport
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Custom
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label htmlFor={viewportWId} className="text-[10px] text-slate-500 font-medium">W</label>
                  <input
                    id={viewportWId}
                    type="number"
                    min={320}
                    max={2560}
                    step={1}
                    value={advanced.viewport.width}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v >= 320 && v <= 2560) setField("viewport", { ...advanced.viewport, width: v });
                    }}
                    disabled={disabled}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 tabular-nums"
                  />
                </div>
                <span className="text-slate-400 text-xs">×</span>
                <div className="flex items-center gap-1.5">
                  <label htmlFor={viewportHId} className="text-[10px] text-slate-500 font-medium">H</label>
                  <input
                    id={viewportHId}
                    type="number"
                    min={320}
                    max={2560}
                    step={1}
                    value={advanced.viewport.height}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v >= 320 && v <= 2560) setField("viewport", { ...advanced.viewport, height: v });
                    }}
                    disabled={disabled}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 tabular-nums"
                  />
                </div>
                <span className="text-[10px] text-slate-400">px</span>
              </div>
            </div>

            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Color Scheme
                <HintTip text="Emulates light or dark mode during the scan to catch theme-specific issues." />
              </p>
              <div className="flex gap-2">
                {(["light", "dark"] as ColorScheme[]).map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => setField("colorScheme", scheme)}
                    disabled={disabled}
                    className={`flex-1 py-2.5 rounded-md border text-sm font-bold capitalize transition-all disabled:opacity-50 ${
                      advanced.colorScheme === scheme
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {scheme === "light" ? "☀ Light" : "☽ Dark"}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        <section>
          <SectionHeading>Browser Behavior</SectionHeading>
          <div className="space-y-4">

            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Wait Strategy
                <HintTip text="When the browser considers a page fully loaded and ready to scan." />
              </p>
              <div className="space-y-2">
                {waitUntilValues.map((opt) => (
                  <label
                    key={opt.value}
                    className={`block rounded-md border px-3.5 py-3 cursor-pointer select-none transition-all ${
                      advanced.waitUntil === opt.value
                        ? "bg-sky-50 border-sky-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="waitUntil"
                        value={opt.value}
                        checked={advanced.waitUntil === opt.value}
                        onChange={() => setField("waitUntil", opt.value as typeof advanced.waitUntil)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          advanced.waitUntil === opt.value ? "border-sky-600" : "border-slate-300"
                        }`}
                        aria-hidden="true"
                      >
                        {advanced.waitUntil === opt.value && (
                          <span className="w-2 h-2 rounded-full bg-sky-600 block" />
                        )}
                      </span>
                      <div>
                        <span className={`text-sm font-bold block ${advanced.waitUntil === opt.value ? "text-sky-800" : "text-slate-700"}`}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500 leading-relaxed">{opt.description}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={timeoutId} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Per-page Timeout
                <HintTip text="Maximum time to wait for each page to load before moving on." />
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={timeoutId}
                  type="number"
                  min={5000}
                  max={120000}
                  step={1000}
                  value={advanced.timeoutMs}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 5000 && v <= 120000) setField("timeoutMs", v);
                  }}
                  disabled={disabled}
                  className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors disabled:opacity-50 tabular-nums"
                />
                <span className="text-xs text-slate-500">ms</span>
                <span className="text-xs text-slate-400">({(advanced.timeoutMs / 1000).toFixed(0)}s)</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading>Findings</SectionHeading>
          <label className={`block rounded-md border p-3.5 cursor-pointer select-none transition-all ${
            advanced.includeIncomplete ? "bg-sky-50 border-sky-300" : "bg-white border-slate-200 hover:border-slate-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={advanced.includeIncomplete}
                onChange={() => {
                  const next = !advanced.includeIncomplete;
                  if (!next) {
                    onAdvancedChange({
                      ...advanced,
                      includeIncomplete: false,
                      countIncompleteInScore: false,
                    });
                    return;
                  }
                  setField("includeIncomplete", true);
                }}
                disabled={disabled}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  advanced.includeIncomplete ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {advanced.includeIncomplete && <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />}
              </span>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  Include incomplete findings
                  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    advanced.includeIncomplete ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {advanced.includeIncomplete ? "Medium" : "Fast"}
                  </span>
                  <HintTip text="Include items that automated engines could not fully confirm, such as video captions and contrast over gradients. These findings are marked with a Needs verification badge and do not affect the compliance score." />
                </span>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Adds potential issues that require manual verification.
                </p>
              </div>
            </div>
          </label>
          {advanced.includeIncomplete && (
            <label className={`mt-3 block rounded-md border p-3.5 cursor-pointer select-none transition-all ${
              advanced.countIncompleteInScore ? "bg-sky-50 border-sky-300" : "bg-white border-slate-200 hover:border-slate-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={advanced.countIncompleteInScore}
                  onChange={() => setField("countIncompleteInScore", !advanced.countIncompleteInScore)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    advanced.countIncompleteInScore ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {advanced.countIncompleteInScore && <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    Count in compliance score
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      advanced.countIncompleteInScore ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {advanced.countIncompleteInScore ? "Medium" : "Fast"}
                    </span>
                    <HintTip text="When enabled, incomplete findings count toward severity totals and compliance score." />
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Include manual-verification findings in score and totals.
                  </p>
                </div>
              </div>
            </label>
          )}
        </section>

        <section>
          <SectionHeading>AI Intelligence</SectionHeading>
          <label className={`block rounded-md border p-3.5 cursor-pointer select-none transition-all ${
            advanced.aiEnabled ? "bg-sky-50 border-sky-300" : "bg-white border-slate-200 hover:border-slate-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={advanced.aiEnabled}
                onChange={() => setField("aiEnabled", !advanced.aiEnabled)}
                disabled={disabled}
                className="sr-only"
              />
              <span
                className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  advanced.aiEnabled ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {advanced.aiEnabled && <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800">AI-powered fix suggestions</span>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Uses Claude to improve fix descriptions and code examples for Critical and Serious findings.
                </p>
              </div>
            </div>
          </label>

          {advanced.aiEnabled && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  System Prompt
                </label>
                <button
                  type="button"
                  onClick={() => setField("aiSystemPrompt", DEFAULT_AI_SYSTEM_PROMPT)}
                  disabled={disabled}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors disabled:opacity-50"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                value={advanced.aiSystemPrompt}
                onChange={(e) => setField("aiSystemPrompt", e.target.value)}
                disabled={disabled}
                rows={6}
                className="w-full text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 resize-y focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                placeholder="Enter custom system prompt for Claude..."
              />
            </div>
          )}
        </section>

      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 -mx-6 -mb-6">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full py-2.5 rounded-md bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition-colors"
        >
          Done
        </button>
      </div>
    </Tooltip.Provider>
    </SidePanel>
  );
}

function SectionHeading({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h3 className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${noMargin ? "" : "mb-3"}`}>
      {children}
    </h3>
  );
}

function HintTip({ text }: { text: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button type="button" onClick={(e) => e.preventDefault()} className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition-colors" aria-label={text}>
          <Info className="w-3 h-3" aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-60 max-w-60 rounded-md bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-300 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          {text}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
