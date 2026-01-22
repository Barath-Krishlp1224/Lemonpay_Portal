import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId, WithId, Document } from "mongodb";

interface PermissionDocument extends Document {
  _id: ObjectId | string;
  employeeId?: string;
  permissionType?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  [key: string]: any; // Allow additional properties
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔄 UPDATE Permission Status API");
  console.log("===== REQUEST DETAILS =====");
  
  try {
    // Parse the ID first
    const { id } = await params;
    console.log("📌 Permission ID from params:", id);
    console.log("📌 Is ObjectId valid?", ObjectId.isValid(id));
    
    // Connect to database
    console.log("🔗 Connecting to database...");
    const connection = await connectToDatabase();
    if (!connection?.db) {
      console.error("❌ Database connection failed");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    const { db } = connection;
    
    // Parse request body
    const body = await req.json();
    console.log("📦 Request body:", body);
    
    const { status, employeeId, notes } = body;
    
    // Validate inputs
    if (!status) {
      console.error("❌ Status is required");
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }
    
    // Use the correct collection name: "permissionrequests"
    const collectionName = "permissionrequests";
    
    console.log(`✅ Using collection: ${collectionName}`);
    const permissionsCollection = db.collection<PermissionDocument>(collectionName);
    
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
    console.log(`🔍 Searching for permission with _id: ${objectId}`);
    const permission = await permissionsCollection.findOne({
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
      id: permission._id instanceof ObjectId ? permission._id.toString() : String(permission._id),
      employeeId: permission.employeeId || 'N/A',
      permissionType: permission.permissionType || 'N/A',
      currentStatus: permission.status || 'N/A'
    });
    
    // Status validation logic
    const allowedStatuses = ["pending", "approved", "rejected", "auto-approved", "manager-pending"];
    
    if (!allowedStatuses.includes(status)) {
      console.error("❌ Invalid status:", status);
      return NextResponse.json(
        { 
          error: "Invalid status. Allowed values: pending, manager-pending, approved, rejected, auto-approved",
          received: status,
          allowed: allowedStatuses
        },
        { status: 400 }
      );
    }
    
    // Check current status and validate transitions
    const currentStatus = permission.status || 'pending';
    console.log(`📊 Current status: ${currentStatus}, Requested status: ${status}`);
    
    // Define allowed status transitions
    const allowedTransitions: Record<string, string[]> = {
      "pending": ["manager-pending", "rejected"], // TL can approve (to manager-pending) or reject
      "manager-pending": ["approved", "rejected"], // Manager can approve or reject
      "approved": [], // Cannot change approved requests
      "rejected": [], // Cannot change rejected requests
      "auto-approved": [] // Cannot change auto-approved
    };
    
    // Check if transition is allowed
    if (!allowedTransitions[currentStatus]?.includes(status)) {
      console.error("❌ Invalid status transition:", {
        from: currentStatus,
        to: status,
        allowed: allowedTransitions[currentStatus]
      });
      
      let errorMessage = "";
      if (currentStatus === "pending") {
        errorMessage = "For pending requests, you can only approve (sets to manager-pending) or reject.";
      } else if (currentStatus === "manager-pending") {
        errorMessage = "For manager-pending requests, you can only approve or reject.";
      } else {
        errorMessage = `This request is already ${currentStatus.replace('-', ' ')} and cannot be modified.`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          currentStatus: currentStatus,
          requestedStatus: status,
          allowedTransitions: allowedTransitions[currentStatus]
        },
        { status: 400 }
      );
    }
    
    console.log(`✅ Status transition allowed: ${currentStatus} → ${status}`);
    
    // Determine who is making the update
    const updatedBy = employeeId || "unknown-user";
    const updateRole = currentStatus === "pending" ? "team-lead" : "manager";
    
    console.log(`👤 Update by: ${updatedBy} (${updateRole})`);
    
    // Create update data
    const updateData: any = {
      status: status,
      updatedAt: new Date()
    };
    
    // Add specific fields based on who is approving
    if (currentStatus === "pending" && status === "manager-pending") {
      // Team Lead approval
      updateData.teamLeadApproved = true;
      updateData.teamLeadApprovedAt = new Date();
      updateData.teamLeadApprovedBy = updatedBy;
    } else if (currentStatus === "manager-pending" && (status === "approved" || status === "rejected")) {
      // Manager approval
      updateData.managerApproved = status === "approved";
      updateData.managerApprovedAt = new Date();
      updateData.managerApprovedBy = updatedBy;
    }
    
    // Add notes if provided
    if (notes) {
      updateData.notes = `${permission.notes || ''}\n[${updateRole} ${status}]: ${notes}`.trim();
    }
    
    // Prepare the update operation
    const updateOperation: any = {
      $set: updateData
    };
    
    // Add statusHistory update
    const statusHistoryUpdate = {
      status: status,
      updatedAt: new Date(),
      updatedBy: updatedBy,
      role: updateRole,
      notes: notes || `${updateRole} ${status} the request`
    };
    
    updateOperation.$push = {
      statusHistory: statusHistoryUpdate
    };
    
    // Update the permission
    console.log("🔄 Updating permission status...");
    const result = await permissionsCollection.updateOne(
      { _id: objectId },
      updateOperation
    );
    
    if (result.modifiedCount === 0) {
      console.error("❌ Failed to update permission - no documents modified");
      console.log("Update operation:", JSON.stringify(updateOperation, null, 2));
      
      return NextResponse.json(
        { 
          error: "Failed to update permission status - no documents were modified",
          filterUsed: { _id: objectId.toString() },
          updateOperation: updateOperation
        },
        { status: 500 }
      );
    }
    
    console.log("✅ Permission updated successfully:", {
      modifiedCount: result.modifiedCount,
      oldStatus: currentStatus,
      newStatus: status,
      matchedCount: result.matchedCount,
      role: updateRole
    });
    
    // Fetch the updated document
    const updatedPermission = await permissionsCollection.findOne({
      _id: objectId
    });
    
    if (!updatedPermission) {
      console.error("❌ Could not fetch updated permission after update");
      return NextResponse.json(
        { 
          success: true,
          message: "Permission status updated but could not fetch updated document",
          permissionId: objectId.toString(),
          newStatus: status
        },
        { status: 200 }
      );
    }
    
    // Helper function to safely convert values to strings
    const safeToString = (value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (value instanceof ObjectId) {
        return value.toString();
      }
      if (typeof value === 'object' && value !== null && 'toString' in value) {
        return (value as any).toString();
      }
      return String(value);
    };
    
    // Helper function to safely convert dates
    const safeDateToString = (date: any): string | null => {
      if (!date) return null;
      try {
        return new Date(date).toISOString();
      } catch {
        return null;
      }
    };
    
    // Convert ObjectId to string for response
    const responsePermission = {
      ...updatedPermission,
      _id: safeToString(updatedPermission._id),
      id: safeToString(updatedPermission._id),
      // Ensure all dates are strings
      createdAt: safeDateToString(updatedPermission.createdAt),
      updatedAt: safeDateToString(updatedPermission.updatedAt),
      teamLeadApprovedAt: safeDateToString(updatedPermission.teamLeadApprovedAt),
      managerApprovedAt: safeDateToString(updatedPermission.managerApprovedAt),
      date: safeDateToString(updatedPermission.date),
      startDate: safeDateToString(updatedPermission.startDate),
      endDate: safeDateToString(updatedPermission.endDate)
    };
    
    // Trigger event for dashboard refresh (frontend will listen for this)
    console.log("📢 Dispatching request-updated event for dashboard refresh");
    
    return NextResponse.json(
      { 
        success: true,
        message: `Permission ${status} successfully by ${updateRole}`,
        data: responsePermission,
        role: updateRole,
        previousStatus: currentStatus,
        newStatus: status
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error("💥 Error updating permission status:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json({ 
      error: "Server error",
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  } finally {
    console.log("🏁 UPDATE Permission Status API completed\n");
  }
}