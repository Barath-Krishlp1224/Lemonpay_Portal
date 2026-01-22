import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// DELETE: Remove member from project
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const params = await context.params;
    const { projectId } = params;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "A valid Project ID is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is a member
    const memberIndex = project.members.findIndex((m: any) => m.userId === userId);
    if (memberIndex === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove member
    project.members.splice(memberIndex, 1);

    // Ensure at least one admin remains
    const hasAdmin = project.members.some((m: any) => m.role === 'Admin');
    if (!hasAdmin && project.members.length > 0) {
      project.members[0].role = 'Admin';
    }

    await project.save();
    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}