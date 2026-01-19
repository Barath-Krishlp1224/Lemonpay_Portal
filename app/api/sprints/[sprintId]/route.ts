import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import Epic from '@/models/Epic';
import Project from '@/models/Project';
import Employee from '@/models/Employee';
import mongoose from 'mongoose';

// Define types for better TypeScript support
interface SprintWithTasks {
  _id: mongoose.Types.ObjectId;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  projectId: mongoose.Types.ObjectId;
  status: string;
  tasks?: any[];
  epics?: any[];
  totalPoints?: number;
  completedPoints?: number;
  [key: string]: any;
}

interface TaskType {
  _id: mongoose.Types.ObjectId;
  assigneeIds?: string[];
  reporterIds?: string[];
  summary?: string;
  [key: string]: any;
}

interface EmployeeType {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  role?: string;
  department?: string;
  [key: string]: any;
}

// GET single sprint by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    const { sprintId } = await context.params;
    
    console.log('Fetching sprint:', sprintId);
    
    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Sprint ID format'
        },
        { status: 400 }
      );
    }

    // First try to find sprint in Sprint model
    let sprint: SprintWithTasks | null = await Sprint.findById(sprintId)
      .populate({
        path: 'tasks',
        select: 'summary description status priority storyPoints assigneeIds reporterIds issueType issueKey epicId labels dueDate duration estimatedHours actualHours createdAt updatedAt',
        options: { lean: true }
      })
      .populate({
        path: 'epics',
        select: 'name description status priority epicId createdAt updatedAt',
        options: { lean: true }
      })
      .lean<SprintWithTasks>();

    // If not found in Sprint model, check Project model
    if (!sprint) {
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      }).lean();

      if (!project) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sprint not found'
          },
          { status: 404 }
        );
      }

      // Find the sprint in the project
      const foundSprint = project.sprints.find(
        (s: any) => s._id.toString() === sprintId
      );

      if (!foundSprint) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sprint not found'
          },
          { status: 404 }
        );
      }

      // Create a plain object from the embedded sprint
      sprint = {
        _id: new mongoose.Types.ObjectId(sprintId),
        name: foundSprint.name || '',
        goal: foundSprint.goal || '',
        startDate: foundSprint.startDate ? new Date(foundSprint.startDate) : new Date(),
        endDate: foundSprint.endDate ? new Date(foundSprint.endDate) : new Date(),
        projectId: new mongoose.Types.ObjectId(project._id),
        status: foundSprint.status || 'Planned',
        tasks: [],
        epics: [],
        totalPoints: foundSprint.totalPoints || 0,
        completedPoints: foundSprint.completedPoints || 0
      };
      
      // Get tasks for this sprint from the project
      if (project.tasks && Array.isArray(project.tasks)) {
        const sprintTasks = project.tasks.filter(
          (task: any) => task.sprintId && task.sprintId.toString() === sprintId
        );
        sprint.tasks = sprintTasks;
      }

      // Get epics for this sprint from the project if available
      if (project.epics && Array.isArray(project.epics)) {
        const sprintEpics = project.epics.filter(
          (epic: any) => epic.sprintId && epic.sprintId.toString() === sprintId
        );
        sprint.epics = sprintEpics;
      }
    }

    // If tasks exist, get assignee and reporter details
    if (sprint.tasks && Array.isArray(sprint.tasks)) {
      // Get all unique employee IDs from tasks
      const allAssigneeIds: string[] = [];
      const allReporterIds: string[] = [];
      
      sprint.tasks.forEach((task: TaskType) => {
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
          allAssigneeIds.push(...task.assigneeIds);
        }
        if (task.reporterIds && Array.isArray(task.reporterIds)) {
          allReporterIds.push(...task.reporterIds);
        }
      });
      
      // Get employees for assignees and reporters
      const uniqueAssigneeIds = [...new Set(allAssigneeIds)];
      const uniqueReporterIds = [...new Set(allReporterIds)];
      
      // Initialize with explicit types
      let assignees: EmployeeType[] = [];
      let reporters: EmployeeType[] = [];
      
      if (uniqueAssigneeIds.length > 0) {
        assignees = await Employee.find({ _id: { $in: uniqueAssigneeIds } })
          .select('name email role department status')
          .lean<EmployeeType[]>();
      }
      
      if (uniqueReporterIds.length > 0) {
        reporters = await Employee.find({ _id: { $in: uniqueReporterIds } })
          .select('name email role department status')
          .lean<EmployeeType[]>();
      }
      
      // Map employees to tasks
      sprint.tasks = sprint.tasks.map((task: TaskType) => {
        const taskAssignees = assignees.filter((emp: EmployeeType) => 
          task.assigneeIds?.includes(emp._id.toString())
        );
        const taskReporters = reporters.filter((emp: EmployeeType) => 
          task.reporterIds?.includes(emp._id.toString())
        );
        
        return {
          ...task,
          assigneeDetails: taskAssignees,
          reporterDetails: taskReporters,
          assigneeNames: taskAssignees.map((emp: EmployeeType) => emp.name),
          reporterNames: taskReporters.map((emp: EmployeeType) => emp.name)
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: sprint
    });
  } catch (error: any) {
    console.error('Error fetching sprint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch sprint'
      },
      { status: 500 }
    );
  }
}

// PUT (Update) sprint by ID
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    const { sprintId } = await context.params;
    const data = await request.json();
    
    console.log('Updating sprint:', sprintId, 'with data:', data);
    
    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Sprint ID format'
        },
        { status: 400 }
      );
    }

    // Check if sprint exists in Sprint model
    let existingSprint = await Sprint.findById(sprintId);
    let isInProjectModel = false;
    let projectId: mongoose.Types.ObjectId | null = null;
    
    if (!existingSprint) {
      // Check Project model
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      });
      
      if (!project) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sprint not found'
          },
          { status: 404 }
        );
      }
      
      isInProjectModel = true;
      projectId = new mongoose.Types.ObjectId(project._id);
      const sprintIndex = project.sprints.findIndex(
        (s: any) => s._id.toString() === sprintId
      );
      
      if (sprintIndex === -1) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sprint not found in project'
          },
          { status: 404 }
        );
      }
      
      existingSprint = project.sprints[sprintIndex];
    } else {
      projectId = existingSprint.projectId;
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      ...data,
      updatedAt: new Date()
    };

    // Handle status changes
    if (data.status && data.status !== existingSprint.status) {
      if (data.status === 'Active') {
        updateData.startDate = new Date();
      } else if (data.status === 'Completed') {
        updateData.endDate = new Date();
      }
    }

    if (isInProjectModel) {
      // Update in Project model
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      });
      
      if (project) {
        const sprintIndex = project.sprints.findIndex(
          (s: any) => s._id.toString() === sprintId
        );
        
        if (sprintIndex !== -1) {
          // Update the sprint in project
          project.sprints[sprintIndex] = {
            ...project.sprints[sprintIndex],
            ...updateData,
            _id: new mongoose.Types.ObjectId(sprintId)
          };
          
          await project.save();
          
          // Also update in Sprint model for consistency
          await Sprint.findOneAndUpdate(
            { _id: sprintId },
            updateData,
            { upsert: true, new: true }
          );
        }
      }
    } else {
      // Update in Sprint model
      const updatedSprint = await Sprint.findByIdAndUpdate(
        sprintId,
        updateData,
        { new: true, runValidators: true }
      ).populate({
        path: 'tasks',
        select: 'summary status storyPoints assigneeIds issueType',
        options: { lean: true }
      });

      // Update tasks if task list changed
      if (data.tasks && Array.isArray(data.tasks)) {
        // Remove sprint from old tasks not in new list
        const oldTasks = existingSprint.tasks || [];
        const tasksToRemove = oldTasks.filter((taskId: mongoose.Types.ObjectId | string) => 
          !data.tasks.includes(taskId.toString())
        );
        
        if (tasksToRemove.length > 0) {
          await Task.updateMany(
            { _id: { $in: tasksToRemove } },
            { 
              $set: { 
                sprintId: null,
                status: 'Backlog'
              } 
            }
          );
        }

        // Add sprint to new tasks
        await Task.updateMany(
          { _id: { $in: data.tasks } },
          { 
            $set: { 
              sprintId: sprintId,
              status: data.status === 'Active' ? 'To Do' : 'Backlog'
            } 
          }
        );
      }

      // Update epics if changed
      if (data.epics && Array.isArray(data.epics)) {
        // Remove sprint from old epics not in new list
        const oldEpics = existingSprint.epics || [];
        const epicsToRemove = oldEpics.filter((epicId: mongoose.Types.ObjectId | string) => 
          !data.epics.includes(epicId.toString())
        );
        
        if (epicsToRemove.length > 0) {
          await Epic.updateMany(
            { _id: { $in: epicsToRemove } },
            { $set: { sprintId: null } }
          );
        }

        // Add sprint to new epics
        await Epic.updateMany(
          { _id: { $in: data.epics } },
          { $set: { sprintId: sprintId } }
        );
      }

      // Also update the embedded sprint in Project model
      const project = await Project.findById(updatedSprint?.projectId);
      if (project && project.sprints) {
        const sprintIndex = project.sprints.findIndex(
          (s: any) => s._id.toString() === sprintId
        );
        
        if (sprintIndex !== -1) {
          project.sprints[sprintIndex] = {
            _id: updatedSprint?._id,
            name: updatedSprint?.name,
            goal: updatedSprint?.goal || '',
            startDate: updatedSprint?.startDate,
            endDate: updatedSprint?.endDate,
            status: updatedSprint?.status,
            tasks: updatedSprint?.tasks || [],
            completedTasks: updatedSprint?.completedTasks || 0,
            totalTasks: updatedSprint?.tasks?.length || 0,
            completedPoints: updatedSprint?.completedPoints || 0,
            totalPoints: updatedSprint?.totalPoints || 0,
            createdAt: project.sprints[sprintIndex].createdAt || new Date(),
            updatedAt: new Date()
          };
          
          await project.save();
        }
      }
    }

    // Get the updated sprint for response
    const finalSprint = await Sprint.findById(sprintId)
      .populate('tasks')
      .lean<SprintWithTasks>();
    
    return NextResponse.json({
      success: true,
      message: 'Sprint updated successfully',
      data: finalSprint
    });
  } catch (error: any) {
    console.error('Error updating sprint:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false,
          error: 'A sprint with this name already exists in this project.'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update sprint'
      },
      { status: 500 }
    );
  }
}

// DELETE sprint by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    const { sprintId } = await context.params;
    
    console.log('Deleting sprint:', sprintId);
    
    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid Sprint ID format'
        },
        { status: 400 }
      );
    }

    // Check if sprint exists in Sprint model
    const sprint = await Sprint.findById(sprintId);
    let isInProjectModel = false;
    
    if (!sprint) {
      // Check Project model
      const project = await Project.findOne({
        "sprints._id": new mongoose.Types.ObjectId(sprintId)
      });
      
      if (!project) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sprint not found'
          },
          { status: 404 }
        );
      }
      
      isInProjectModel = true;
    }

    // Remove sprint reference from tasks
    await Task.updateMany(
      { sprintId: sprintId },
      { 
        $set: { 
          sprintId: null,
          status: 'Backlog'
        } 
      }
    );
    
    // Remove sprint reference from epics
    await Epic.updateMany(
      { sprintId: sprintId },
      { $set: { sprintId: null } }
    );

    // Remove sprint from Project model
    const project = await Project.findOne({
      "sprints._id": new mongoose.Types.ObjectId(sprintId)
    });
    
    if (project && project.sprints) {
      project.sprints = project.sprints.filter(
        (s: any) => s._id.toString() !== sprintId
      );
      await project.save();
    }

    // Delete from Sprint model if it exists there
    if (!isInProjectModel) {
      await Sprint.findByIdAndDelete(sprintId);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sprint deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to delete sprint'
      },
      { status: 500 }
    );
  }
}