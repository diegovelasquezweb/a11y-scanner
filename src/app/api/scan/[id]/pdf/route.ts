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

  const pdfPath = path.join(SCANS_DIR, `${scanId}.pdf`);

  // Serve cached PDF if it exists
  if (fs.existsSync(pdfPath)) {
    const pdf = fs.readFileSync(pdfPath);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="a11y-report-${scanId}.pdf"`,
      },
    });
  }

  // Need raw findings to generate PDF
  const findingsPath = path.join(SCANS_DIR, `${scanId}.findings.json`);
  const resultPath = path.join(SCANS_DIR, `${scanId}.json`);

  if (!fs.existsSync(resultPath)) {
    return new NextResponse("Scan not found.", { status: 404 });
  }

  // If raw findings snapshot doesn't exist (older scans), try engine audit dir
  let inputPath = findingsPath;
  if (!fs.existsSync(findingsPath)) {
    const auditFindingsPath = path.join(ENGINE_BASE, ".audit", "a11y-findings.json");
    if (fs.existsSync(auditFindingsPath)) {
      inputPath = auditFindingsPath;
    } else {
      return new NextResponse(
        "Raw findings not available for this scan. Run a new scan to enable PDF generation.",
        { status: 404 }
      );
    }
  }

  // Read targetUrl from scan result
  let baseUrl = "";
  try {
    const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
    baseUrl = result.targetUrl || "";
  } catch {
    // fallback
  }

  const pdfScript = path.join(ENGINE_BASE, "scripts", "reports", "builders", "pdf.mjs");

  if (!fs.existsSync(pdfScript)) {
    return new NextResponse("PDF builder not available.", { status: 500 });
  }

  try {
    const cmd = [
      "node",
      pdfScript,
      "--input",
      inputPath,
      "--output",
      pdfPath,
      "--base-url",
      `"${baseUrl}"`,
    ].join(" ");

    execSync(cmd, {
      timeout: 30000,
      stdio: "pipe",
      cwd: ENGINE_BASE,
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Failed to generate PDF report: ${message}`, {
      status: 500,
    });
  }

  if (!fs.existsSync(pdfPath)) {
    return new NextResponse("PDF generation completed but file not found.", {
      status: 500,
    });
  }

  const pdf = fs.readFileSync(pdfPath);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="a11y-report-${scanId}.pdf"`,
    },
  });
}
