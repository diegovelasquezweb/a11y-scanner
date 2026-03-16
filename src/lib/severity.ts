/**
 * Severity style mapping for UI components.
 * Severity IDs come from the engine's getSeverityLevels() knowledge.
 * CSS classes are a scanner/presentation concern.
 */

export interface SeverityStyle {
  badge: string;
  border: string;
}

const SEVERITY_STYLES: Record<string, SeverityStyle> = {
  Critical: {
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    border: "border-rose-200 hover:border-rose-300",
  },
  Serious: {
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    border: "border-orange-200 hover:border-orange-300",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    border: "border-amber-200 hover:border-amber-300",
  },
  Minor: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    border: "border-emerald-200 hover:border-emerald-300",
  },
};

const FALLBACK_STYLE: SeverityStyle = {
  badge: "bg-slate-100 text-slate-700 border-slate-200",
  border: "border-slate-200 hover:border-slate-300",
};

export function getSeverityStyle(severity: string): SeverityStyle {
  return SEVERITY_STYLES[severity] ?? FALLBACK_STYLE;
}

/** Badge-only class for dark backgrounds (e.g. QuickWins) */
export const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-rose-500/20 text-rose-400",
  Serious: "bg-orange-500/20 text-orange-400",
  Moderate: "bg-amber-500/20 text-amber-400",
  Minor: "bg-emerald-500/20 text-emerald-400",
};

/** Color by severity order index (from engine's severityLevels[].order) */
export const ORDER_COLORS: Record<number, { color: string; textColor: string }> = {
  1: { color: "border-rose-500",    textColor: "text-rose-600" },
  2: { color: "border-orange-500",  textColor: "text-orange-700" },
  3: { color: "border-amber-400",   textColor: "text-amber-700" },
  4: { color: "border-emerald-500", textColor: "text-emerald-700" },
};
