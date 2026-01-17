import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import mongoose from 'mongoose';

// Define the type for the params promise - use projectId instead of id
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
    project.assigneeIds = project.assigneeIds?.filter((aId: any) => 
      aId.toString() !== employeeId
    ) || [];
    
    // Remove from members array (except if they are the owner)
    project.members = project.members?.filter((member: any) => {
      // Don't remove if this is the owner
      if (project.ownerId?.toString() === employeeId) {
        return true;
      }
      // Remove if userId matches employeeId
      return member.userId?.toString() !== employeeId;
    }) || [];
    
    project.updatedAt = new Date();
    await project.save();
    
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error removing assignee:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove assignee' },
      { status: 500 }
    );
  }
}