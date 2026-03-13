"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Collapsible from "@radix-ui/react-collapsible";

interface WcagCardData {
  title: string;
  tag: string;
  tagColor: string;
  summary: string;
  details: string;
}

const WCAG_CARDS: WcagCardData[] = [
  {
    title: "WCAG 2.0",
    tag: "2008",
    tagColor: "bg-slate-100 text-slate-600",
    summary: "The original W3C recommendation that established the foundation for web accessibility.",
    details:
      "Introduced the four principles (Perceivable, Operable, Understandable, Robust) and three conformance levels (A, AA, AAA). Covers core requirements like text alternatives, keyboard access, color contrast, and form labels. Still widely referenced in legal frameworks worldwide.",
  },
  {
    title: "WCAG 2.1",
    tag: "2018",
    tagColor: "bg-indigo-50 text-indigo-600",
    summary: "Extended 2.0 with 17 new success criteria for mobile, low vision, and cognitive disabilities.",
    details:
      "Added criteria for touch targets (2.5.5), text spacing (1.4.12), content reflow (1.4.10), orientation (1.3.4), and input purpose (1.3.5). Required by the European Accessibility Act (EAA) and referenced in updated ADA guidance. All 2.0 criteria remain — 2.1 is a superset.",
  },
  {
    title: "WCAG 2.2",
    tag: "2023",
    tagColor: "bg-violet-50 text-violet-600",
    summary: "The latest version, adding 9 new criteria focused on cognitive accessibility and consistent help.",
    details:
      "Key additions include consistent help (3.2.6), accessible authentication (3.3.8), dragging movements (2.5.7), and focus appearance (2.4.11/2.4.12). Removed criterion 4.1.1 (Parsing) as it's now handled by modern browsers. Supersedes both 2.0 and 2.1 — all prior criteria are included.",
  },
  {
    title: "Level A",
    tag: "Minimum",
    tagColor: "bg-amber-50 text-amber-700",
    summary: "The baseline: essential requirements that remove the most severe barriers.",
    details:
      "Covers fundamentals like non-text content alternatives (1.1.1), keyboard operability (2.1.1), page titles (2.4.2), and language of the page (3.1.1). Failing Level A means some users cannot access the content at all. Every site should meet Level A at minimum.",
  },
  {
    title: "Level AA",
    tag: "Standard",
    tagColor: "bg-emerald-50 text-emerald-700",
    summary: "The recommended target for most websites — required by most accessibility laws.",
    details:
      "Includes all Level A criteria plus requirements for color contrast (1.4.3 — 4.5:1 ratio), resize text (1.4.4), focus visible (2.4.7), error suggestion (3.3.3), and consistent navigation (3.2.3). Referenced by ADA, Section 508, EN 301 549, and EAA. This is the standard the scanner defaults to.",
  },
  {
    title: "Level AAA",
    tag: "Enhanced",
    tagColor: "bg-purple-50 text-purple-700",
    summary: "The highest conformance level — not required but beneficial for specialized audiences.",
    details:
      "Adds stricter contrast (1.4.6 — 7:1 ratio), sign language for audio (1.2.6), extended audio description (1.2.7), and reading level (3.1.5). Full AAA conformance is not recommended as a general policy because some criteria cannot be satisfied for all content types. Useful for targeted sections like education or government services.",
  },
];

/** Trigger link — place this inside the WCAG fieldset in AuditForm */
export function WcagEducationTrigger() {
  return (
    <Dialog.Trigger asChild>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Understanding WCAG
      </button>
    </Dialog.Trigger>
  );
}

/** Side panel wrapper — wrap AuditForm content with this at the form level */
export function WcagEducationPanel() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="wcag-panel-overlay" />
      <Dialog.Content
        className="wcag-panel-content"
        aria-describedby={undefined}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <Dialog.Title className="text-lg font-bold text-slate-900">
            Understanding WCAG
          </Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Dialog.Close>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-slate-500 mb-5">
            WCAG (Web Content Accessibility Guidelines) defines how to make web content more accessible. Each version builds on the previous one, and each conformance level is cumulative.
          </p>

          {/* Versions */}
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Versions
          </h3>
          <div className="space-y-2.5 mb-6">
            {WCAG_CARDS.slice(0, 3).map((card) => (
              <WcagCard key={card.title} card={card} />
            ))}
          </div>

          {/* Levels */}
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Conformance Levels
          </h3>
          <div className="space-y-2.5">
            {WCAG_CARDS.slice(3).map((card) => (
              <WcagCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/** Full provider — wrap trigger + panel together */
export function WcagEducation({ children }: { children?: React.ReactNode }) {
  return (
    <Dialog.Root>
      {children}
      <WcagEducationPanel />
    </Dialog.Root>
  );
}

function WcagCard({ card }: { card: WcagCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/30 transition-colors hover:bg-slate-50/80"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900">
                  {card.title}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.tagColor}`}
                >
                  {card.tag}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {card.summary}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform duration-200 motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="card-body">
          <div>
            <div className="px-4 pb-3 pt-0">
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {card.details}
                </p>
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
