# a11y-scanner

Web accessibility scanner powered by [`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine). Runs multi-engine WCAG audits against any URL and delivers enriched findings, compliance scores, and actionable reports.

**Live:** [a11y-scanner-tau.vercel.app](https://a11y-scanner-tau.vercel.app)

## Setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` and fill in the required values:

- `GH_TOKEN`, `GH_OWNER`, `GH_REPO` — GitHub Actions integration (required)
- `ANTHROPIC_API_KEY` — enables AI-powered fix suggestions (optional)
- `AI_ENABLED` — set to `false` to disable AI enrichment even when a key is present

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
});
```

### Get enriched findings and compliance summary

```ts
import { getFindings, getOverview } from "@diegovelasquezweb/a11y-engine";

const findings = getFindings(payload);
const { score, wcagStatus, totals, personaGroups, quickWins } = getOverview(findings, payload);
```

### Generate reports

```ts
import { getPDFReport, getChecklist, getRemediationGuide, getFindings, getOverview } from "@diegovelasquezweb/a11y-engine";

const pdf       = await getPDFReport(payload, { baseUrl });
const checklist = await getChecklist({ baseUrl });
const guide     = await getRemediationGuide(payload);

// JSON export: same data as the results endpoint, serialized for download
const findings  = getFindings(payload);
const overview  = getOverview(findings, payload);
const json      = JSON.stringify({ ...overview, findings }, null, 2);
```

### Load the knowledge pack

```ts
import { getKnowledge } from "@diegovelasquezweb/a11y-engine";

const knowledge = getKnowledge({ locale: "en" });
// knowledge.conformanceLevels, knowledge.wcagPrinciples, knowledge.severityLevels
// knowledge.concepts, knowledge.docs, knowledge.scanner, knowledge.personas
```

## Infrastructure utilities

**`src/lib/github.ts`** handles the GitHub Actions integration when `LOCAL_MODE` is not set. It triggers a `workflow_dispatch` event to start a remote scan, polls the run status, and downloads the result artifacts as ZIP files using the GitHub REST API. The engine runs inside the workflow, not inside the Next.js process.

**`src/lib/scans.ts`** manages local scan file paths under `os.tmpdir()/a11y-scans/`. Each scan is identified by a UUID and stored as individual files (`status.json`, `findings.json`, `pdf`, `checklist.html`). This is only used when `LOCAL_MODE=true`.

## Powered by

[`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine) handles scanning, enrichment, reporting, and knowledge. See its README and API reference for full documentation.
