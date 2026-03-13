import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return new NextResponse("Invalid scan ID.", { status: 400 });
  }

  let htmlBuffer: Buffer | null = null;

  if (process.env.LOCAL_MODE === "true") {
    const checklistPath = path.join(process.cwd(), "src", "data", "scans", `${scanId}.checklist.html`);
    if (fs.existsSync(checklistPath)) {
      htmlBuffer = fs.readFileSync(checklistPath);
    }
  } else {
    const { getArtifactFile } = await import("@/lib/github");
    htmlBuffer = await getArtifactFile(scanId, "checklist.html");
  }

  if (!htmlBuffer) {
    return new NextResponse("Checklist not available for this scan.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(htmlBuffer), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
