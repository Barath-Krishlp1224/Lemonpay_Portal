import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Employee from "@/models/Employee";
import crypto from "crypto";
import { sendResetMail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { empIdOrEmail } = await req.json();

    if (!empIdOrEmail || !empIdOrEmail.trim()) {
      return NextResponse.json(
        { error: "Employee ID or Email is required." },
        { status: 400 }
      );
    }

    const identifier = empIdOrEmail.trim();

    const query = identifier.includes("@")
      ? { mailId: new RegExp(`^${identifier}$`, "i") }
      : { empId: new RegExp(`^${identifier}$`, "i") };

    const employee = await Employee.findOne(query);

    // For security: always return same message
    if (!employee) {
      return NextResponse.json(
        {
          message:
            "If an account exists with this ID or email, a reset link has been sent.",
        },
        { status: 200 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    employee.resetToken = token;
    employee.resetTokenExpiry = expiry;
    await employee.save();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bitbucket.org/lemonpay/lp-unity/src/uat/app/api/forgot-password/route.ts";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendResetMail(employee.mailId, resetUrl);
    } catch (mailErr: any) {
      console.error("Mail send error:", mailErr);
      // If mail fails, you probably DON'T want to say success:
      return NextResponse.json(
        { error: "Failed to send reset email. Contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message:
          "If an account exists with this ID or email, a reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Forgot-password error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
