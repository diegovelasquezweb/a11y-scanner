# a11y-scanner

Web accessibility scanner powered by [`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine). Runs multi-engine WCAG audits against any URL and delivers enriched findings, compliance scores, and actionable reports.

**Live:** [a11y-scanner-tau.vercel.app](https://a11y-scanner-tau.vercel.app)

## Setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` and fill in the required values:

- `GH_TOKEN` — [Fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with **Actions (Read and write)** permission on the workflow repo (required)
- `GH_OWNER`, `GH_REPO` — GitHub username and repo name where the scan workflow lives (required)
- `ANTHROPIC_API_KEY` — enables AI-powered fix suggestions (optional)

## How the engine is used

### Run a scan

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
  // Optional: scan source code via GitHub API — no clone required
  repoUrl: "https://github.com/owner/repo",
  githubToken: process.env.GH_TOKEN,
  // Optional: AI-powered fix suggestions via Claude
  ai: {
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
});
```

### Get enriched findings and compliance summary

```ts
import { getFindings, getOverview } from "@diegovelasquezweb/a11y-engine";

const findings = getFindings(payload, {
  screenshotUrlBuilder: (path) => `/api/scan/${scanId}/screenshot?path=${encodeURIComponent(path)}`,
});
const { score, scoreLabel, wcagStatus, totals, personaGroups, quickWins, detectedStack } = getOverview(findings, payload);

// score: 0–100
// scoreLabel: "Excellent" | "Good" | "Fair" | "Poor" | "Critical"
// wcagStatus: "Pass" | "Conditional Pass" | "Fail"
// detectedStack: { framework: "nextjs", cms: null, uiLibraries: ["radix-ui"] }

// AI-enhanced findings have extra fields when AI ran:
// findings[0].aiEnhanced       → true
// findings[0].aiFixDescription → Claude-generated fix description
// findings[0].aiFixCode        → Claude-generated code snippet
```

### Generate reports

```ts
import { getPDFReport, getHTMLReport, getChecklist, getRemediationGuide } from "@diegovelasquezweb/a11y-engine";

const pdf       = await getPDFReport(payload, { baseUrl });
const html      = await getHTMLReport(payload, { baseUrl });
const checklist = await getChecklist({ baseUrl });
const guide     = await getRemediationGuide(payload, {
  patternFindings: payload.patternFindings ?? null,
});
```

### Load the knowledge pack

```ts
import { getKnowledge } from "@diegovelasquezweb/a11y-engine";

const knowledge = getKnowledge({ locale: "en" });
// knowledge.scanner          → scan options and engine descriptions (for Advanced Settings UI)
// knowledge.conformanceLevels → WCAG A/AA/AAA with axe-core tag mappings
// knowledge.wcagPrinciples   → the 4 WCAG principles
// knowledge.severityLevels   → Critical/Serious/Moderate/Minor definitions
// knowledge.personas         → persona labels and descriptions
// knowledge.concepts         → UI concept definitions
// knowledge.glossary         → accessibility glossary
```

## Infrastructure utilities

**`src/lib/github.ts`** handles the GitHub Actions integration when `LOCAL_MODE` is not set. It triggers a `workflow_dispatch` event to start a remote scan, polls the run status, and downloads the result artifacts as ZIP files using the GitHub REST API. The engine runs inside the workflow, not inside the Next.js process.

**`src/lib/scans.ts`** manages local scan file paths under `os.tmpdir()/a11y-scans/`. Each scan is identified by a UUID and stored as individual files (`status.json`, `findings.json`, `pdf`, `checklist.html`). This is only used when `LOCAL_MODE=true`.

## Powered by

[`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine) handles scanning, enrichment, reporting, and knowledge. See its README and API reference for full documentation.
