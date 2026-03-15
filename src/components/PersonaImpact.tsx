"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Volume2, Smartphone, Eye, Lightbulb, Users, Info } from "lucide-react";
import type { PersonaGroup } from "@/types/scan";

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  screenReader: <Volume2 className="w-4 h-4" aria-hidden="true" />,
  keyboard: <Smartphone className="w-4 h-4" aria-hidden="true" />,
  vision: <Eye className="w-4 h-4" aria-hidden="true" />,
  cognitive: <Lightbulb className="w-4 h-4" aria-hidden="true" />,
};

interface PersonaImpactProps {
  personaGroups: Record<string, PersonaGroup>;
  totalFindings: number;
  tooltipTitle?: string;
  tooltipBody?: string;
  personaDescriptions?: Record<string, string>;
}

export function PersonaImpact({ personaGroups, totalFindings, tooltipTitle, tooltipBody, personaDescriptions }: PersonaImpactProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
    <div className="premium-card rounded-md p-5 w-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" aria-hidden="true" />
          Persona Impact
        </h3>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              aria-label="About Persona Impact"
              className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
               <Info className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="bottom"
              align="end"
              sideOffset={6}
              className="z-50 max-w-[320px] rounded-md bg-slate-900 px-4 py-3.5 text-xs leading-relaxed text-slate-300 shadow-xl animate-in fade-in-0 zoom-in-95"
            >
              <p className="font-bold text-white text-[13px] mb-2">{tooltipTitle ?? "What is Persona Impact?"}</p>
              <p className="mb-2">{tooltipBody ?? "Each issue is mapped to the disability groups it affects, showing which users face the most barriers on your site. The bar shows relative severity per group compared to total findings."}</p>
              <Tooltip.Arrow className="fill-slate-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed italic">
        Accessibility barriers per user profile.
      </p>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {Object.entries(personaGroups).map(([key, persona]) => (
          <div key={key} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-primary-light group-hover:text-primary transition-colors">
                  {PERSONA_ICONS[persona.icon] ?? PERSONA_ICONS.screenReader}
                </div>
                <span className="text-xs font-bold text-slate-700" title={personaDescriptions?.[key] ?? undefined}>{persona.label}</span>
              </div>
              <span className="text-xs font-black text-slate-900">{persona.count}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalFindings > 0 ? (persona.count / totalFindings) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    </Tooltip.Provider>
  );
}
