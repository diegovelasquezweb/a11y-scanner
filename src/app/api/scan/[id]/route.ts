import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId || !/^[a-f0-9]{16}$/.test(scanId)) {
    return NextResponse.json(
      { success: false, error: "Invalid scan ID." },
      { status: 400 }
    );
  }

  // Check status first
  const statusPath = path.join(SCANS_DIR, `${scanId}.status.json`);
  if (!fs.existsSync(statusPath)) {
    return NextResponse.json(
      { success: false, error: "Scan not found." },
      { status: 404 }
    );
  }

  const statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8"));

  if (statusData.status === "scanning") {
    return NextResponse.json({
      success: true,
      status: "scanning",
      data: null,
    });
  }

  if (statusData.status === "error") {
    return NextResponse.json({
      success: false,
      status: "error",
      error: statusData.error || "Scan failed.",
    });
  }

  // Load result
  const resultPath = path.join(SCANS_DIR, `${scanId}.json`);
  if (!fs.existsSync(resultPath)) {
    return NextResponse.json(
      { success: false, error: "Scan result not found." },
      { status: 404 }
    );
  }

  const data = JSON.parse(fs.readFileSync(resultPath, "utf-8"));

  return NextResponse.json({
    success: true,
    status: "completed",
    data,
  });
}
