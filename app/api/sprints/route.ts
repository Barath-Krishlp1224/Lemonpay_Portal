import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';
import Epic from '@/models/Epic';
import Project from '@/models/Project';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    console.log('Received sprint data:', data);
    
    // Validate required fields
    if (!data.name || !data.startDate || !data.endDate || !data.projectId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, startDate, endDate, and projectId are required' 
        },
        { status: 400 }
      );
    }

    // Validate project exists
    const project = await Project.findById(data.projectId);
    if (!project) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Project not found' 
        },
        { status: 404 }
      );
    }

    const projectKey = data.projectKey || project.key;
    
    // Generate a unique sprint name
    let sprintName = data.name.trim();
    const existingSprints = await Sprint.find({ projectId: data.projectId });
    
    // Check if name already exists (case-insensitive)
    const nameExists = existingSprints.some(
      (sprint: any) => sprint.name.toLowerCase() === sprintName.toLowerCase()
    );
    
    if (nameExists) {
      // Find next available number
      const usedNumbers = new Set<number>();
      
      existingSprints.forEach((sprint: any) => {
        const match = sprint.name.match(/Sprint (\d+)$/i);
        if (match) {
          usedNumbers.add(parseInt(match[1]));
        }
      });
      
      let newNumber = 1;
      while (usedNumbers.has(newNumber)) {
        newNumber++;
      }
      
      sprintName = `${projectKey} Sprint ${newNumber}`;
    }

    // Calculate total story points from selected tasks
    let totalPoints = 0;
    if (data.tasks && data.tasks.length > 0) {
      const selectedTasks = await Task.find({ _id: { $in: data.tasks } });
      totalPoints = selectedTasks.reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0);
    }

    // Create sprint data
    const sprintData: any = {
      name: sprintName,
      goal: data.goal || '',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      projectId: new mongoose.Types.ObjectId(data.projectId),
      projectKey: projectKey,
      velocity: data.velocity || 20,
      totalPoints: totalPoints,
      completedPoints: 0,
      status: 'Planned',
      tasks: data.tasks || [],
      epics: data.epics || [],
      sprintNumber: existingSprints.length + 1,
    };

    console.log('Creating sprint with data:', sprintData);
    
    // Create the sprint
    const sprint = new Sprint(sprintData);
    await sprint.save();
    
    console.log('Sprint created successfully:', sprint._id);
    
    // Update tasks to reference this sprint
    if (data.tasks && data.tasks.length > 0) {
      await Task.updateMany(
        { _id: { $in: data.tasks } },
        { 
          $set: { 
            sprintId: sprint._id,
            status: 'To Do'
          } 
        }
      );
    }
    
    // Update epics to reference this sprint
    if (data.epics && data.epics.length > 0) {
      await Epic.updateMany(
        { _id: { $in: data.epics } },
        { $set: { sprintId: sprint._id } }
      );
    }

    // Also update the embedded sprints array in the Project model
    await Project.findByIdAndUpdate(
      data.projectId,
      {
        $push: {
          sprints: {
            _id: sprint._id,
            name: sprint.name,
            goal: sprint.goal || '',
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            status: sprint.status,
            tasks: sprint.tasks || [],
            completedTasks: 0,
            totalTasks: data.tasks?.length || 0,
            completedPoints: 0,
            totalPoints: totalPoints,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: sprint
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      console.error('Duplicate key error details:', error.keyPattern, error.keyValue);
      
      if (error.keyPattern?.id) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Database configuration issue. Please contact your administrator to fix the sprint ID index.'
          },
          { status: 500 }
        );
      }
      
      if (error.keyPattern?.name && error.keyPattern?.projectId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'A sprint with this name already exists in this project.'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create sprint'
      },
      { status: 500 }
    );
  }
}

// GET endpoint - FIXED with safe population
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    
    let query: any = {};
    
    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }
    
    if (status) {
      query.status = status;
    }
    
    // Fetch sprints with safe population
    const sprints = await Sprint.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'tasks',
        select: 'title description status storyPoints assigneeId epicId taskId summary',
        options: { lean: true } // Use lean to get plain objects
      })
      // FIX: Use .lean() on the main query to avoid document issues
      .lean();
    
    // Manually populate epics to handle the virtual field issue
    const sprintWithEpics = [];
    
    for (const sprint of sprints) {
      if (sprint.epics && sprint.epics.length > 0) {
        // Get epics with specific fields, using .lean() to avoid virtual issues
        const epics = await Epic.find({ _id: { $in: sprint.epics } })
          .select('name description status priority createdAt updatedAt epicId')
          .lean();
        
        // Add formatted dates manually
        const epicsWithFormattedDates = epics.map(epic => ({
          ...epic,
          createdAtFormatted: epic.createdAt 
            ? new Date(epic.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A',
          updatedAtFormatted: epic.updatedAt
            ? new Date(epic.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A'
        }));
        
        sprintWithEpics.push({
          ...sprint,
          epics: epicsWithFormattedDates
        });
      } else {
        sprintWithEpics.push({
          ...sprint,
          epics: []
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: sprintWithEpics,
      count: sprintWithEpics.length
    });
  } catch (error: any) {
    console.error('Error fetching sprints:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch sprints'
      },
      { status: 500 }
    );
  }
}