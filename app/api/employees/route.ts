import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";

export async function GET(request: Request) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const search = url.searchParams.get("search");
    const checkBirthdays = url.searchParams.get("birthdays");
    const department = url.searchParams.get("department");
    const role = url.searchParams.get("role");
    const active = url.searchParams.get("active");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    // Unified field selection for payroll, profile, and task assignment
    const selectFields = "_id empId name displayName department role team category salary accountNumber ifscCode joiningDate mailId dateOfBirth photo active position";

    /* ------------------------------------------------------------------
       1️⃣ Birthday check ( ?birthdays=true )
       ------------------------------------------------------------------ */
    if (checkBirthdays === "true") {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todaySuffix = `-${month}-${day}`;

      const birthdayFolks = await Employee.find(
        { dateOfBirth: { $regex: todaySuffix + "$" } },
        "name displayName photo team"
      ).lean();

      return NextResponse.json({
        success: true,
        birthdays: birthdayFolks,
      });
    }

    /* ------------------------------------------------------------------
       2️⃣ Partial search ( ?search= )
       ------------------------------------------------------------------ */
    if (search) {
      const regex = new RegExp(search, "i");
      const employees = await Employee.find(
        { 
          $or: [
            { name: regex }, 
            { empId: regex },
            { email: regex },
            { displayName: regex }
          ]
        },
        selectFields
      )
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      return NextResponse.json({ 
        success: true, 
        count: employees.length,
        employees 
      });
    }

    /* ------------------------------------------------------------------
       3️⃣ Exact name match ( ?name= )
       ------------------------------------------------------------------ */
    if (name) {
      const employee = await Employee.findOne(
        { name: { $regex: `^${name}$`, $options: "i" } },
        selectFields
      ).lean();

      if (!employee) {
        return NextResponse.json({ 
          success: false, 
          error: "Employee not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        employee 
      });
    }

    /* ------------------------------------------------------------------
       4️⃣ Filtered fetch with department, role, active status, etc.
       ------------------------------------------------------------------ */
    const query: any = {};
    
    if (department) query.department = department;
    if (role) query.role = role;
    if (active !== null) {
      query.active = active === 'true';
    }

    const employees = await Employee.find(query, selectFields)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: employees.length,
      employees,
    });

  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Server Error" 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ 
      $or: [
        { email: body.email },
        { empId: body.empId }
      ]
    });

    if (existingEmployee) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Employee with this email or ID already exists" 
        },
        { status: 409 }
      );
    }

    // Create new employee
    const employee = await Employee.create(body);

    return NextResponse.json({
      success: true,
      message: "Employee created successfully",
      employee
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Server Error" 
    }, { status: 500 });
  }
}