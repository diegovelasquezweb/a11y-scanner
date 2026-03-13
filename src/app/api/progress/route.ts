import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const engineBase = path.join(process.cwd(), "src", "engine");
  const progressPath = path.join(engineBase, ".audit", "progress.json");

  try {
    if (!fs.existsSync(progressPath)) {
      return NextResponse.json({ steps: {}, currentStep: null });
    }
    const data = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ steps: {}, currentStep: null });
  }
}
