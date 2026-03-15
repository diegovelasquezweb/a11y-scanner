"use client";

import { Check } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";
import type { EngineSelection } from "@/types/scan";
import { ENGINE_OPTIONS } from "@/types/scan";

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

interface AdvancedSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engines: EngineSelection;
  onEnginesChange: (engines: EngineSelection) => void;
  disabled?: boolean;
}

export function AdvancedSettings({
  open,
  onOpenChange,
  engines,
  onEnginesChange,
  disabled = false,
}: AdvancedSettingsProps) {
  const enabledCount = Object.values(engines).filter(Boolean).length;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Advanced Settings"
      description="Configure scan engines and behavior."
    >
      <fieldset disabled={disabled}>
        <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          Scan Engines
        </legend>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Select which engines to run. More engines provide broader coverage but increase scan time.
          {enabledCount === 0 && (
            <span className="block mt-1 text-rose-600 font-medium">
              At least one engine must be selected.
            </span>
          )}
        </p>

        <div className="space-y-3">
          {ENGINE_OPTIONS.map((engine) => {
            const checked = engines[engine.id];
            const details = ENGINE_DETAILS[engine.id];

            return (
              <label
                key={engine.id}
                className={`block rounded-md border p-4 cursor-pointer select-none transition-all ${
                  checked
                    ? "bg-sky-50 border-sky-300"
                    : "bg-white border-slate-200 hover:border-slate-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onEnginesChange({ ...engines, [engine.id]: !engines[engine.id] })
                    }
                    disabled={disabled}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-bold ${checked ? "text-sky-800" : "text-slate-700"}`}>
                        {engine.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {engine.description}
                      </span>
                    </div>
                    {details && (
                      <>
                        <p className="text-xs text-slate-500 leading-relaxed mb-1.5">
                          {details.coverage}
                        </p>
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          details.speed === "Fast"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {details.speed}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>
    </SidePanel>
  );
}
