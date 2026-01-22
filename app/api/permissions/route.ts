import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import PermissionRequest, { 
  PermissionType, 
  PermissionStatus,
  DurationOption 
} from "@/models/PermissionRequest";
import Employee from "@/models/Employee";

// Configuration
const PERMISSION_HOURS_LIMIT_PER_MONTH = 8;
const WFH_DAYS_LIMIT_PER_MONTH = 4;
const FIRST_HALF_HOURS = 4; // 9 AM - 1 PM
const SECOND_HALF_HOURS = 4; // 1 PM - 5 PM

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      empIdOrEmail,
      permissionType,
      forgotType,
      durationOption,
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      time,
      days,
      hours,
      minutes,
      duration,
      reason,
      forgotReason,
      description,
    }: {
      empIdOrEmail: string;
      permissionType: PermissionType;
      forgotType?: "in" | "out";
      durationOption?: DurationOption;
      date?: string;
      startDate?: string;
      endDate?: string;
      startTime?: string;
      endTime?: string;
      time?: string;
      days?: number | string;
      hours?: string;
      minutes?: string;
      duration?: string;
      reason?: string;
      forgotReason?: string;
      description?: string;
    } = body;

    // Validate required fields
    if (!empIdOrEmail || !permissionType) {
      return NextResponse.json(
        { error: "empIdOrEmail and permissionType are required" },
        { status: 400 }
      );
    }

    // Find employee
    const identifier = empIdOrEmail.trim();
    const empQuery = identifier.includes("@")
      ? { mailId: new RegExp(`^${identifier}$`, "i") }
      : { empId: new RegExp(`^${identifier}$`, "i") };

    const employee = await Employee.findOne(empQuery);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found with given Employee ID or Email." },
        { status: 404 }
      );
    }

    const finalEmployeeName = employee.name || "Unknown";
    const finalEmployeeId = employee.empId || employee._id.toString();
    const isAccountsTeam = employee.team === "Accounts";

    // Validation based on permission type
    let validationError = validatePermissionRequest(permissionType, {
      date,
      startDate,
      endDate,
      startTime,
      endTime,
      time,
      days,
      hours,
      minutes,
      duration,
      durationOption,
      forgotType,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Calculate final duration based on option
    const finalDuration = calculateFinalDuration(durationOption, hours, minutes, duration);

    // Check limits based on permission type
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    if (permissionType === "permission" || permissionType === "on-duty") {
      // Check monthly hours limit for permissions and on-duty
      const usedHours = await calculateMonthlyUsedHours(
        finalEmployeeId,
        permissionType,
        currentMonthStart,
        nextMonthStart
      );

      const requestedHours = parseFloat(finalDuration) || 0;
      const totalAfterRequest = usedHours + requestedHours;

      if (totalAfterRequest > PERMISSION_HOURS_LIMIT_PER_MONTH) {
        const remainingHours = PERMISSION_HOURS_LIMIT_PER_MONTH - usedHours;
        return NextResponse.json(
          {
            error: `Monthly ${permissionType} limit exceeded. You have ${remainingHours.toFixed(1)} hour(s) remaining this month (Limit: ${PERMISSION_HOURS_LIMIT_PER_MONTH} hours).`,
          },
          { status: 400 }
        );
      }
    }

    if (permissionType === "wfh") {
      // Check monthly WFH days limit
      const usedWFHDays = await calculateMonthlyWFHDays(
        finalEmployeeId,
        currentMonthStart,
        nextMonthStart
      );

      const requestedDays = parseFloat(days as string) || 0;
      const totalAfterRequest = usedWFHDays + requestedDays;

      if (totalAfterRequest > WFH_DAYS_LIMIT_PER_MONTH) {
        const remainingDays = WFH_DAYS_LIMIT_PER_MONTH - usedWFHDays;
        return NextResponse.json(
          {
            error: `Monthly WFH limit exceeded. You have ${remainingDays} day(s) remaining this month (Limit: ${WFH_DAYS_LIMIT_PER_MONTH} days).`,
          },
          { status: 400 }
        );
      }
    }

    // Determine initial status
    let status: PermissionStatus = isAccountsTeam ? "manager-pending" : "pending";
    let teamLeadApproved = isAccountsTeam;

    // Auto-approve for short durations (2 hours or less)
    if ((permissionType === "permission" || permissionType === "on-duty") && parseFloat(finalDuration) <= 2) {
      status = "auto-approved";
      teamLeadApproved = true;
    }

    if (permissionType === "forgot-check") {
      status = "pending";
      teamLeadApproved = false;
    }

    // Create permission request
    const permissionData: any = {
      employeeName: finalEmployeeName,
      employeeId: finalEmployeeId,
      permissionType,
      status,
      teamLeadApproved,
      managerApproved: false,
      durationOption,
    };

    // Add type-specific fields
    if (permissionType === "permission") {
      permissionData.date = new Date(date!);
      permissionData.startTime = startTime;
      permissionData.endTime = endTime;
      permissionData.hours = hours;
      permissionData.minutes = minutes;
      permissionData.duration = finalDuration;
      permissionData.reason = description || reason;
      permissionData.description = description;
    } else if (permissionType === "wfh") {
      permissionData.startDate = new Date(startDate!);
      permissionData.endDate = new Date(endDate!);
      permissionData.days = parseFloat(days as string);
      permissionData.reason = description || reason;
      permissionData.description = description;
    } else if (permissionType === "on-duty") {
      permissionData.date = new Date(date!);
      permissionData.time = time || startTime;
      permissionData.hours = hours;
      permissionData.minutes = minutes;
      permissionData.duration = finalDuration;
      permissionData.reason = description || reason;
      permissionData.description = description;
    } else if (permissionType === "forgot-check") {
      permissionData.date = new Date(date!);
      permissionData.time = time;
      permissionData.forgotType = forgotType;
      permissionData.forgotReason = forgotReason || description;
      permissionData.reason = description || reason;
      permissionData.description = description;
    }

    const permission = await PermissionRequest.create(permissionData);

    return NextResponse.json(
      {
        permission,
        message: `${permissionType} request submitted successfully`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating permission request:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const empIdOrEmail = searchParams.get("empIdOrEmail");
    const mode = searchParams.get("mode");
    const permissionType = searchParams.get("permissionType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    let employee = null;
    let finalEmployeeId: string | undefined;

    // Find employee if empIdOrEmail provided
    if (empIdOrEmail) {
      const identifier = empIdOrEmail.trim();
      const query = identifier.includes("@")
        ? { mailId: new RegExp(`^${identifier}$`, "i") }
        : { empId: new RegExp(`^${identifier}$`, "i") };

      employee = await Employee.findOne(query);

      if (employee) {
        finalEmployeeId = employee.empId || employee._id.toString();
      }
    }

    // Get summary for specific employee (when mode is not "list")
    if (empIdOrEmail && mode !== "list") {
      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found." },
          { status: 404 }
        );
      }

      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

      // Calculate monthly usage
      const [usedPermissionHours, usedOnDutyHours, usedWFHDays] = await Promise.all([
        calculateMonthlyUsedHours(finalEmployeeId!, "permission", currentMonthStart, nextMonthStart),
        calculateMonthlyUsedHours(finalEmployeeId!, "on-duty", currentMonthStart, nextMonthStart),
        calculateMonthlyWFHDays(finalEmployeeId!, currentMonthStart, nextMonthStart),
      ]);

      // Get pending counts
      const [pendingPermissions, pendingWFH, pendingOnDuty, pendingForgotCheck] = await Promise.all([
        PermissionRequest.find({
          employeeId: finalEmployeeId,
          permissionType: "permission",
          status: "pending",
        }),
        PermissionRequest.find({
          employeeId: finalEmployeeId,
          permissionType: "wfh",
          status: "pending",
        }),
        PermissionRequest.find({
          employeeId: finalEmployeeId,
          permissionType: "on-duty",
          status: "pending",
        }),
        PermissionRequest.find({
          employeeId: finalEmployeeId,
          permissionType: "forgot-check",
          status: "pending",
        }),
      ]);

      return NextResponse.json(
        {
          summary: {
            permission: {
              usedHours: usedPermissionHours,
              remainingHours: PERMISSION_HOURS_LIMIT_PER_MONTH - usedPermissionHours,
              limit: PERMISSION_HOURS_LIMIT_PER_MONTH,
              pendingRequests: pendingPermissions.length,
            },
            onDuty: {
              usedHours: usedOnDutyHours,
              remainingHours: PERMISSION_HOURS_LIMIT_PER_MONTH - usedOnDutyHours,
              limit: PERMISSION_HOURS_LIMIT_PER_MONTH,
              pendingRequests: pendingOnDuty.length,
            },
            wfh: {
              usedDays: usedWFHDays,
              remainingDays: WFH_DAYS_LIMIT_PER_MONTH - usedWFHDays,
              limit: WFH_DAYS_LIMIT_PER_MONTH,
              pendingRequests: pendingWFH.length,
            },
            forgotCheck: {
              pendingRequests: pendingForgotCheck.length,
            },
          },
        },
        { status: 200 }
      );
    }

    // Get list of permissions for employee
    if (empIdOrEmail && mode === "list") {
      if (!employee) {
        return NextResponse.json([], { status: 200 });
      }

      const query: any = { employeeId: finalEmployeeId };
      
      // Apply filters
      if (permissionType) query.permissionType = permissionType;
      if (status) query.status = status;
      if (startDate) {
        query.$or = [
          { date: { $gte: new Date(startDate) } },
          { startDate: { $gte: new Date(startDate) } },
          { createdAt: { $gte: new Date(startDate) } }
        ];
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        if (query.$or) {
          query.$or = query.$or.map((condition: any) => {
            const key = Object.keys(condition)[0];
            return { [key]: { ...condition[key], $lte: endDateObj } };
          });
        }
      }

      const permissions = await PermissionRequest.find(query).sort({ createdAt: -1 });

      return NextResponse.json(permissions, { status: 200 });
    }

    // Admin/Manager view - all permissions with filters
    const employeeId = searchParams.get("employeeId");
    const employeeName = searchParams.get("employeeName");
    const teamLeadApproved = searchParams.get("teamLeadApproved");
    const managerApproved = searchParams.get("managerApproved");

    const query: any = {};
    if (permissionType) query.permissionType = permissionType;
    if (status) query.status = status;
    if (employeeId) query.employeeId = new RegExp(`^${employeeId}$`, "i");
    if (employeeName) query.employeeName = new RegExp(`^${employeeName}$`, "i");
    if (teamLeadApproved === "true") query.teamLeadApproved = true;
    if (teamLeadApproved === "false") query.teamLeadApproved = false;
    if (managerApproved === "true") query.managerApproved = true;
    if (managerApproved === "false") query.managerApproved = false;

    const permissions = await PermissionRequest.find(query).sort({ createdAt: -1 });

    return NextResponse.json(permissions, { status: 200 });
  } catch (err) {
    console.error("Error fetching permission requests:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Helper functions
function validatePermissionRequest(permissionType: PermissionType, data: any): string | null {
  switch (permissionType) {
    case "permission":
      if (!data.date) {
        return "Date is required for permission";
      }
      if (data.durationOption === "hours" && (!data.hours || parseFloat(data.hours) <= 0)) {
        return "Valid hours are required for hours entry";
      }
      if (data.durationOption === "minutes" && (!data.minutes || parseFloat(data.minutes) <= 0)) {
        return "Valid minutes are required for minutes entry";
      }
      break;
    case "wfh":
      if (!data.startDate || !data.endDate || !data.days) {
        return "Start date, end date, and days are required for WFH";
      }
      break;
    case "on-duty":
      if (!data.date) {
        return "Date is required for on-duty";
      }
      if (data.durationOption === "hours" && (!data.hours || parseFloat(data.hours) <= 0)) {
        return "Valid hours are required for hours entry";
      }
      if (data.durationOption === "minutes" && (!data.minutes || parseFloat(data.minutes) <= 0)) {
        return "Valid minutes are required for minutes entry";
      }
      break;
    case "forgot-check":
      if (!data.date || !data.time || !data.forgotType) {
        return "Date, time, and forgot type are required for forgot check";
      }
      break;
  }
  return null;
}

function calculateFinalDuration(
  durationOption?: DurationOption,
  hours?: string,
  minutes?: string,
  duration?: string
): string {
  if (duration) return duration; // Use provided duration if available

  switch (durationOption) {
    case "hours":
      return (parseFloat(hours || "0") || 0).toFixed(1);
    case "first-half":
      return FIRST_HALF_HOURS.toFixed(1);
    case "second-half":
      return SECOND_HALF_HOURS.toFixed(1);
    case "minutes":
      const mins = parseFloat(minutes || "0") || 0;
      return (mins / 60).toFixed(1);
    default:
      // Default to 1 hour if no option specified
      return "1.0";
  }
}

async function calculateMonthlyUsedHours(
  employeeId: string,
  permissionType: "permission" | "on-duty",
  monthStart: Date,
  monthEnd: Date
): Promise<number> {
  const permissions = await PermissionRequest.find({
    employeeId,
    permissionType,
    status: { $in: ["approved", "auto-approved"] },
    $or: [
      { date: { $gte: monthStart, $lt: monthEnd } },
      { createdAt: { $gte: monthStart, $lt: monthEnd } }
    ],
  });

  return permissions.reduce((total, perm) => {
    const hours = parseFloat(perm.duration || "0");
    return total + (isNaN(hours) ? 0 : hours);
  }, 0);
}

async function calculateMonthlyWFHDays(
  employeeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<number> {
  const wfhRequests = await PermissionRequest.find({
    employeeId,
    permissionType: "wfh",
    status: { $in: ["approved", "auto-approved"] },
    $or: [
      { startDate: { $gte: monthStart, $lt: monthEnd } },
      { createdAt: { $gte: monthStart, $lt: monthEnd } }
    ],
  });

  return wfhRequests.reduce((total, wfh) => {
    const days = wfh.days || 0;
    return total + days;
  }, 0);
}