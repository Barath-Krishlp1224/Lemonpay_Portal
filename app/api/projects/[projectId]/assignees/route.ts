import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// Define the shape of params as a Promise for Next.js 15
type RouteParams = Promise<{ projectId: string }>;

// Add assignee to project
export async function POST(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params to get the projectId
    const { projectId } = await params;
    
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if employee is already an assignee
    if (project.assigneeIds?.includes(employeeId)) {
      return NextResponse.json(
        { error: "Employee is already assigned to this project" },
        { status: 400 }
      );
    }

    // Check if employee is already a member with Admin role
    const existingAdmin = project.members?.find(member => 
      member.userId === employeeId && member.role === "Admin"
    );
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Employee is already an Admin member of this project" },
        { status: 400 }
      );
    }

    // Add to assigneeIds
    const updatedAssigneeIds = [...(project.assigneeIds || []), employeeId];

    // Add to members as Contributor (if not already a member)
    const updatedMembers = [...(project.members || [])];
    const existingMemberIndex = updatedMembers.findIndex(member => member.userId === employeeId);
    
    if (existingMemberIndex === -1) {
      // Not a member yet, add as Contributor
      updatedMembers.push({
        userId: employeeId,
        role: "Contributor" as const,
        addedAt: new Date()
      });
    } else {
      // Already a member, ensure role is at least Contributor
      if (updatedMembers[existingMemberIndex].role === "Viewer") {
        updatedMembers[existingMemberIndex].role = "Contributor";
      }
      updatedMembers[existingMemberIndex].addedAt = new Date();
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        assigneeIds: updatedAssigneeIds,
        members: updatedMembers,
        $currentDate: { updatedAt: true }
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: any) {
    console.error("Add assignee error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Remove assignee from project
export async function DELETE(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params to get the projectId
    const { projectId } = await params;
    
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if employee is an Admin (can't remove Admins through this endpoint)
    const isAdmin = project.members?.some(member => 
      member.userId === employeeId && member.role === "Admin"
    );
    if (isAdmin) {
      return NextResponse.json(
        { error: "Cannot remove Admin members from assignees. Remove them as members first." },
        { status: 400 }
      );
    }

    // Check if employee is actually an assignee
    if (!project.assigneeIds?.includes(employeeId)) {
      return NextResponse.json(
        { error: "Employee is not assigned to this project" },
        { status: 400 }
      );
    }

    // Remove from assigneeIds
    const updatedAssigneeIds = project.assigneeIds?.filter(aId => aId !== employeeId) || [];

    // Remove from members if they are only a Contributor or Viewer
    const updatedMembers = project.members?.filter(member => {
      if (member.userId === employeeId) {
        // Keep if they have any tasks assigned or if they're an Admin
        const hasAssignedTasks = project.tasks?.some(task => task.assigneeId === employeeId);
        return member.role === "Admin" || hasAssignedTasks;
      }
      return true;
    }) || [];

    // Also update tasks to remove this assignee - use plain JavaScript object spread
    const updatedTasks = project.tasks?.map(task => {
      // Create a plain object copy of the task
      const taskObj = task instanceof mongoose.Document ? task.toObject() : task;
      
      if (taskObj.assigneeId === employeeId) {
        return {
          ...taskObj,
          assigneeId: null,
          assigneeNames: taskObj.assigneeNames?.filter((name: string) => 
            !name.toLowerCase().includes(employeeId.toLowerCase())
          ) || []
        };
      }
      return taskObj;
    }) || [];

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        assigneeIds: updatedAssigneeIds,
        members: updatedMembers,
        tasks: updatedTasks,
        $currentDate: { updatedAt: true }
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: any) {
    console.error("Remove assignee error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}