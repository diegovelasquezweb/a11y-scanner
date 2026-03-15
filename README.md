# a11y-scanner

Reference implementation and visual demo of [`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine). All accessibility logic, knowledge, and report generation comes from the engine. This app only provides the UI and API layer.

## What it demonstrates

- Multi-engine scanning (axe-core, CDP, pa11y)
- Enriched findings with fix code, WCAG mappings, and persona impact
- Per-page filtering and results grouping
- Compliance score, severity breakdown, and quick wins
- Knowledge-driven help panel (WCAG docs, conformance levels, scanner pipeline)
- Export actions: Stakeholder PDF, Manual Checklist, JSON Export, Remediation Guide for AI agents
- Jira integration with prefilled issue creation

## Setup

```bash
pnpm install
```

Create `.env.local`:

```env
LOCAL_MODE=true
```

For GitHub Actions mode (remote scan execution), set:

```env
GH_TOKEN=<github-personal-access-token>
GH_OWNER=<github-org-or-user>
GH_REPO=<repo-with-scan-workflow>
GH_WORKFLOW_ID=<workflow-file-name.yml>
```

```bash
pnpm dev
```

## API Routes

| Route | Method | Engine function | Description |
|:---|:---|:---|:---|
| `/api/scan` | POST | `runAudit()` | Starts a new scan |
| `/api/scan/[id]` | GET | `getFindings()`, `getOverview()` | Returns enriched results |
| `/api/scan/[id]/pdf` | GET | `getPDFReport()` | Stakeholder PDF report |
| `/api/scan/[id]/checklist` | GET | `getChecklist()` | Manual WCAG 2.2 AA checklist |
| `/api/scan/[id]/json` | GET | `getFindings()`, `getOverview()` | Full audit JSON export |
| `/api/scan/[id]/remediation` | GET | `getRemediationGuide()` | Markdown guide for AI agents |
| `/api/knowledge` | GET | `getKnowledge()` | Engine knowledge pack |
| `/api/progress` | GET | | Scan polling status |
| `/api/scan/[id]/screenshot` | GET | | Page screenshot artifact |

## Engine

All domain logic lives in [`@diegovelasquezweb/a11y-engine`](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine). See its README and API reference for full documentation.
