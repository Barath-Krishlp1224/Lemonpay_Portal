import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// DELETE permission by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🗑️ DELETE Permission Request API");
  
  try {
    const connection = await connectToDatabase();
    if (!connection?.db) {
      console.error("❌ Database connection failed");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    const { db } = connection;
    
    const { id } = await params;
    console.log("Permission ID to delete:", id);
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      console.error("❌ Invalid ObjectId:", id);
      return NextResponse.json(
        { error: "Invalid permission ID format" },
        { status: 400 }
      );
    }
    
    const objectId = new ObjectId(id);
    
    // Find the permission
    console.log("🔍 Looking for permission to delete:", id);
    const permission = await db.collection("permissions").findOne({
      _id: objectId
    });
    
    if (!permission) {
      console.error("❌ Permission not found for deletion:", id);
      return NextResponse.json(
        { error: "Permission request not found." },
        { status: 404 }
      );
    }
    
    console.log("📋 Permission found:", {
      id: permission._id.toString(),
      employeeId: permission.employeeId,
      permissionType: permission.permissionType,
      status: permission.status
    });
    
    // Only allow deletion of pending requests
    if (permission.status !== "pending") {
      console.error("❌ Cannot delete non-pending permission:", {
        currentStatus: permission.status,
        allowed: "pending only"
      });
      return NextResponse.json(
        { 
          error: "Only pending permission requests can be deleted.",
          currentStatus: permission.status
        },
        { status: 400 }
      );
    }
    
    // Delete the permission
    console.log("🗑️ Deleting permission...");
    const result = await db.collection("permissions").deleteOne({
      _id: objectId
    });
    
    if (result.deletedCount === 0) {
      console.error("❌ Failed to delete permission");
      return NextResponse.json(
        { error: "Failed to delete permission request" },
        { status: 500 }
      );
    }
    
    console.log("✅ Permission deleted successfully:", {
      deletedCount: result.deletedCount
    });
    
    return NextResponse.json(
      { 
        success: true,
        message: "Permission request deleted successfully",
        deletedId: id
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error("💥 Error deleting permission request:", err);
    return NextResponse.json({ 
      error: "Server error",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  } finally {
    console.log("🏁 DELETE Permission Request API completed\n");
  }
}

// GET single permission by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("📋 GET Single Permission API");
  
  try {
    const connection = await connectToDatabase();
    if (!connection?.db) {
      console.error("❌ Database connection failed");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    const { db } = connection;
    
    const { id } = await params;
    console.log("Permission ID to fetch:", id);
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      console.error("❌ Invalid ObjectId:", id);
      return NextResponse.json(
        { error: "Invalid permission ID format" },
        { status: 400 }
      );
    }
    
    const objectId = new ObjectId(id);
    
    // Find the permission
    console.log("🔍 Fetching permission:", id);
    const permission = await db.collection("permissions").findOne({
      _id: objectId
    });
    
    if (!permission) {
      console.error("❌ Permission not found:", id);
      return NextResponse.json(
        { error: "Permission request not found." },
        { status: 404 }
      );
    }
    
    console.log("✅ Permission found:", {
      id: permission._id.toString(),
      employeeId: permission.employeeId,
      permissionType: permission.permissionType,
      status: permission.status
    });
    
    // Convert ObjectId to string for response
    const responsePermission = {
      ...permission,
      _id: permission._id.toString(),
      id: permission._id.toString(),
      // Convert dates to ISO strings
      date: permission.date ? new Date(permission.date).toISOString() : null,
      startDate: permission.startDate ? new Date(permission.startDate).toISOString() : null,
      endDate: permission.endDate ? new Date(permission.endDate).toISOString() : null,
      createdAt: permission.createdAt ? new Date(permission.createdAt).toISOString() : null,
      updatedAt: permission.updatedAt ? new Date(permission.updatedAt).toISOString() : null,
    };
    
    return NextResponse.json(responsePermission, { status: 200 });
    
  } catch (err) {
    console.error("💥 Error fetching permission request:", err);
    return NextResponse.json({ 
      error: "Server error",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  } finally {
    console.log("🏁 GET Single Permission API completed\n");
  }
}