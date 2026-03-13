import { NextRequest, NextResponse } from "next/server";
import { getArtifactFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;

  if (!scanId) {
    return new NextResponse("Invalid scan ID.", { status: 400 });
  }

  const pdfBuffer = await getArtifactFile(scanId, "stakeholder.pdf");

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
