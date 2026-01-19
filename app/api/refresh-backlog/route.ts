import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import Sprint from '@/models/Sprint';
import Project from '@/models/Project';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Project ID format'
        },
        { status: 400 }
      );
    }

    console.log(`Refreshing backlog for project: ${projectId}`);

    // Get all active and completed sprints for this project
    const activeSprints = await Sprint.find({ 
      projectId, 
      status: 'Active' 
    }).select('_id name');

    // Get all completed sprints
    const completedSprints = await Sprint.find({ 
      projectId, 
      status: 'Completed' 
    }).select('_id name');

    // Get all planned sprints
    const plannedSprints = await Sprint.find({ 
      projectId, 
      status: 'Planned' 
    }).select('_id name');

    // Find tasks that are assigned to completed sprints but not marked as Done
    const completedSprintIds = completedSprints.map(sprint => sprint._id);
    let movedTasksCount = 0;
    
    if (completedSprintIds.length > 0) {
      const updateResult = await Task.updateMany(
        { 
          sprintId: { $in: completedSprintIds },
          status: { $ne: 'Done' } // Not done tasks
        },
        { 
          $set: { 
            sprintId: null,
            status: 'Backlog'
          } 
        }
      );
      movedTasksCount = updateResult.modifiedCount;
    }

    // Find tasks that are in Backlog but assigned to active sprints
    const activeSprintIds = activeSprints.map(sprint => sprint._id);
    let correctedStatusCount = 0;
    
    if (activeSprintIds.length > 0) {
      const statusUpdateResult = await Task.updateMany(
        { 
          sprintId: { $in: activeSprintIds },
          status: 'Backlog'
        },
        { 
          $set: { 
            status: 'To Do'
          } 
        }
      );
      correctedStatusCount = statusUpdateResult.modifiedCount;
    }

    // Calculate backlog statistics
    const backlogTasks = await Task.find({ 
      projectId,
      sprintId: null,
      status: { $ne: 'Done' }
    }).countDocuments();

    const totalTasks = await Task.find({ projectId }).countDocuments();
    const tasksInSprints = await Task.find({ 
      projectId,
      sprintId: { $ne: null }
    }).countDocuments();

    // Update project backlog stats
    await Project.findByIdAndUpdate(
      projectId,
      {
        $set: {
          backlogCount: backlogTasks,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Backlog refreshed successfully. ${movedTasksCount} tasks moved to backlog, ${correctedStatusCount} task statuses corrected.`,
      statistics: {
        totalTasks,
        backlogTasks,
        tasksInSprints,
        activeSprints: activeSprints.length,
        completedSprints: completedSprints.length,
        plannedSprints: plannedSprints.length,
        movedTasksCount,
        correctedStatusCount
      },
      sprintInfo: {
        active: activeSprints.map(s => ({ id: s._id, name: s.name })),
        completed: completedSprints.map(s => ({ id: s._id, name: s.name })),
        planned: plannedSprints.map(s => ({ id: s._id, name: s.name }))
      }
    });

  } catch (error: any) {
    console.error('Error refreshing backlog:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to refresh backlog'
      },
      { status: 500 }
    );
  }
}

// Also add GET method to show current backlog status
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Project ID format'
        },
        { status: 400 }
      );
    }

    // Get backlog statistics
    const backlogTasks = await Task.find({ 
      projectId,
      sprintId: null,
      status: { $ne: 'Done' }
    })
    .select('summary status priority storyPoints assigneeIds createdAt')
    .limit(50) // Limit to 50 tasks for performance
    .lean();

    const totalTasks = await Task.find({ projectId }).countDocuments();
    const tasksInSprints = await Task.find({ 
      projectId,
      sprintId: { $ne: null }
    }).countDocuments();

    // Get sprint counts
    const activeSprints = await Sprint.find({ 
      projectId, 
      status: 'Active' 
    }).countDocuments();

    const completedSprints = await Sprint.find({ 
      projectId, 
      status: 'Completed' 
    }).countDocuments();

    const plannedSprints = await Sprint.find({ 
      projectId, 
      status: 'Planned' 
    }).countDocuments();

    // Calculate backlog health metrics
    const backlogPercentage = totalTasks > 0 ? Math.round((backlogTasks.length / totalTasks) * 100) : 0;
    
    // Count tasks by status in backlog
    const statusCounts = {
      todo: backlogTasks.filter(t => t.status === 'To Do' || t.status === 'Todo').length,
      inProgress: backlogTasks.filter(t => t.status === 'In Progress').length,
      review: backlogTasks.filter(t => t.status === 'Review').length,
      blocked: backlogTasks.filter(t => t.status === 'Blocked').length
    };

    return NextResponse.json({
      success: true,
      data: {
        backlogTasks: {
          total: backlogTasks.length,
          tasks: backlogTasks,
          percentage: backlogPercentage
        },
        overallStats: {
          totalTasks,
          tasksInSprints,
          backlogTasksCount: backlogTasks.length
        },
        sprintCounts: {
          active: activeSprints,
          completed: completedSprints,
          planned: plannedSprints,
          total: activeSprints + completedSprints + plannedSprints
        },
        backlogHealth: {
          statusCounts,
          averageStoryPoints: backlogTasks.length > 0 
            ? Math.round(backlogTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0) / backlogTasks.length)
            : 0,
          oldestTask: backlogTasks.length > 0
            ? backlogTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
            : null
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching backlog status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch backlog status'
      },
      { status: 500 }
    );
  }
}