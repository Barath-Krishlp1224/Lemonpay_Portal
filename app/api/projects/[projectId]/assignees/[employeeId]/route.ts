import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import mongoose from 'mongoose';

// Define the type for the params promise
type RouteParams = Promise<{ projectId: string; employeeId: string }>;

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params to get the IDs
    const { projectId, employeeId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Remove from assigneeIds array
    if (project.assigneeIds) {
      project.assigneeIds = project.assigneeIds.filter((aId: string) => 
        aId !== employeeId
      );
    }
    
    // Remove from members array (don't check for ownerId since it doesn't exist in your model)
    if (project.members) {
      project.members = project.members.filter((member: any) => 
        member.userId !== employeeId
      );
    }
    
    // Ensure at least one admin remains in members
    const hasAdmin = project.members?.some((member: any) => member.role === 'Admin');
    if (!hasAdmin && project.members && project.members.length > 0) {
      project.members[0].role = 'Admin';
    }
    
    // Update all tasks to remove this assignee
    if (project.tasks) {
      project.tasks = project.tasks.map((task: any) => {
        if (task.assigneeId === employeeId) {
          return {
            ...task,
            assigneeId: null,
            assigneeNames: task.assigneeNames?.filter((name: string) => 
              !name.toLowerCase().includes(employeeId.toLowerCase())
            ) || []
          };
        }
        return task;
      });
    }
    
    project.updatedAt = new Date();
    await project.save();
    
    return NextResponse.json({
      message: 'Employee removed successfully',
      project
    });
  } catch (error: any) {
    console.error('Error removing assignee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove assignee' },
      { status: 500 }
    );
  }
}