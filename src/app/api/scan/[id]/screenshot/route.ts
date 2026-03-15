import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function sanitizeRelativePath(value: string): string | null {
  if (!value) return null;
  const normalized = value.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) return null;
  return normalized;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params;
  const rawPath = request.nextUrl.searchParams.get("path") || "";
  const relativePath = sanitizeRelativePath(rawPath);

  if (!scanId || !relativePath) {
    return new NextResponse("Invalid screenshot request.", { status: 400 });
  }

  let imageBuffer: Buffer | null = null;

  if (process.env.LOCAL_MODE === "true") {
    const SCANS_DIR = path.join(process.cwd(), "src", "data", "scans");
    const screenshotsDir = path.join(SCANS_DIR, `${scanId}.screenshots`);
    const filename = path.basename(relativePath);
    const absolutePath = path.join(screenshotsDir, filename);
    if (fs.existsSync(absolutePath)) {
      imageBuffer = fs.readFileSync(absolutePath);
    }
  } else {
    const { getArtifactFile } = await import("@/lib/github");
    imageBuffer = await getArtifactFile(scanId, relativePath);
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    return new NextResponse("Screenshot not available.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(imageBuffer), {
    status: 200,
    headers: {
      "Content-Type": getContentType(relativePath),
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
