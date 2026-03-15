import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getArtifactFile } from "@/lib/github";
import { getScanPath } from "@/lib/scans";
import type { ScanPayload } from "@diegovelasquezweb/a11y-engine";

export const dynamic = "force-dynamic";

async function loadEngine() {
  return await import("@diegovelasquezweb/a11y-engine");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return new NextResponse("Invalid scan ID.", { status: 400 });
  }

  let rawFindings: Record<string, unknown>;

  if (process.env.LOCAL_MODE === "true") {
    const statusPath = getScanPath(scanId, "status.json");
    if (!fs.existsSync(statusPath)) {
      return new NextResponse("Scan not found.", { status: 404 });
    }
    const findingsPath = getScanPath(scanId, "findings.json");
    if (!fs.existsSync(findingsPath)) {
      return new NextResponse("Scan result not found.", { status: 404 });
    }
    rawFindings = JSON.parse(fs.readFileSync(findingsPath, "utf-8"));
  } else {
    const resultBuffer = await getArtifactFile(scanId, "result.json");
    if (!resultBuffer) {
      return new NextResponse("Scan artifact not found or expired.", { status: 404 });
    }
    try {
      rawFindings = JSON.parse(resultBuffer.toString("utf-8"));
    } catch {
      return new NextResponse("Failed to parse scan results.", { status: 500 });
    }
  }

  const { getRemediationGuide } = await loadEngine();
  const payload = rawFindings as unknown as ScanPayload;
  const { markdown } = await getRemediationGuide(payload);

  const filename = `a11y-remediation-${scanId}.md`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
