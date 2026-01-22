import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// Define member interface
interface ProjectMember {
  userId: any;
  role: "Admin" | "Contributor" | "Viewer";
  addedAt: Date;
}

// GET: Fetch a single project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    
    // Await params before using
    const { projectId } = await params;
    const id = projectId;
    
    console.log("GET request for project ID:", id); // Debug log
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid ID in GET:", id);
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }
    
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    console.error("GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit and Save changes - FIXED VERSION
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    
    // Await params before using
    const { projectId } = await params;
    const id = projectId;
    
    const body = await request.json();

    console.log("PUT request for project ID:", id); // Debug log
    console.log("PUT request body:", body); // Debug log

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid ID in PUT:", id);
      return NextResponse.json({ error: "A valid Project ID is required" }, { status: 400 });
    }

    // Check if project exists
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Remove _id, updatedAt, createdAt, and __v from updateData if they exist
    const { _id, updatedAt, createdAt, __v, ...updateData } = body;

    // Check for Duplicate Name during update
    if (updateData.name && updateData.name.trim() !== existingProject.name) {
      const duplicateName = await Project.findOne({
        name: { $regex: new RegExp(`^${updateData.name.trim()}$`, "i") },
        _id: { $ne: id }
      });
      if (duplicateName) {
        return NextResponse.json(
          { error: `Another project already uses the name "${updateData.name.trim()}".` },
          { status: 400 }
        );
      }
    }

    // If updating key, validate and check for uniqueness
    if (updateData.key && updateData.key.toUpperCase().trim() !== existingProject.key) {
      const normalizedKey = updateData.key.toUpperCase().trim();
      
      if (!/^[A-Z0-9]+$/.test(normalizedKey)) {
        return NextResponse.json(
          { error: "Project key can only contain uppercase letters and numbers" },
          { status: 400 }
        );
      }

      if (normalizedKey.length < 2 || normalizedKey.length > 10) {
        return NextResponse.json(
          { error: "Project key must be between 2 and 10 characters" },
          { status: 400 }
        );
      }

      const existingKey = await Project.findOne({ 
        key: normalizedKey, 
        _id: { $ne: id }
      });
      
      if (existingKey) {
        return NextResponse.json(
          { error: `Project key "${normalizedKey}" is already in use.` },
          { status: 400 }
        );
      }
      
      updateData.key = normalizedKey;
    }

    // Handle assigneeIds update - update members array accordingly
    if (updateData.assigneeIds && Array.isArray(updateData.assigneeIds)) {
      // Get existing admin members to preserve them
      const existingAdmins = existingProject.members.filter((member: ProjectMember) => 
        member.role === "Admin"
      );
      
      // Create updated members array
      const updatedMembers: ProjectMember[] = [];
      
      // First, preserve existing Admins
      existingAdmins.forEach((admin: ProjectMember) => {
        // Only keep admin if they're still in assigneeIds or if they're a member
        if (updateData.assigneeIds.includes(admin.userId) || 
            existingProject.members.some((m: ProjectMember) => m.userId === admin.userId)) {
          updatedMembers.push({
            userId: admin.userId,
            role: "Admin",
            addedAt: admin.addedAt || new Date()
          });
        }
      });
      
      // Add assignees as Contributors (if not already an Admin)
      for (const assigneeId of updateData.assigneeIds) {
        const isAlreadyAdmin = updatedMembers.some(member => 
          member.userId === assigneeId && member.role === "Admin"
        );
        const isExistingMember = existingProject.members.some((member: ProjectMember) => 
          member.userId === assigneeId
        );
        
        if (!isAlreadyAdmin) {
          // Check if this user is already a member with a role
          const existingMember = existingProject.members.find((member: ProjectMember) => 
            member.userId === assigneeId
          );
          
          if (existingMember) {
            // Keep existing role unless it's Viewer (upgrade to Contributor)
            updatedMembers.push({
              userId: assigneeId,
              role: existingMember.role === "Viewer" ? "Contributor" : existingMember.role,
              addedAt: existingMember.addedAt || new Date()
            });
          } else {
            // New member, add as Contributor
            updatedMembers.push({
              userId: assigneeId,
              role: "Contributor",
              addedAt: new Date()
            });
          }
        }
      }
      
      // Ensure at least one Admin remains
      const hasAdmin = updatedMembers.some(member => member.role === "Admin");
      if (!hasAdmin && updatedMembers.length > 0) {
        updatedMembers[0].role = "Admin";
      }
      
      updateData.members = updatedMembers;
    }

    // Update project - remove $currentDate since schema has timestamps: true
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    console.log("PUT successful, updated project:", updatedProject); // Debug log
    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: any) {
    console.error("Project update error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

// DELETE: Remove a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    
    // Await params before using
    const { projectId } = await params;
    const id = projectId;

    console.log("DELETE request for project ID:", id); // Debug log

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid ID in DELETE:", id);
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }

    console.log("DELETE successful, deleted ID:", id); // Debug log
    return NextResponse.json({ 
      message: "Project deleted successfully",
      deletedId: id 
    }, { status: 200 });
  } catch (error: any) {
    console.error("Project deletion error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}