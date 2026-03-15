"use client";

import { useMemo } from "react";
import * as Select from "@radix-ui/react-select";
import * as Toggle from "@radix-ui/react-toggle";
import { Search, ChevronDown, Check } from "lucide-react";
import type { EngineKnowledge } from "@diegovelasquezweb/a11y-engine";

export interface PageOption {
  path: string;
  count: number;
}

interface FindingsToolbarProps {
  totalFindings: number;
  filterValue: string;
  searchQuery: string;
  allExpanded: boolean;
  pageFilter: string;
  pages: PageOption[];
  knowledge?: EngineKnowledge | null;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToggleAll: () => void;
  onPageFilterChange: (value: string) => void;
}

export function FindingsToolbar({
  totalFindings,
  filterValue,
  searchQuery,
  allExpanded,
  pageFilter,
  pages,
  knowledge,
  onFilterChange,
  onSearchChange,
  onToggleAll,
  onPageFilterChange,
}: FindingsToolbarProps) {
  const hasMultiplePages = pages.length > 1;

  const filterGroups = useMemo(() => {
    const severityItems = (knowledge?.severityLevels ?? []).map((s) => ({ value: s.id, label: s.label }));
    const principleItems = (knowledge?.wcagPrinciples ?? []).map((p) => ({ value: p.name, label: p.name }));

    return [
      { label: "General", items: [{ value: "all", label: "All Issues" }] },
      ...(severityItems.length > 0 ? [{ label: "Severity", items: severityItems }] : []),
      ...(principleItems.length > 0 ? [{ label: "WCAG Principle", items: principleItems }] : []),
    ];
  }, [knowledge]);

  return (
    <div className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md py-5 border-b border-slate-200/80 mb-8 flex flex-col gap-5">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Findings{" "}
            <span className="text-slate-600 font-bold ml-1">{totalFindings}</span>
          </h3>
        </div>
        <Toggle.Root
          pressed={allExpanded}
          onPressedChange={onToggleAll}
          className="px-5 py-2 rounded-md border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-slate-300 hover:text-slate-800 shadow-sm transition-all data-[state=on]:bg-slate-900 data-[state=on]:text-white data-[state=on]:border-slate-900"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </Toggle.Root>
      </div>

      <div className="flex items-center gap-4 w-full flex-wrap">
        <div className="relative flex-1 min-w-50">
          <label htmlFor="search-input" className="sr-only">
            Search violations
          </label>
          <input
            type="text"
            id="search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search violations..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest hidden sm:block whitespace-nowrap">
            Filter by:
          </span>
          <Select.Root value={filterValue} onValueChange={onFilterChange}>
            <Select.Trigger
              className="inline-flex items-center justify-between gap-2 pl-4 pr-3 py-3 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm transition-all cursor-pointer min-w-40"
              aria-label="Filter by"
            >
              <Select.Value />
              <Select.Icon>
                <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1.5">
                  {filterGroups.map((group, groupIdx) => (
                    <Select.Group key={group.label}>
                      {groupIdx > 0 && (
                        <Select.Separator className="h-px bg-slate-100 mx-2 my-1" />
                      )}
                      <Select.Label className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {group.label}
                      </Select.Label>
                      {group.items.map((item) => (
                        <Select.Item
                          key={item.value}
                          value={item.value}
                          className="relative flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded cursor-pointer outline-none select-none data-highlighted:bg-sky-50 data-highlighted:text-sky-700 data-[state=checked]:font-bold data-[state=checked]:text-sky-700"
                        >
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator className="absolute right-3">
                            <Check className="w-4 h-4 text-sky-600" strokeWidth={2.5} aria-hidden="true" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {hasMultiplePages && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest hidden sm:block whitespace-nowrap">
              Page:
            </span>
            <Select.Root value={pageFilter} onValueChange={onPageFilterChange}>
              <Select.Trigger
                className="inline-flex items-center justify-between gap-2 pl-4 pr-3 py-3 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm transition-all cursor-pointer min-w-44"
                aria-label="Filter by page"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="z-50 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                  position="popper"
                  sideOffset={4}
                >
                  <Select.Viewport className="p-1.5">
                    <Select.Group>
                      <Select.Label className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Pages
                      </Select.Label>
                      <Select.Item
                        value="all"
                        className="relative flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded cursor-pointer outline-none select-none data-highlighted:bg-sky-50 data-highlighted:text-sky-700 data-[state=checked]:font-bold data-[state=checked]:text-sky-700"
                      >
                        <Select.ItemText>All pages ({pages.length})</Select.ItemText>
                        <Select.ItemIndicator className="absolute right-3">
                          <Check className="w-4 h-4 text-sky-600" strokeWidth={2.5} aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                      {pages.map(({ path, count }) => (
                        <Select.Item
                          key={path}
                          value={path}
                          className="relative flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded cursor-pointer outline-none select-none data-highlighted:bg-sky-50 data-highlighted:text-sky-700 data-[state=checked]:font-bold data-[state=checked]:text-sky-700"
                        >
                          <Select.ItemText>
                            {path} ({count})
                          </Select.ItemText>
                          <Select.ItemIndicator className="absolute right-3">
                            <Check className="w-4 h-4 text-sky-600" strokeWidth={2.5} aria-hidden="true" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        )}
      </div>
    </div>
  );
}
