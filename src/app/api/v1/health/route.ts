import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "UP",
    service: "ATHARX",
    environment: process.env.OMANTEL_API_MODE === "production" ? "production" : "mock",
    timestamp: new Date().toISOString(),
  });
}
