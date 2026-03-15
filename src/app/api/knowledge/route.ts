import { NextResponse } from "next/server";
import { getKnowledge } from "@diegovelasquezweb/a11y-engine";

export async function GET() {
  try {
    const data = getKnowledge({ locale: "en" });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load knowledge pack.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
