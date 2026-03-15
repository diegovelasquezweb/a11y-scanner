"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Globe, Cpu, GitMerge, Sparkles, BookOpen, Shield, Keyboard, Eye, Brain } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";

interface CollapsibleCardProps {
  title: string;
  tag?: string;
  tagColor?: string;
  summary: string;
  details: string;
  icon?: React.ReactNode;
}

function CollapsibleCard({ title, tag, tagColor, summary, details, icon }: CollapsibleCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden transition-shadow hover:shadow-sm">
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/30 transition-colors hover:bg-slate-50/80"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {icon && (
                  <span className="text-slate-500">{icon}</span>
                )}
                <span className="text-sm font-bold text-slate-900">
                  {title}
                </span>
                {tag && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagColor ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {summary}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="card-body">
          <div>
            <div className="px-4 pb-3 pt-0">
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {details}
                </p>
              </div>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

const SCANNER_STEPS: CollapsibleCardProps[] = [
  {
    title: "Load & Render",
    summary: "The scanner loads your URL in a real browser (Chromium) and waits for full render.",
    details:
      "A headless Chromium instance navigates to the target URL, executes JavaScript, waits for network idle, and captures the fully rendered DOM. This ensures dynamic content (SPAs, lazy-loaded elements) is included in the analysis.",
    icon: <Globe className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "Multi-Engine Scan",
    summary: "Multiple engines (axe-core, CDP, pa11y) run in parallel for broader coverage.",
    details:
      "Each engine uses different detection techniques: axe-core runs DOM-based rule checks, CDP inspects accessibility tree properties via Chrome DevTools Protocol, and pa11y validates rendered HTML against WCAG criteria. Combined, they catch issues that any single engine would miss.",
    icon: <Cpu className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "Merge & Deduplicate",
    summary: "Findings from all engines are normalized, deduplicated, and scored by severity.",
    details:
      "Results are merged by selector + rule ID to eliminate duplicates. Each finding is mapped to its WCAG criterion, assigned a severity level (Critical/Serious/Moderate/Minor), and enriched with persona impact data showing which disability groups are affected.",
    icon: <GitMerge className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "AI Enrichment",
    summary: "Each issue gets code fixes, MDN references, and framework-specific guidance.",
    details:
      "The intelligence layer generates actionable fix descriptions, ready-to-use code snippets, links to relevant MDN documentation, and effort estimates. Quick Wins are identified as high-impact issues with low-effort fixes for immediate remediation.",
    icon: <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />,
  },
];

const WCAG_VERSIONS: CollapsibleCardProps[] = [
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
    tagColor: "bg-sky-50 text-sky-600",
    summary: "Extended 2.0 with 17 new success criteria for mobile, low vision, and cognitive disabilities.",
    details:
      "Added criteria for touch targets (2.5.5), text spacing (1.4.12), content reflow (1.4.10), orientation (1.3.4), and input purpose (1.3.5). Required by the European Accessibility Act (EAA) and referenced in updated ADA guidance. All 2.0 criteria remain \u2014 2.1 is a superset.",
  },
  {
    title: "WCAG 2.2",
    tag: "2023",
    tagColor: "bg-violet-50 text-violet-600",
    summary: "The latest version, adding 9 new criteria focused on cognitive accessibility and consistent help.",
    details:
      "Key additions include consistent help (3.2.6), accessible authentication (3.3.8), dragging movements (2.5.7), and focus appearance (2.4.11/2.4.12). Removed criterion 4.1.1 (Parsing) as it\u2019s now handled by modern browsers. Supersedes both 2.0 and 2.1 \u2014 all prior criteria are included.",
  },
];

const WCAG_LEVELS: CollapsibleCardProps[] = [
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
    summary: "The recommended target for most websites \u2014 required by most accessibility laws.",
    details:
      "Includes all Level A criteria plus requirements for color contrast (1.4.3 \u2014 4.5:1 ratio), resize text (1.4.4), focus visible (2.4.7), error suggestion (3.3.3), and consistent navigation (3.2.3). Referenced by ADA, Section 508, EN 301 549, and EAA. This is the standard the scanner defaults to.",
  },
  {
    title: "Level AAA",
    tag: "Enhanced",
    tagColor: "bg-purple-50 text-purple-700",
    summary: "The highest conformance level \u2014 not required but beneficial for specialized audiences.",
    details:
      "Adds stricter contrast (1.4.6 \u2014 7:1 ratio), sign language for audio (1.2.6), extended audio description (1.2.7), and reading level (3.1.5). Full AAA conformance is not recommended as a general policy because some criteria cannot be satisfied for all content types. Useful for targeted sections like education or government services.",
  },
];

const BEYOND_WCAG: CollapsibleCardProps[] = [
  {
    title: "Semantic Structure",
    summary: "Improvements to HTML semantics that help assistive technologies build accurate page models.",
    details:
      "Includes proper use of landmarks (<main>, <nav>, <aside>), heading hierarchy without skipped levels, meaningful link text instead of generic \"click here\", and correct use of lists and tables. These patterns help screen readers announce page structure and enable efficient navigation between sections.",
    icon: <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "Robust Interaction Patterns",
    summary: "Keyboard and assistive technology patterns that go beyond minimum WCAG requirements.",
    details:
      "Covers consistent focus indicators beyond the minimum 2.4.7 requirement, logical tab order, proper ARIA roles and states for custom widgets (menus, dialogs, tabs), roving tabindex for composite controls, and escape-key dismissal for overlays. These patterns ensure a smooth experience for keyboard-only and switch-device users.",
    icon: <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "Visual & Cognitive UX",
    summary: "Quality rules that reduce friction even when they aren't a formal WCAG failure.",
    details:
      "Includes ensuring visible labels match accessible names, avoiding placeholder-only labels, providing clear error messages with suggestions, using sufficient touch target sizes beyond the AA minimum, respecting prefers-reduced-motion, and avoiding content that flashes near thresholds. These rules prevent real-world usability barriers for users with low vision, cognitive disabilities, or motor impairments.",
    icon: <Eye className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    title: "Cognitive Accessibility",
    summary: "Patterns that support users with cognitive, learning, and attention-related disabilities.",
    details:
      "Covers consistent navigation patterns across pages, predictable component behavior, clear and simple language, chunked content with descriptive headings, timeout warnings with extension options, and minimal cognitive load in form flows. While some of these align with AAA criteria, the best-practice rules catch implementation gaps that formal WCAG checks miss.",
    icon: <Brain className="w-3.5 h-3.5" aria-hidden="true" />,
  },
];

interface HowItWorksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowItWorks({ open, onOpenChange }: HowItWorksProps) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="How It Works">
      <p className="text-sm text-slate-500 mb-5">
        Understand how the scanner analyzes your site, what WCAG means, and what best-practice rules cover beyond formal compliance.
      </p>

      <SectionHeading icon={<Shield className="w-3 h-3" aria-hidden="true" />}>
        Scanner Pipeline
      </SectionHeading>
      <div className="space-y-2.5 mb-6">
        {SCANNER_STEPS.map((card) => (
          <CollapsibleCard key={card.title} {...card} />
        ))}
      </div>

      <SectionHeading>WCAG Versions</SectionHeading>
      <div className="space-y-2.5 mb-6">
        {WCAG_VERSIONS.map((card) => (
          <CollapsibleCard key={card.title} {...card} />
        ))}
      </div>

      <SectionHeading>Conformance Levels</SectionHeading>
      <div className="space-y-2.5 mb-6">
        {WCAG_LEVELS.map((card) => (
          <CollapsibleCard key={card.title} {...card} />
        ))}
      </div>

      <SectionHeading>Beyond WCAG (Best Practices)</SectionHeading>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        These rules improve real-world accessibility and UX quality but are not required for formal WCAG conformance.
      </p>
      <div className="space-y-2.5">
        {BEYOND_WCAG.map((card) => (
          <CollapsibleCard key={card.title} {...card} />
        ))}
      </div>
    </SidePanel>
  );
}

function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
      {icon}
      {children}
    </h3>
  );
}
