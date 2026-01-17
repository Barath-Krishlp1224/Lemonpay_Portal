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

    console.log(`Starting sprint ${sprintId}`);

    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Sprint ID" },
        { status: 400 }
      );
    }

    // First, check the Sprint model directly
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

      // If sprint found in project but not in Sprint model, create it
      const embeddedSprint = project.sprints[sprintIndex];
      
      // Check if sprint is already active
      if (embeddedSprint.status === "Active") {
        return NextResponse.json(
          { success: false, error: "Sprint is already active" },
          { status: 400 }
        );
      }

      // Check if there's already an active sprint in this project
      const hasActiveSprint = project.sprints.some((s: any) => s.status === "Active");
      if (hasActiveSprint) {
        return NextResponse.json(
          { success: false, error: "There is already an active sprint. Complete it first." },
          { status: 400 }
        );
      }

      // Update tasks
      let updatedTaskCount = 0;
      let totalStoryPoints = 0;
      let completedStoryPoints = 0;
      
      if (project.tasks && Array.isArray(project.tasks)) {
        project.tasks = project.tasks.map((task: any) => {
          if (task.sprintId && task.sprintId.toString() === sprintId) {
            // Count tasks for this sprint
            totalStoryPoints += task.storyPoints || 0;
            
            // Change status from "Backlog" to "To Do"
            if (task.status === "Backlog" || task.status === "Planned") {
              updatedTaskCount++;
              return {
                ...task,
                status: "To Do",
                updatedAt: new Date()
              };
            }
            
            // Count completed points
            if (task.status === "Done") {
              completedStoryPoints += task.storyPoints || 0;
            }
          }
          return task;
        });
      }

      // Update sprint status to Active
      project.sprints[sprintIndex].status = "Active";
      project.sprints[sprintIndex].startDate = new Date();
      project.sprints[sprintIndex].totalPoints = totalStoryPoints;
      project.sprints[sprintIndex].completedPoints = completedStoryPoints;
      project.sprints[sprintIndex].updatedAt = new Date();

      // Save the project
      await project.save();

      // Also update the Task model
      if (updatedTaskCount > 0) {
        await Task.updateMany(
          { sprintId: new mongoose.Types.ObjectId(sprintId), status: { $in: ["Backlog", "Planned"] } },
          { 
            $set: { 
              status: "To Do",
              updatedAt: new Date()
            } 
          }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Sprint started successfully. ${updatedTaskCount} tasks moved from Backlog to To Do.`,
        sprint: project.sprints[sprintIndex],
        updatedTaskCount,
        metrics: {
          totalPoints: totalStoryPoints,
          completedPoints: completedStoryPoints
        }
      }, { status: 200 });
    }

    // If sprint found in Sprint model
    // Check if sprint is already active
    if (sprint.status === "Active") {
      return NextResponse.json(
        { success: false, error: "Sprint is already active" },
        { status: 400 }
      );
    }

    // Check if there's already an active sprint in this project
    const activeSprint = await Sprint.findOne({
      projectId: sprint.projectId,
      status: "Active"
    });
    
    if (activeSprint) {
      return NextResponse.json(
        { success: false, error: "There is already an active sprint. Complete it first." },
        { status: 400 }
      );
    }

    // Update tasks in the Task model
    const updateResult = await Task.updateMany(
      { sprintId: new mongoose.Types.ObjectId(sprintId), status: { $in: ["Backlog", "Planned", "To Do"] } },
      { 
        $set: { 
          status: "To Do",
          updatedAt: new Date()
        } 
      }
    );

    const updatedTaskCount = updateResult.modifiedCount;

    // Calculate current story points
    const tasksInSprint = await Task.find({ sprintId: new mongoose.Types.ObjectId(sprintId) });
    const totalStoryPoints = tasksInSprint.reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0);
    const completedStoryPoints = tasksInSprint
      .filter((task: any) => task.status === "Done")
      .reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0);

    // Update sprint in Sprint model
    sprint.status = "Active";
    sprint.startDate = new Date();
    sprint.totalPoints = totalStoryPoints;
    sprint.completedPoints = completedStoryPoints;
    sprint.updatedAt = new Date();
    await sprint.save();

    // Also update the embedded sprint in Project model
    const project = await Project.findById(sprint.projectId);
    if (project && project.sprints) {
      const sprintIndex = project.sprints.findIndex(
        (s: any) => s._id.toString() === sprintId
      );
      
      if (sprintIndex !== -1) {
        project.sprints[sprintIndex].status = "Active";
        project.sprints[sprintIndex].startDate = new Date();
        project.sprints[sprintIndex].totalPoints = totalStoryPoints;
        project.sprints[sprintIndex].completedPoints = completedStoryPoints;
        project.sprints[sprintIndex].updatedAt = new Date();
        
        // Update project tasks
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks = project.tasks.map((task: any) => {
            if (task.sprintId && task.sprintId.toString() === sprintId) {
              if (task.status === "Backlog" || task.status === "Planned") {
                return {
                  ...task,
                  status: "To Do",
                  updatedAt: new Date()
                };
              }
            }
            return task;
          });
        }
        
        await project.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sprint started successfully. ${updatedTaskCount} tasks moved to To Do.`,
      sprint: sprint,
      updatedTaskCount,
      metrics: {
        totalPoints: totalStoryPoints,
        completedPoints: completedStoryPoints,
        remainingPoints: totalStoryPoints - completedStoryPoints
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error starting sprint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to start sprint",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Add GET endpoint to fetch sprint details
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
        select: 'title description status storyPoints assigneeId epicId taskId'
      })
      .populate({
        path: 'epics',
        select: 'name description status priority'
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

    return NextResponse.json({
      success: true,
      data: sprint
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sprint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch sprint details"
      },
      { status: 500 }
    );
  }
}