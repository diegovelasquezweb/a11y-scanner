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

  let pdfBuffer: Buffer | null = null;

  if (process.env.LOCAL_MODE === "true") {
    const pdfPath = path.join(process.cwd(), "src", "data", "scans", `${scanId}.pdf`);
    if (fs.existsSync(pdfPath)) {
      pdfBuffer = fs.readFileSync(pdfPath);
    }
  } else {
    const { getArtifactFile } = await import("@/lib/github");
    const buf = await getArtifactFile(scanId, "stakeholder.pdf");
    if (buf && buf.length > 0) pdfBuffer = buf;
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return new NextResponse("PDF not available for this scan.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="a11y-report-${scanId}.pdf"`,
    },
  });
}
