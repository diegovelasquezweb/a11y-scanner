import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getArtifactFile } from "@/lib/github";
import { getScanPath } from "@/lib/scans";
import type { EnrichedFinding, AuditSummary, ScanPayload } from "@diegovelasquezweb/a11y-engine";

export const dynamic = "force-dynamic";

async function loadEngine() {
  return await import("@diegovelasquezweb/a11y-engine");
}

async function buildJsonExport(rawFindings: Record<string, unknown>) {
  const engine = await loadEngine();
  const { getFindings, getOverview, getKnowledge } = engine;
  const payload = rawFindings as unknown as ScanPayload;

  const findings: EnrichedFinding[] = getFindings(payload);
  const { totals, score, scoreLabel, wcagStatus, personaGroups, targetUrl, detectedStack, totalFindings } =
    getOverview(findings, payload) as AuditSummary & { scoreLabel: string };

  const engineVersion = getKnowledge().version;

  return {
    version: engineVersion,
    generatedAt: new Date().toISOString(),
    targetUrl,
    score,
    scoreLabel,
    wcagStatus,
    totals,
    totalFindings,
    detectedStack: detectedStack ?? null,
    personaGroups,
    findings,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return NextResponse.json({ success: false, error: "Invalid scan ID." }, { status: 400 });
  }

  let rawFindings: Record<string, unknown>;

  if (process.env.LOCAL_MODE === "true") {
    const statusPath = getScanPath(scanId, "status.json");
    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({ success: false, error: "Scan not found." }, { status: 404 });
    }
    const findingsPath = getScanPath(scanId, "findings.json");
    if (!fs.existsSync(findingsPath)) {
      return NextResponse.json({ success: false, error: "Scan result not found." }, { status: 404 });
    }
    rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));
  } else {
    const resultBuffer = await getArtifactFile(scanId, "result.json");
    if (!resultBuffer) {
      return NextResponse.json({ success: false, error: "Scan artifact not found or expired." }, { status: 404 });
    }
    try {
      rawFindings = JSON.parse(resultBuffer.toString("utf-8"));
    } catch {
      return NextResponse.json({ success: false, error: "Failed to parse scan results." }, { status: 500 });
    }
  }

  const data = await buildJsonExport(rawFindings);
  const filename = `a11y-audit-${scanId}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
