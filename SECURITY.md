# Security Policy

## Reporting a Vulnerability

We take the security and integrity of the a11y scanner seriously. Please do not open a public GitHub issue for security vulnerabilities.

Use [GitHub's private vulnerability reporting](https://github.com/diegovelasquezweb/a11y-scanner/security/advisories/new) to submit a report confidentially. Include a detailed description of the issue, clear steps to reproduce, and potential impact analysis.

Confirmed vulnerabilities will be addressed with a high-priority patch and credited to the researcher in the changelog (unless anonymity is preferred).

## Execution Scope & Safety

The a11y scanner operates under a **remote-first** security model:

- **Remote Execution**: Scans run inside GitHub Actions runners. Audit data is temporarily stored as workflow artifacts and deleted after 30 days.
- **Secret Management**: API keys (`GH_TOKEN`, `ANTHROPIC_API_KEY`) are stored as GitHub Actions secrets and never exposed in logs or artifacts.
- **Sandboxing Notes**:
  - The scanner never executes user-supplied code. GitHub repo URLs are passed as read-only arguments to the engine.
  - The Next.js server does not run Playwright or the engine directly — all scan execution is delegated to isolated GitHub Actions runners.
