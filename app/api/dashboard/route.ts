import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/dashboard] failed:", err);
    return NextResponse.json({ error: "Failed to load dashboard", detail: String(err) }, { status: 500 });
  }
}
