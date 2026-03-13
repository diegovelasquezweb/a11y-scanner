"use client";

import type { PersonaGroup } from "@/types/scan";

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  sr: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  kb: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  vis: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  cog: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

interface PersonaImpactProps {
  personaGroups: Record<string, PersonaGroup>;
  totalFindings: number;
}

export function PersonaImpact({ personaGroups, totalFindings }: PersonaImpactProps) {
  return (
    <div className="premium-card rounded-2xl p-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Persona Impact Matrix
      </h3>
      <p className="text-xs text-slate-600 mb-6 -mt-4 leading-relaxed italic">
        Distribution of unique accessibility barriers per user profile.
      </p>
      <div className="space-y-4">
        {Object.entries(personaGroups).map(([key, persona]) => (
          <div key={key} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-primary-light group-hover:text-primary transition-colors">
                  {PERSONA_ICONS[persona.icon] ?? PERSONA_ICONS.sr}
                </div>
                <span className="text-sm font-bold text-slate-700">{persona.label}</span>
              </div>
              <span className="text-xs font-black text-slate-900">{persona.count} issues</span>
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
  );
}
