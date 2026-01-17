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

    // Check if employee is the owner
    if (project.ownerId === employeeId) {
      return NextResponse.json(
        { error: "Employee is already the project owner" },
        { status: 400 }
      );
    }

    // Add to assigneeIds
    const updatedAssigneeIds = [...(project.assigneeIds || []), employeeId];

    // Add to members as Contributor
    const updatedMembers = [...(project.members || [])];
    const isAlreadyMember = updatedMembers.some(member => member.userId === employeeId);
    
    if (!isAlreadyMember) {
      updatedMembers.push({
        userId: employeeId,
        role: "Contributor" as const,
        addedAt: new Date()
      });
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

    // Check if employee is the owner (can't remove owner)
    if (project.ownerId === employeeId) {
      return NextResponse.json(
        { error: "Cannot remove project owner from assignees" },
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

    // Remove from members (if not owner)
    const updatedMembers = project.members?.filter(member => 
      !(member.userId === employeeId && member.role !== "Admin")
    ) || [];

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
    console.error("Remove assignee error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}