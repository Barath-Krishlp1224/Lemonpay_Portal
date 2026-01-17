import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Find active sprint
    const activeSprint = project.sprints?.find(
      (sprint: any) => sprint.status === "Active"
    ) || null;

    return NextResponse.json({
      success: true,
      activeSprint,
      projectId
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching active sprint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}