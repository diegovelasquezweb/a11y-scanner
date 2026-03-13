"use client";

import * as Select from "@radix-ui/react-select";
import * as Toggle from "@radix-ui/react-toggle";

interface FindingsToolbarProps {
  totalFindings: number;
  filterValue: string;
  searchQuery: string;
  allExpanded: boolean;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToggleAll: () => void;
}

const FILTER_GROUPS = [
  {
    label: "General",
    items: [{ value: "all", label: "All Issues" }],
  },
  {
    label: "Severity",
    items: [
      { value: "Critical", label: "Critical" },
      { value: "Serious", label: "Serious" },
      { value: "Moderate", label: "Moderate" },
      { value: "Minor", label: "Minor" },
    ],
  },
  {
    label: "WCAG Principle",
    items: [
      { value: "Perceivable", label: "Perceivable" },
      { value: "Operable", label: "Operable" },
      { value: "Understandable", label: "Understandable" },
      { value: "Robust", label: "Robust" },
    ],
  },
];

export function FindingsToolbar({
  totalFindings,
  filterValue,
  searchQuery,
  allExpanded,
  onFilterChange,
  onSearchChange,
  onToggleAll,
}: FindingsToolbarProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md py-5 border-b border-slate-200/80 mb-8 flex flex-col gap-5">
      {/* Row 1: Title & Expand All */}
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

      {/* Row 2: Search & Filter */}
      <div className="flex items-center gap-4 w-full flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
          <svg
            className="absolute left-4 top-3.5 w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest hidden sm:block whitespace-nowrap">
            Filter by:
          </span>
          <Select.Root value={filterValue} onValueChange={onFilterChange}>
            <Select.Trigger
              className="inline-flex items-center justify-between gap-2 pl-4 pr-3 py-3 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm transition-all cursor-pointer min-w-[160px]"
              aria-label="Filter by"
            >
              <Select.Value />
              <Select.Icon>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1.5">
                  {FILTER_GROUPS.map((group, groupIdx) => (
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
                          className="relative flex items-center px-3 py-2 text-sm font-medium text-slate-700 rounded cursor-pointer outline-none select-none data-[highlighted]:bg-sky-50 data-[highlighted]:text-sky-700 data-[state=checked]:font-bold data-[state=checked]:text-sky-700"
                        >
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator className="absolute right-3">
                            <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
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
      </div>
    </div>
  );
}
