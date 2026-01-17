import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Epic from "@/models/Epic";
import mongoose from "mongoose";

// Define params type - use projectId instead of id
type Params = Promise<{ projectId: string }>;

// GET: Fetch project metrics
export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    await connectDB();
    const { projectId } = await params; // Changed from id to projectId

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    // Get project
    const project = await Project.findById(projectId); // Changed from id to projectId
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get epic metrics
    const epics = await Epic.find({ projectId: projectId }); // Changed from id to projectId
    
    const totalEpics = epics.length;
    const completedEpics = epics.filter(epic => epic.status === "Done").length;
    
    const epicsByPriority = {
      low: epics.filter(epic => epic.priority === "Low").length,
      medium: epics.filter(epic => epic.priority === "Medium").length,
      high: epics.filter(epic => epic.priority === "High").length,
      critical: epics.filter(epic => epic.priority === "Critical").length
    };

    const epicsByStatus = {
      todo: epics.filter(epic => epic.status === "Todo").length,
      inProgress: epics.filter(epic => epic.status === "In Progress").length,
      review: epics.filter(epic => epic.status === "Review").length,
      done: epics.filter(epic => epic.status === "Done").length
    };

    // In a real app, you would fetch tasks here
    // For now, we'll use the task counts from project model
    const tasksByStatus = {
      todo: Math.floor(project.totalTasks * 0.4), // Example distribution
      inProgress: Math.floor(project.totalTasks * 0.3),
      review: Math.floor(project.totalTasks * 0.2),
      done: project.completedTasks
    };

    const metrics = {
      projectId: projectId, // Changed from id to projectId
      projectName: project.name,
      projectKey: project.key,
      
      // Epics
      totalEpics,
      completedEpics,
      epicsByPriority,
      epicsByStatus,
      
      // Tasks (example data)
      totalTasks: project.totalTasks,
      completedTasks: project.completedTasks,
      tasksByStatus,
      
      // Completion percentages
      epicCompletionPercentage: totalEpics > 0 ? Math.round((completedEpics / totalEpics) * 100) : 0,
      taskCompletionPercentage: project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0,
      
      // Timeline
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    return NextResponse.json(metrics, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching project metrics:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}