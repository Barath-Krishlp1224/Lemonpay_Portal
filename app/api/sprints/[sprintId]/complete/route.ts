import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Sprint from "@/models/Sprint";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    const { sprintId } = await context.params;

    console.log(`Completing sprint ${sprintId}`);

    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Sprint ID" },
        { status: 400 }
      );
    }

    // Try to find sprint in Sprint model first
    const sprint = await Sprint.findById(sprintId);
    
    if (!sprint) {
      // Fallback: Check the project embedded sprint
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: "Sprint not found" },
          { status: 404 }
        );
      }

      // Find the sprint in the project
      const sprintIndex = project.sprints.findIndex(
        (s: any) => s._id.toString() === sprintId
      );

      if (sprintIndex === -1) {
        return NextResponse.json(
          { success: false, error: "Sprint not found" },
          { status: 404 }
        );
      }

      const embeddedSprint = project.sprints[sprintIndex];

      // Check if sprint is already completed
      if (embeddedSprint.status === "Completed") {
        return NextResponse.json(
          { success: false, error: "Sprint is already completed" },
          { status: 400 }
        );
      }

      // Check if sprint is active
      if (embeddedSprint.status !== "Active") {
        return NextResponse.json(
          { success: false, error: "Only active sprints can be completed" },
          { status: 400 }
        );
      }

      // Calculate sprint completion metrics from Project tasks
      let completedTasks = 0;
      let totalTasks = 0;
      let completedStoryPoints = 0;
      let totalStoryPoints = 0;
      
      if (project.tasks && Array.isArray(project.tasks)) {
        const sprintTasks = project.tasks.filter(
          (task: any) => task.sprintId && task.sprintId.toString() === sprintId
        );
        
        totalTasks = sprintTasks.length;
        completedTasks = sprintTasks.filter((task: any) => task.status === "Done").length;
        
        // Calculate story points
        sprintTasks.forEach((task: any) => {
          const points = task.storyPoints || 0;
          totalStoryPoints += points;
          if (task.status === "Done") {
            completedStoryPoints += points;
          }
        });
      }

      // Update sprint in Project model
      project.sprints[sprintIndex].status = "Completed";
      project.sprints[sprintIndex].completedTasks = completedTasks;
      project.sprints[sprintIndex].totalTasks = totalTasks;
      project.sprints[sprintIndex].completedPoints = completedStoryPoints;
      project.sprints[sprintIndex].totalPoints = totalStoryPoints;
      project.sprints[sprintIndex].endDate = new Date();
      project.sprints[sprintIndex].updatedAt = new Date();

      // Move any remaining non-completed tasks back to backlog
      if (project.tasks && Array.isArray(project.tasks)) {
        project.tasks = project.tasks.map((task: any) => {
          if (task.sprintId && task.sprintId.toString() === sprintId && task.status !== "Done") {
            return {
              ...task,
              status: "Backlog",
              sprintId: null,
              updatedAt: new Date()
            };
          }
          return task;
        });
      }

      // Save the project
      await project.save();

      // Update Task model as well
      await Task.updateMany(
        { 
          sprintId: new mongoose.Types.ObjectId(sprintId), 
          status: { $ne: "Done" }
        },
        { 
          $set: { 
            status: "Backlog",
            sprintId: null,
            updatedAt: new Date()
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: `Sprint completed successfully. ${completedTasks}/${totalTasks} tasks completed.`,
        sprint: project.sprints[sprintIndex],
        metrics: {
          totalTasks,
          completedTasks,
          totalPoints: totalStoryPoints,
          completedPoints: completedStoryPoints,
          completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          pointsCompletionPercentage: totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0
        }
      }, { status: 200 });
    }

    // If sprint found in Sprint model
    // Check if sprint is already completed
    if (sprint.status === "Completed") {
      return NextResponse.json(
        { success: false, error: "Sprint is already completed" },
        { status: 400 }
      );
    }

    // Check if sprint is active
    if (sprint.status !== "Active") {
      return NextResponse.json(
        { success: false, error: "Only active sprints can be completed" },
        { status: 400 }
      );
    }

    // Get tasks for this sprint from Task model
    const sprintTasks = await Task.find({ sprintId: new mongoose.Types.ObjectId(sprintId) });
    
    const totalTasks = sprintTasks.length;
    const completedTasks = sprintTasks.filter((task: any) => task.status === "Done").length;
    
    // Calculate story points
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    
    sprintTasks.forEach((task: any) => {
      const points = task.storyPoints || 0;
      totalStoryPoints += points;
      if (task.status === "Done") {
        completedStoryPoints += points;
      }
    });

    // Update sprint in Sprint model
    sprint.status = "Completed";
    sprint.completedTasks = completedTasks;
    sprint.totalTasks = totalTasks;
    sprint.completedPoints = completedStoryPoints;
    sprint.totalPoints = totalStoryPoints;
    sprint.endDate = new Date();
    sprint.updatedAt = new Date();
    await sprint.save();

    // Move any remaining non-completed tasks back to backlog in Task model
    await Task.updateMany(
      { 
        sprintId: new mongoose.Types.ObjectId(sprintId), 
        status: { $ne: "Done" }
      },
      { 
        $set: { 
          status: "Backlog",
          sprintId: null,
          updatedAt: new Date()
        } 
      }
    );

    // Also update the embedded sprint in Project model
    const project = await Project.findById(sprint.projectId);
    if (project && project.sprints) {
      const sprintIndex = project.sprints.findIndex(
        (s: any) => s._id.toString() === sprintId
      );
      
      if (sprintIndex !== -1) {
        project.sprints[sprintIndex].status = "Completed";
        project.sprints[sprintIndex].completedTasks = completedTasks;
        project.sprints[sprintIndex].totalTasks = totalTasks;
        project.sprints[sprintIndex].completedPoints = completedStoryPoints;
        project.sprints[sprintIndex].totalPoints = totalStoryPoints;
        project.sprints[sprintIndex].endDate = new Date();
        project.sprints[sprintIndex].updatedAt = new Date();
        
        // Update project tasks
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks = project.tasks.map((task: any) => {
            if (task.sprintId && task.sprintId.toString() === sprintId && task.status !== "Done") {
              return {
                ...task,
                status: "Backlog",
                sprintId: null,
                updatedAt: new Date()
              };
            }
            return task;
          });
        }
        
        await project.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sprint completed successfully. ${completedTasks}/${totalTasks} tasks completed.`,
      sprint: sprint,
      metrics: {
        totalTasks,
        completedTasks,
        totalPoints: totalStoryPoints,
        completedPoints: completedStoryPoints,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        pointsCompletionPercentage: totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0,
        remainingTasks: totalTasks - completedTasks
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error completing sprint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to complete sprint",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to check sprint completion status
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    const { sprintId } = await context.params;

    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Sprint ID" },
        { status: 400 }
      );
    }

    // Try to find sprint in Sprint model first
    let sprint = await Sprint.findById(sprintId)
      .populate({
        path: 'tasks',
        select: 'title status storyPoints assigneeId'
      });

    // If not found in Sprint model, check Project model
    if (!sprint) {
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: "Sprint not found" },
          { status: 404 }
        );
      }

      // Find the sprint in the project
      const foundSprint = project.sprints.find(
        (s: any) => s._id.toString() === sprintId
      );

      if (!foundSprint) {
        return NextResponse.json(
          { success: false, error: "Sprint not found" },
          { status: 404 }
        );
      }

      sprint = foundSprint;
    }

    // Calculate completion metrics
    const completionData = {
      canComplete: sprint.status === "Active",
      currentStatus: sprint.status,
      totalTasks: sprint.totalTasks || 0,
      completedTasks: sprint.completedTasks || 0,
      totalPoints: sprint.totalPoints || 0,
      completedPoints: sprint.completedPoints || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        sprint,
        completionData
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sprint completion data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch sprint completion data"
      },
      { status: 500 }
    );
  }
}