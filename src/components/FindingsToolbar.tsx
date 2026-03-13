"use client";

interface FindingsToolbarProps {
  totalFindings: number;
  filterValue: string;
  searchQuery: string;
  allExpanded: boolean;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToggleAll: () => void;
}

export function FindingsToolbar({
  totalFindings,
  filterValue,
  searchQuery,
  allExpanded,
  onFilterChange,
  onSearchChange,
  onToggleAll,
}: FindingsToolbarProps) {
  const selectClasses =
    "pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm transition-all appearance-none cursor-pointer";

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
        <button
          type="button"
          onClick={onToggleAll}
          className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 hover:border-slate-300 hover:text-slate-800 shadow-sm transition-all"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
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
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
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
          <label
            htmlFor="filter-select"
            className="text-xs font-bold text-slate-600 uppercase tracking-widest hidden sm:block whitespace-nowrap"
          >
            Filter by:
          </label>
          <select
            id="filter-select"
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className={selectClasses}
          >
            <optgroup label="General">
              <option value="all">All Issues</option>
            </optgroup>
            <optgroup label="Severity">
              <option value="Critical">Critical</option>
              <option value="Serious">Serious</option>
              <option value="Moderate">Moderate</option>
              <option value="Minor">Minor</option>
            </optgroup>
            <optgroup label="WCAG Principle">
              <option value="Perceivable">Perceivable</option>
              <option value="Operable">Operable</option>
              <option value="Understandable">Understandable</option>
              <option value="Robust">Robust</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}
