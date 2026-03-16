# a11y-scanner

Web accessibility scanner powered by [`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine). Runs multi-engine WCAG audits against any URL and delivers enriched findings, compliance scores, and actionable reports.

**Live:** [a11y-scanner-tau.vercel.app](https://a11y-scanner-tau.vercel.app)

## Setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` and fill in the required values.

---

## Engine usage patterns

### Run a scan

`runAudit` is the entry point for the full scan pipeline. All options are optional except `baseUrl`.

```ts
import { runAudit } from "@diegovelasquezweb/a11y-engine";

const payload = await runAudit({
  baseUrl: "https://example.com",
  maxRoutes: 1,
  crawlDepth: 1,
  waitUntil: "domcontentloaded",
  timeoutMs: 30000,
  viewport: { width: 1280, height: 800 },
  colorScheme: "light",
  axeTags: ["wcag2a", "wcag21a", "wcag22a", "wcag2aa", "wcag21aa", "wcag22aa"],
  engines: { axe: true, cdp: true, pa11y: true },
  // Optional: source code scan via GitHub API — no clone required
  repoUrl: "https://github.com/owner/repo",
  githubToken: process.env.GH_TOKEN,
  // Optional: AI-powered fix suggestions via Claude
  ai: {
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
    githubToken: process.env.GH_TOKEN,
  },
  // Optional: track progress per step — see engine API reference for step keys and statuses
  onProgress: (step, status, extra) => {},
  screenshotsDir: getScreenshotsDir(scanId), // e.g. os.tmpdir()/a11y-scans/<scanId>.screenshots
});
```

Returns a `ScanPayload` consumed by all other engine functions.

---

### Get enriched findings

`getFindings` normalizes and enriches the raw payload into a UI-ready `EnrichedFinding[]`, sorted by severity.

```ts
import { getFindings } from "@diegovelasquezweb/a11y-engine";

const findings = getFindings(payload, {
  // Rewrite internal screenshot paths into API-served URLs
  screenshotUrlBuilder: (rawPath) =>
    `/api/scan/${scanId}/screenshot?path=${encodeURIComponent(rawPath)}`,
});
```

When AI enrichment ran, the AI fields are stored in the raw payload and must be merged back onto the normalized findings:

```ts
// Build an AI field map from the raw payload before calling getFindings
const rawList = (payload as Record<string, unknown>).findings as Record<string, unknown>[];
const aiMap = new Map(
  rawList
    .filter((f) => f.aiEnhanced)
    .map((f) => [f.id as string, {
      aiEnhanced: true,
      aiFixDescription: f.ai_fix_description as string | null,
      aiFixCode: f.ai_fix_code as string | null,
      aiFixCodeLang: f.ai_fix_code_lang as string | null,
    }])
);

const findings = getFindings(payload, { screenshotUrlBuilder }).map((f) => {
  const ai = aiMap.get(f.id);
  return ai ? { ...f, ...ai } : f;
});
```



---

### Get compliance summary

`getOverview` computes score, WCAG status, severity totals, persona groups, quick wins, and detected stack from the enriched findings.

```ts
import { getFindings, getOverview } from "@diegovelasquezweb/a11y-engine";
import type { AuditSummary } from "@diegovelasquezweb/a11y-engine";

const {
  score,
  label,          // "Excellent" | "Good" | "Fair" | "Poor" | "Critical"
  wcagStatus,     // "Pass" | "Conditional Pass" | "Fail"
  totals,         // { Critical: number, Serious: number, Moderate: number, Minor: number }
  personaGroups,  // { screenReader: { label, count, icon }, keyboard: { ... }, ... }
  quickWins,      // top 3 Critical/Serious findings with fixCode
  targetUrl,
  detectedStack,  // { framework: "nextjs", cms: null, uiLibraries: ["radix-ui"] }
  totalFindings,
} = getOverview(findings, payload) as AuditSummary;
```

---

### Generate reports

Each report function takes the `ScanPayload` directly and returns the artifact in memory — no filesystem writes.

```ts
import { getPDFReport, getHTMLReport, getChecklist, getRemediationGuide } from "@diegovelasquezweb/a11y-engine";

// PDF compliance report — returns { buffer: Buffer, contentType: "application/pdf" }
const { buffer, contentType } = await getPDFReport(payload, { baseUrl: targetUrl });

// Interactive HTML dashboard — returns { html: string, contentType: "text/html" }
const { html } = await getHTMLReport(payload, { baseUrl: targetUrl });

// Manual testing checklist (41 WCAG checks) — returns { html: string, contentType: "text/html" }
const { html: checklistHtml } = await getChecklist({ baseUrl: targetUrl });

// Markdown remediation guide — returns { markdown: string, contentType: "text/markdown" }
const { markdown } = await getRemediationGuide(payload, {
  baseUrl: targetUrl,
  patternFindings: payload.patternFindings ?? null,
});
```

Serving a report as a Next.js API response:

```ts
// PDF download
return new NextResponse(new Uint8Array(buffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="a11y-report-${scanId}.pdf"`,
  },
});

// Markdown download
return new NextResponse(markdown, {
  headers: {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="a11y-remediation-${scanId}.md"`,
  },
});
```

---

### Load the knowledge pack

`getKnowledge` returns all accessibility knowledge in a single synchronous call. Used to populate the Advanced Settings panel, conformance level selectors, and glossary UI.

```ts
import { getKnowledge } from "@diegovelasquezweb/a11y-engine";

const knowledge = getKnowledge({ locale: "en" });
// knowledge.scanner           → engine descriptions and scan option metadata
// knowledge.conformanceLevels → WCAG A/AA/AAA with axe-core tag mappings
// knowledge.wcagPrinciples    → the four WCAG principles
// knowledge.severityLevels    → Critical/Serious/Moderate/Minor definitions
// knowledge.personas          → persona labels, descriptions, and mapped rules
// knowledge.concepts          → UI concept definitions (tooltips, explainers)
// knowledge.glossary          → accessibility term definitions
// knowledge.docs              → documentation articles by section and group
```

---

## Powered by

[`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine) — handles scanning, enrichment, reporting, and knowledge. See its [README](https://github.com/diegovelasquezweb/a11y-engine#readme) and [API reference](https://github.com/diegovelasquezweb/a11y-engine/blob/main/docs/api-reference.md) for full documentation.
