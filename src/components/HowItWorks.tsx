"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Globe, Cpu, GitMerge, Sparkles, BookOpen, Keyboard, Eye, Brain } from "lucide-react";
import { SidePanel } from "@/components/SidePanel";
import type { EngineKnowledge, DocArticle, DocSection } from "@diegovelasquezweb/a11y-engine";

const ICON_MAP: Record<string, React.ReactNode> = {
  globe: <Globe className="w-3.5 h-3.5" aria-hidden="true" />,
  cpu: <Cpu className="w-3.5 h-3.5" aria-hidden="true" />,
  "git-merge": <GitMerge className="w-3.5 h-3.5" aria-hidden="true" />,
  sparkles: <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />,
  book: <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />,
  keyboard: <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />,
  eye: <Eye className="w-3.5 h-3.5" aria-hidden="true" />,
  brain: <Brain className="w-3.5 h-3.5" aria-hidden="true" />,
};

const BADGE_STYLE = "bg-slate-100 text-slate-600";

function ArticleCard({ article }: { article: DocArticle }) {
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
                {article.icon && ICON_MAP[article.icon] && (
                  <span className="text-slate-500">{ICON_MAP[article.icon]}</span>
                )}
                <span className="text-sm font-bold text-slate-900">{article.title}</span>
                {article.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BADGE_STYLE}`}>
                    {article.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{article.summary}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className="card-body">
          <div className="px-4 pb-3 pt-0">
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-600 leading-relaxed">{article.body}</p>
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

function SectionBlock({ section }: { section: DocSection }) {
  if (section.articles && section.articles.length > 0) {
    return (
      <div className="mb-6">
        <SectionHeading>{section.heading}</SectionHeading>
        <div className="space-y-2.5">
          {section.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    );
  }

  if (section.groups && section.groups.length > 0) {
    return (
      <div className="mb-6">
        <SectionHeading>{section.heading}</SectionHeading>
        {section.groups.map((group) => (
          <div key={group.id} className="mb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{group.label}</p>
            <div className="space-y-2.5">
              {group.articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

interface HowItWorksProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledge?: EngineKnowledge | null;
}

const SECTION_ORDER = ["understanding-wcag", "how-it-works"];

export function HowItWorks({ open, onOpenChange, knowledge }: HowItWorksProps) {
  const raw = knowledge?.docs?.sections ?? [];
  const sections = [...raw].sort(
    (a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id)
  );

  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="Help">
      <p className="text-sm text-slate-500 mb-5">
        Learn how the scanner works, what WCAG means, and how conformance levels apply.
      </p>
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}
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
