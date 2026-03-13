import { NextRequest, NextResponse } from "next/server";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");
const ENGINE_BASE = path.join(process.cwd(), "src", "engine");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId || !/^[a-f0-9]{16}$/.test(scanId)) {
    return new NextResponse("Invalid scan ID.", { status: 400 });
  }

  const checklistPath = path.join(SCANS_DIR, `${scanId}.checklist.html`);

  // Generate on demand if it doesn't exist yet
  if (!fs.existsSync(checklistPath)) {
    // Read the scan result to get targetUrl
    const resultPath = path.join(SCANS_DIR, `${scanId}.json`);
    if (!fs.existsSync(resultPath)) {
      return new NextResponse("Scan not found.", { status: 404 });
    }

    let baseUrl = "";
    try {
      const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
      baseUrl = result.targetUrl || "";
    } catch {
      // fallback to empty
    }

    const checklistScript = path.join(ENGINE_BASE, "scripts", "reports", "builders", "checklist.mjs");
    try {
      const cmd = `node ${checklistScript} --output ${checklistPath} --base-url "${baseUrl}"`;
      execSync(cmd, { timeout: 10000, stdio: "pipe", cwd: ENGINE_BASE });
    } catch {
      return new NextResponse("Failed to generate checklist.", { status: 500 });
    }
  }

  const html = fs.readFileSync(checklistPath, "utf-8");

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
