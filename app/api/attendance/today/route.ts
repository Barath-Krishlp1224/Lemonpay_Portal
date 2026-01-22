// app/api/attendance/today/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 🔹 Get today's date in IST as "YYYY-MM-DD"
 * Must match the date format used in /api/attendance/route.ts
 */
function getTodayISTDateString(): string {
  const now = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const year = istNow.getUTCFullYear();
  const month = (istNow.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = istNow.getUTCDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * API to fetch the attendance record for a specific employee for today.
 */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required." },
        { status: 400 }
      );
    }

    const todayDateStr = getTodayISTDateString();

    // CRITICAL FIX: Query using the date STRING which is consistent with the submission route
    const record = await Attendance.findOne({
      employeeId,
      date: todayDateStr,
    }).select(
      "employeeId date punchInTime punchOutTime punchInLatitude punchInLongitude punchOutLatitude punchOutLongitude punchInBranch punchOutBranch"
    );

    return NextResponse.json({
      record: record ? record.toJSON() : null,
    });

  } catch (err: any) {
    console.error("Error fetching today's attendance:", err);

    return NextResponse.json(
      {
        error: "Internal Server Error during fetch.",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}