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

  const htmlBuffer = await getArtifactFile(scanId, "checklist.html");

  if (!htmlBuffer) {
    return new NextResponse("Checklist not available for this scan.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(htmlBuffer), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
