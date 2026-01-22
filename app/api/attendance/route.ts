import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// --- GET Handler: Fetches Attendance History with Time Data ---
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    
    // Support filtering by employee ID, days, or custom range
    const empId = searchParams.get("empId"); 
    const days = searchParams.get("days");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query: any = {};

    // 1. Filter by Employee ID if provided
    if (empId) {
      query.employeeId = empId;
    }

    // 2. Filter by Date Range (Custom)
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    } 
    // 3. Filter by Last X Days
    else if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const dateString = startDate.toISOString().split("T")[0];
      query.date = { $gte: dateString };
    }

    // Sort by date descending so newest shows first
    const attendances = await Attendance.find(query).sort({ date: -1 }).lean();

    /** * FIXED: We now return the actual punch times. 
     * Previously, 'present' was the only info sent.
     */
    const formattedAttendances = attendances.map((att: any) => ({
      employeeId: att.employeeId,
      date: att.date,
      present: !!att.punchInTime,
      punchInTime: att.punchInTime || null,   // Actual timestamp
      punchOutTime: att.punchOutTime || null, // Actual timestamp
      punchInBranch: att.punchInBranch || "Office",
      punchOutBranch: att.punchOutBranch || "Office",
      mode: att.mode || "OFFICE"
    }));

    return NextResponse.json({ 
      success: true, 
      attendances: formattedAttendances 
    });

  } catch (err: any) {
    console.error("Attendance Fetch Error:", err);
    return NextResponse.json({ error: "Failed to fetch attendance data" }, { status: 500 });
  }
}

// --- Helper: Upload captured image to AWS S3 ---
async function uploadToS3(base64Data: string, date: string, empName: string, empId: string, punchType: string) {
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const safeName = empName.toLowerCase().replace(/\s+/g, "-");
  const folderName = `${safeName}-${empId}`;
  const timestamp = Date.now();
  const fileName = `${punchType}_${timestamp}.jpg`;
  const key = `attendances/${date}/${folderName}/${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
}

// --- POST Handler: Records Punch In/Out ---
export async function POST(req: Request) {
  try {
    await connectDB();
    const { 
      employeeId, 
      employeeName, 
      punchType, 
      latitude, 
      longitude, 
      imageData,
      branch 
    } = await req.json();

    const today = new Date().toISOString().split("T")[0];
    const now = new Date(); // This creates the actual timestamp for storage

    // 1. Upload the proof of attendance image
    const imageUrl = await uploadToS3(
      imageData, 
      today, 
      employeeName || "unknown", 
      employeeId, 
      punchType
    );

    // 2. Find existing record for today or create new one
    let attendance = await Attendance.findOne({ employeeId, date: today });
    if (!attendance) {
      attendance = new Attendance({ 
        employeeId, 
        date: today,
        employeeName: employeeName // Recommended to store name for logs
      });
    }

    // 3. Update the specific punch details
    if (punchType === "IN") {
      attendance.punchInTime = now;
      attendance.punchInImage = imageUrl;
      attendance.punchInLatitude = latitude;
      attendance.punchInLongitude = longitude;
      attendance.punchInBranch = branch;
    } else {
      attendance.punchOutTime = now;
      attendance.punchOutImage = imageUrl;
      attendance.punchOutLatitude = latitude;
      attendance.punchOutLongitude = longitude;
      attendance.punchOutBranch = branch;
    }

    // 4. Save to MongoDB
    await attendance.save();

    return NextResponse.json({ 
      success: true, 
      record: attendance // Returns the record with punchInTime/punchOutTime to frontend
    });

  } catch (err: any) {
    console.error("Attendance POST Error:", err);
    return NextResponse.json({ error: "Failed to process attendance" }, { status: 500 });
  }
}