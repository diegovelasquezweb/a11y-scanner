"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";
import type { EngineKnowledge, ScannerOptionHelp } from "@diegovelasquezweb/a11y-engine";
import type {
  EngineSelection,
  AdvancedScanOptions,
  WaitUntilStrategy,
  ColorScheme,
} from "@/types/scan";
import {
  ENGINE_OPTIONS,
  VIEWPORT_PRESETS,
  DEFAULT_ADVANCED,
} from "@/types/scan";

const WAIT_UNTIL_OPTIONS: { value: WaitUntilStrategy; label: string; description: string }[] = [
  {
    value: "domcontentloaded",
    label: "DOM Ready",
    description: "Fires when the initial HTML is parsed. Fastest — use for server-rendered pages.",
  },
  {
    value: "load",
    label: "Page Load",
    description: "Waits for all resources (images, scripts) to finish loading. More reliable for asset-heavy pages.",
  },
  {
    value: "networkidle",
    label: "Network Idle",
    description: "Waits until no network requests for 500ms. Best for SPAs and JS-heavy pages. Slowest.",
  },
];

const ENGINE_DETAILS: Record<string, { coverage: string; speed: string }> = {
  axe: {
    coverage: "Broadest WCAG rule coverage with over 90 checks. Industry standard used by most accessibility tools.",
    speed: "Fast",
  },
  cdp: {
    coverage: "Inspects the browser accessibility tree directly via Chrome DevTools Protocol. Catches rendering and ARIA issues that DOM-only checks miss.",
    speed: "Medium",
  },
  pa11y: {
    coverage: "Runs HTML CodeSniffer against the rendered page. Strong on structural HTML validation and heading hierarchy.",
    speed: "Medium",
  },
};

function getOptionHelp(options: ScannerOptionHelp[] | undefined, id: string): ScannerOptionHelp | undefined {
  return options?.find((entry) => entry.id === id);
}

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
      <div className="space-y-8" aria-disabled={disabled}>

        {/* Scan Engines */}
        <section>
          <SectionHeading>Scan Engines</SectionHeading>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            More engines = broader coverage and longer scan time.
            {enabledCount === 0 && (
              <span className="block mt-1 text-rose-600 font-medium">
                At least one engine must be selected.
              </span>
            )}
          </p>
          <fieldset disabled={disabled} className="space-y-2.5">
            <legend className="sr-only">Scan engines</legend>
            {ENGINE_OPTIONS.map((engine) => {
              const checked = engines[engine.id];
              const details = ENGINE_DETAILS[engine.id];
              const engineHelp = scannerHelp?.engines.find((entry) => entry.id === engine.id);
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
                      onChange={() => onEnginesChange({ ...engines, [engine.id]: !engines[engine.id] })}
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
                        <span className="text-[10px] text-slate-400 font-medium">{engine.description}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-1.5">{engineHelp?.description ?? details.coverage}</p>
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        details.speed === "Fast" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {details.speed}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </fieldset>
        </section>

        {/* Crawling */}
        <section>
          <SectionHeading>Crawling</SectionHeading>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={maxRoutesId} className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Max Pages
                </label>
                <span className="text-sm font-bold text-sky-700 tabular-nums">
                  {advanced.maxRoutes === 1 ? "1 page" : `${advanced.maxRoutes} pages`}
                </span>
              </div>
              <input
                id={maxRoutesId}
                type="range"
                min={1}
                max={50}
                step={1}
                value={advanced.maxRoutes}
                onChange={(e) => setField("maxRoutes", Number(e.target.value))}
                disabled={disabled}
                className="w-full accent-sky-600 disabled:opacity-50"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">1</span>
                <span className="text-[10px] text-slate-400">50</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {getOptionHelp(helpOptions, "maxRoutes")?.description ?? "Maximum unique pages to discover and scan. Higher values increase coverage and scan time."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={crawlDepthId} className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Crawl Depth
                </label>
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
                <span className="text-[10px] text-slate-400">1 — entry page only</span>
                <span className="text-[10px] text-slate-400">3 — deep crawl</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {getOptionHelp(helpOptions, "crawlDepth")?.description ?? "How many link levels to follow from the starting URL. Ignored when scanning a single page."}
              </p>
            </div>
          </div>
        </section>

        {/* Browser Behavior */}
        <section>
          <SectionHeading>Browser Behavior</SectionHeading>
          <div className="space-y-4">

            {/* Wait Strategy */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Wait Strategy
              </p>
              <div className="space-y-2">
                {WAIT_UNTIL_OPTIONS.map((opt) => (
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
                        onChange={() => setField("waitUntil", opt.value)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          advanced.waitUntil === opt.value
                            ? "border-sky-600"
                            : "border-slate-300"
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

            {/* Per-page Timeout */}
            <div>
              <label htmlFor={timeoutId} className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                Per-page Timeout
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
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {getOptionHelp(helpOptions, "timeoutMs")?.description ?? "Network timeout per page load. Range: 5 000 – 120 000 ms."}
              </p>
            </div>
          </div>
        </section>

        {/* Emulation */}
        <section>
          <SectionHeading>Emulation</SectionHeading>
          <div className="space-y-4">

            {/* Viewport */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Viewport
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

            {/* Color Scheme */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                Color Scheme
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
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {getOptionHelp(helpOptions, "colorScheme")?.description ?? "Emulates prefers-color-scheme. Use Dark to catch contrast issues in dark mode."}
              </p>
            </div>

          </div>
        </section>

        {/* Reset */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onAdvancedChange({ ...DEFAULT_ADVANCED });
              onEnginesChange({ axe: true, cdp: true, pa11y: true });
            }}
            disabled={disabled}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>

      </div>
    </SidePanel>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}
