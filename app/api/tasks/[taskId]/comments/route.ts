import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Comment, { IAttachment } from '@/models/Comment';
import Task from '@/models/Task';

// For file uploads
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

// Connect to database
async function ensureConnection() {
  if (mongoose.connection.readyState === 0) {
    await connectToDatabase();
  }
}

// Configure file upload
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
];

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'comments');

// Check if we're on Vercel
const isVercel = process.env.VERCEL === '1';

// Ensure upload directory exists (only in development)
if (!isVercel && !existsSync(UPLOAD_DIR)) {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.warn('Could not create upload directory:', error);
  }
}

// Helper function to save uploaded file (works on both Vercel and local)
async function saveUploadedFile(file: File, userId: string): Promise<{
  url: string;
  fileName: string;
  fileType: string;
  size: number;
  savedFileName: string;
}> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }
  
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported`);
  }
  
  // Generate unique filename
  const originalName = file.name;
  const fileExt = originalName.split('.').pop() || 'bin';
  const randomString = randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const fileName = `${timestamp}-${randomString}.${fileExt}`;
  
  // On Vercel, we store files as base64 in MongoDB
  if (isVercel) {
    console.log('Vercel environment detected, storing file as base64 in database');
    
    // Convert to base64 for storage in database
    const base64String = buffer.toString('base64');
    
    return {
      url: `data:${file.type};base64,${base64String}`,
      fileName: originalName,
      fileType: file.type,
      size: buffer.length,
      savedFileName: fileName,
    };
  }
  
  // Local development - save to filesystem
  try {
    const filePath = join(UPLOAD_DIR, fileName);
    
    // Check if directory exists before writing
    if (existsSync(UPLOAD_DIR)) {
      await writeFile(filePath, buffer);
      console.log(`File saved locally: ${filePath}`);
    } else {
      console.warn('Upload directory does not exist, falling back to base64 storage');
      // Fall back to base64
      const base64String = buffer.toString('base64');
      return {
        url: `data:${file.type};base64,${base64String}`,
        fileName: originalName,
        fileType: file.type,
        size: buffer.length,
        savedFileName: fileName,
      };
    }
    
    return {
      url: `/uploads/comments/${fileName}`,
      fileName: originalName,
      fileType: file.type,
      size: buffer.length,
      savedFileName: fileName,
    };
  } catch (error: any) {
    console.error('Error saving file locally:', error);
    
    // Fall back to base64 storage
    const base64String = buffer.toString('base64');
    return {
      url: `data:${file.type};base64,${base64String}`,
      fileName: originalName,
      fileType: file.type,
      size: buffer.length,
      savedFileName: fileName,
    };
  }
}

// Helper function to delete file
function deleteFile(fileUrl: string): void {
  // If it's a base64 URL (data:), there's no file to delete
  if (fileUrl.startsWith('data:')) {
    console.log('Skipping file deletion for base64 URL');
    return;
  }
  
  try {
    const fileName = fileUrl.split('/').pop();
    if (fileName) {
      const filePath = join(UPLOAD_DIR, fileName);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`Deleted local file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// GET: Fetch all comments for a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureConnection();
    
    // Get auth headers
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    
    console.log('=== GET Comments API ===');
    console.log('Auth headers:', { userId, userName, userRole });
    console.log('Environment:', isVercel ? 'Vercel' : 'Local');
    
    // Await params before using it
    const { taskId } = await params;
    console.log('Task ID:', taskId);
    
    // Only require userName and userRole for authentication
    if (!userName || !userRole) {
      console.log('Missing required auth headers');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication headers are missing. Please provide x-user-name and x-user-role headers.' 
        },
        { status: 401 }
      );
    }
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Task ID is required' },
        { status: 400 }
      );
    }
    
    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Fetch comments with pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    const comments = await Comment.find({ taskId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Comment.countDocuments({ taskId });
    
    // Format comments with attachments
    const formattedComments = comments.map(comment => ({
      ...comment,
      _id: comment._id?.toString(),
      id: comment._id?.toString(),
      attachments: comment.attachments?.map((attachment: any) => ({
        id: attachment._id?.toString(),
        url: attachment.url,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.size,
        uploadedAt: attachment.uploadedAt,
        uploadedBy: attachment.uploadedBy,
        uploadedById: attachment.uploadedById,
      })) || [],
    }));
    
    // Update comment count in task
    await Task.findByIdAndUpdate(taskId, { commentCount: total });
    
    console.log(`Returning ${formattedComments.length} comments for task ${taskId}`);
    console.log('Sample comment with attachments:', 
      formattedComments[0]?.attachments?.length 
        ? `Has ${formattedComments[0].attachments.length} attachments` 
        : 'No attachments'
    );
    
    return NextResponse.json({
      success: true,
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      environment: isVercel ? 'vercel' : 'local',
    });
    
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST: Add a new comment to a task (with file upload support)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureConnection();
    
    // Get auth headers
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    
    console.log('=== POST Comments API ===');
    console.log('Auth headers:', { userId, userName, userRole });
    console.log('Environment:', isVercel ? 'Vercel' : 'Local');
    
    // Await params before using it
    const { taskId } = await params;
    console.log('Task ID:', taskId);
    
    // Only require userName and userRole for authentication
    if (!userName || !userRole) {
      console.log('Missing required auth headers');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication headers are missing. Please provide x-user-name and x-user-role headers.' 
        },
        { status: 401 }
      );
    }
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Task ID is required' },
        { status: 400 }
      );
    }
    
    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Check if request has form data (file upload)
    const contentType = request.headers.get('content-type') || '';
    let text = '';
    const attachments: any[] = [];
    const savedFiles: string[] = [];
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request');
      
      // Handle file upload
      const formData = await request.formData();
      text = (formData.get('text') as string) || '';
      
      // Get uploaded files
      const files = formData.getAll('attachments') as File[];
      
      if (files.length > 0) {
        console.log(`Processing ${files.length} attachments`);
        
        // Process each file
        for (const file of files) {
          if (file.size > 0) {
            try {
              const fileInfo = await saveUploadedFile(file, userId);
              const attachment = {
                url: fileInfo.url,
                fileName: fileInfo.fileName,
                fileType: fileInfo.fileType,
                size: fileInfo.size,
                uploadedBy: userName,
                uploadedById: userId,
                uploadedAt: new Date(),
              };
              attachments.push(attachment);
              savedFiles.push(fileInfo.savedFileName);
              console.log(`Saved attachment: ${fileInfo.fileName}, type: ${fileInfo.fileType}`);
            } catch (error: any) {
              console.error('Error processing file:', error.message);
              // Clean up any saved files on error
              savedFiles.forEach(fileName => {
                if (!isVercel) {
                  const filePath = join(UPLOAD_DIR, fileName);
                  if (existsSync(filePath)) {
                    unlinkSync(filePath);
                  }
                }
              });
              return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
              );
            }
          }
        }
      }
    } else {
      console.log('Processing JSON request');
      // Handle JSON request (text only)
      try {
        const body = await request.json();
        text = body.text || '';
      } catch (error) {
        console.log('No JSON body or empty body');
      }
    }
    
    // Validate comment - either text or attachments are required
    if (!text.trim() && attachments.length === 0) {
      console.log('Validation failed: No text and no attachments');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Comment text or attachment is required' 
        },
        { status: 400 }
      );
    }
    
    // If there's text, validate length
    if (text.trim() && text.length > 5000) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Comment cannot exceed 5000 characters' },
        { status: 400 }
      );
    }
    
    // Validate attachments limit
    if (attachments.length > 10) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Cannot upload more than 10 attachments per comment' },
        { status: 400 }
      );
    }
    
    // Create new comment
    const commentData = {
      text: text.trim(),
      userId,
      userName,
      userRole,
      taskId: new mongoose.Types.ObjectId(taskId),
      attachments,
    };
    
    console.log('Creating comment with data:', {
      text: text.trim(),
      userId,
      userName,
      userRole,
      taskId,
      attachmentsCount: attachments.length,
      environment: isVercel ? 'vercel' : 'local',
    });
    
    const comment = new Comment(commentData);
    await comment.save();
    
    // Convert to plain object and format
    const commentObj = comment.toObject();
    const formattedComment = {
      ...commentObj,
      _id: commentObj._id.toString(),
      id: commentObj._id.toString(),
      attachments: commentObj.attachments?.map((attachment: any) => ({
        id: attachment._id?.toString(),
        url: attachment.url,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.size,
        uploadedAt: attachment.uploadedAt,
        uploadedBy: attachment.uploadedBy,
        uploadedById: attachment.uploadedById,
      })) || [],
    };
    
    // Increment comment count in task and update last comment timestamp
    await Task.findByIdAndUpdate(taskId, {
      $inc: { commentCount: 1 },
      $set: { lastCommentAt: new Date() },
      updatedAt: new Date(),
    });
    
    console.log(`Created new comment for task ${taskId} by user ${userName}`);
    console.log('Comment saved:', {
      id: formattedComment._id,
      text: formattedComment.text,
      userName: formattedComment.userName,
      userRole: formattedComment.userRole,
      attachmentsCount: formattedComment.attachments.length,
      hasAttachments: formattedComment.attachments.length > 0,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      comment: formattedComment,
      environment: isVercel ? 'vercel' : 'local',
    });
    
  } catch (error: any) {
    console.error('Error adding comment:', error);
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      console.error('Duplicate key error details:', error.keyPattern);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate key error. Please check your database indexes.',
          details: `Duplicate on fields: ${JSON.stringify(error.keyPattern)}`
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing comment (with file upload support)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureConnection();
    
    // Get auth headers
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    
    console.log('=== PUT Comments API ===');
    console.log('Auth headers:', { userId, userName, userRole });
    console.log('Environment:', isVercel ? 'Vercel' : 'Local');
    
    // Await params before using it
    const { taskId } = await params;
    console.log('Task ID:', taskId);
    
    if (!userName || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Authentication headers are missing' },
        { status: 401 }
      );
    }
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Task ID is required' },
        { status: 400 }
      );
    }
    
    // Check content type
    const contentType = request.headers.get('content-type') || '';
    let text = '';
    let commentId = '';
    const newAttachments: any[] = [];
    const savedFiles: string[] = [];
    let removedAttachmentIds: string[] = [];
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data update request');
      
      // Handle form data with file upload
      const formData = await request.formData();
      text = (formData.get('text') as string) || '';
      commentId = (formData.get('commentId') as string) || '';
      
      // Get removed attachment IDs
      const removedIds = formData.get('removedAttachmentIds');
      if (removedIds) {
        try {
          removedAttachmentIds = JSON.parse(removedIds as string);
        } catch (e) {
          console.error('Error parsing removedAttachmentIds:', e);
        }
      }
      
      // Get new uploaded files
      const files = formData.getAll('newAttachments') as File[];
      
      if (files.length > 0) {
        console.log(`Processing ${files.length} new attachments`);
        
        // Process each file
        for (const file of files) {
          if (file.size > 0) {
            try {
              const fileInfo = await saveUploadedFile(file, userId);
              const attachment = {
                url: fileInfo.url,
                fileName: fileInfo.fileName,
                fileType: fileInfo.fileType,
                size: fileInfo.size,
                uploadedBy: userName,
                uploadedById: userId,
                uploadedAt: new Date(),
              };
              newAttachments.push(attachment);
              savedFiles.push(fileInfo.savedFileName);
            } catch (error: any) {
              console.error('Error processing file:', error.message);
              // Clean up any saved files on error
              if (!isVercel) {
                savedFiles.forEach(fileName => {
                  const filePath = join(UPLOAD_DIR, fileName);
                  if (existsSync(filePath)) {
                    unlinkSync(filePath);
                  }
                });
              }
              return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
              );
            }
          }
        }
      }
    } else {
      console.log('Processing JSON update request');
      
      // Handle JSON request
      try {
        const body = await request.json();
        text = body.text || '';
        commentId = body.commentId || '';
        removedAttachmentIds = body.removedAttachmentIds || [];
      } catch (error) {
        console.log('No JSON body or empty body');
      }
    }
    
    // Validate inputs
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Valid Comment ID is required' },
        { status: 400 }
      );
    }
    
    // Find the comment to check current state
    const comment = await Comment.findById(commentId);
    if (!comment) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Get current attachments
    const currentAttachments = comment.attachments || [];
    
    // Check if update would result in empty comment (no text and no attachments)
    const remainingAttachments = currentAttachments.filter((attachment: any) => 
      !removedAttachmentIds.includes(attachment._id?.toString())
    );
    const totalAttachmentsAfterUpdate = remainingAttachments.length + newAttachments.length;
    
    if (!text.trim() && totalAttachmentsAfterUpdate === 0) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Comment must have either text or at least one attachment' },
        { status: 400 }
      );
    }
    
    // Verify comment belongs to the task
    if (comment.taskId.toString() !== taskId) {
      // Clean up saved files
      if (!isVercel) {
        savedFiles.forEach(fileName => {
          const filePath = join(UPLOAD_DIR, fileName);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this task' },
        { status: 400 }
      );
    }
    
    // Check permissions - only allow editing if:
    // 1. User is Admin/Manager, OR
    // 2. User is the original comment author
    if (userRole !== 'Admin' && userRole !== 'Manager') {
      if (comment.userId !== userId) {
        // Clean up saved files
        if (!isVercel) {
          savedFiles.forEach(fileName => {
            const filePath = join(UPLOAD_DIR, fileName);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
          });
        }
        return NextResponse.json(
          { success: false, error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }
    }
    
    // Delete removed attachments' files
    if (removedAttachmentIds.length > 0) {
      const attachmentsToRemove = currentAttachments.filter((attachment: any) => 
        removedAttachmentIds.includes(attachment._id?.toString())
      );
      
      attachmentsToRemove.forEach((attachment: any) => {
        if (attachment.url) {
          deleteFile(attachment.url);
        }
      });
    }
    
    // Filter out removed attachments
    let updatedAttachments = currentAttachments.filter((attachment: any) => 
      !removedAttachmentIds.includes(attachment._id?.toString())
    );
    
    // Add new attachments
    if (newAttachments.length > 0) {
      // Check total attachments limit
      const totalAttachments = updatedAttachments.length + newAttachments.length;
      if (totalAttachments > 10) {
        // Clean up newly saved files
        if (!isVercel) {
          savedFiles.forEach(fileName => {
            const filePath = join(UPLOAD_DIR, fileName);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
          });
        }
        return NextResponse.json(
          { success: false, error: 'Cannot have more than 10 attachments per comment' },
          { status: 400 }
        );
      }
      
      updatedAttachments = [...updatedAttachments, ...newAttachments];
    }
    
    // Update the comment
    if (text.trim()) {
      comment.text = text.trim();
    } else if (totalAttachmentsAfterUpdate > 0) {
      // If there are attachments but no text, set text to empty string
      comment.text = '';
    }
    comment.attachments = updatedAttachments;
    await comment.save();
    
    // Update last comment timestamp in task
    await Task.findByIdAndUpdate(taskId, {
      $set: { lastCommentAt: new Date() },
      updatedAt: new Date(),
    });
    
    // Format response
    const commentObj = comment.toObject();
    const formattedComment = {
      ...commentObj,
      _id: commentObj._id.toString(),
      id: commentObj._id.toString(),
      attachments: commentObj.attachments?.map((attachment: any) => ({
        id: attachment._id?.toString(),
        url: attachment.url,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.size,
        uploadedAt: attachment.uploadedAt,
        uploadedBy: attachment.uploadedBy,
        uploadedById: attachment.uploadedById,
      })) || [],
    };
    
    console.log(`Updated comment ${commentId} for task ${taskId} by user ${userName}`);
    console.log('Updated comment details:', {
      id: formattedComment._id,
      text: formattedComment.text,
      userName: formattedComment.userName,
      userRole: formattedComment.userRole,
      editedAt: formattedComment.editedAt,
      attachmentsCount: formattedComment.attachments.length,
      environment: isVercel ? 'vercel' : 'local',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      comment: formattedComment,
      environment: isVercel ? 'vercel' : 'local',
    });
    
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment OR an attachment based on query parameters
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureConnection();
    
    // Get auth headers
    const userId = request.headers.get('x-user-id') || 'unknown';
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    
    console.log('=== DELETE API ===');
    console.log('Auth headers:', { userId, userName, userRole });
    console.log('Environment:', isVercel ? 'Vercel' : 'Local');
    
    if (!userName || !userRole) {
      return NextResponse.json(
        { success: false, error: 'Authentication headers are missing' },
        { status: 401 }
      );
    }
    
    // Await params before using it
    const { taskId } = await params;
    
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Task ID is required' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const attachmentId = searchParams.get('attachmentId');
    
    // Check if this is a comment deletion or attachment deletion
    if (attachmentId && commentId) {
      // This is an attachment deletion request
      return await handleAttachmentDelete(userId, userName, userRole, taskId, commentId, attachmentId);
    } else if (commentId) {
      // This is a comment deletion request
      return await handleCommentDelete(userId, userName, userRole, taskId, commentId);
    } else {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Error in DELETE API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process delete request' },
      { status: 500 }
    );
  }
}

// Helper function to handle comment deletion
async function handleCommentDelete(
  userId: string,
  userName: string,
  userRole: string,
  taskId: string,
  commentId: string
) {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json(
      { success: false, error: 'Valid Comment ID is required' },
      { status: 400 }
    );
  }
  
  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    return NextResponse.json(
      { success: false, error: 'Comment not found' },
      { status: 404 }
    );
  }
  
  // Verify comment belongs to the task
  if (comment.taskId.toString() !== taskId) {
    return NextResponse.json(
      { success: false, error: 'Comment does not belong to this task' },
      { status: 400 }
    );
  }
  
  // Check permissions - only allow deletion if:
  // 1. User is Admin/Manager, OR
  // 2. User is the original comment author
  if (userRole !== 'Admin' && userRole !== 'Manager') {
    if (comment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }
  }
  
  // Delete attachment files first (only if not base64)
  if (comment.attachments && comment.attachments.length > 0) {
    comment.attachments.forEach((attachment: any) => {
      if (attachment.url && !attachment.url.startsWith('data:')) {
        deleteFile(attachment.url);
      }
    });
  }
  
  // Delete the comment
  await Comment.findByIdAndDelete(commentId);
  
  // Decrement comment count in task
  await Task.findByIdAndUpdate(taskId, {
    $inc: { commentCount: -1 },
    updatedAt: new Date(),
  });
  
  console.log(`Deleted comment ${commentId} from task ${taskId} by user ${userName}`);
  
  return NextResponse.json({
    success: true,
    message: 'Comment deleted successfully',
  });
}

// Helper function to handle attachment deletion
async function handleAttachmentDelete(
  userId: string,
  userName: string,
  userRole: string,
  taskId: string,
  commentId: string,
  attachmentId: string
) {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json(
      { success: false, error: 'Valid Comment ID is required' },
      { status: 400 }
    );
  }
  
  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    return NextResponse.json(
      { success: false, error: 'Comment not found' },
      { status: 404 }
    );
  }
  
  // Verify comment belongs to the task
  if (comment.taskId.toString() !== taskId) {
    return NextResponse.json(
      { success: false, error: 'Comment does not belong to this task' },
      { status: 400 }
    );
  }
  
  // Find the attachment
  const attachment = comment.attachments?.find(
    (att: any) => att._id?.toString() === attachmentId
  );
  
  if (!attachment) {
    return NextResponse.json(
      { success: false, error: 'Attachment not found' },
      { status: 404 }
    );
  }
  
  // Check if deleting this attachment would leave the comment empty
  const remainingAttachments = comment.attachments?.filter(
    (att: any) => att._id?.toString() !== attachmentId
  ) || [];
  
  if (remainingAttachments.length === 0 && (!comment.text || comment.text.trim() === '')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cannot delete the only attachment from a comment with no text. Either add text or delete the entire comment.' 
      },
      { status: 400 }
    );
  }
  
  // Check permissions - only allow deletion if:
  // 1. User is Admin/Manager, OR
  // 2. User is the attachment uploader
  if (userRole !== 'Admin' && userRole !== 'Manager') {
    if (attachment.uploadedById !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own attachments' },
        { status: 403 }
      );
    }
  }
  
  // Delete the file from storage (only if not base64)
  if (attachment.url && !attachment.url.startsWith('data:')) {
    deleteFile(attachment.url);
  }
  
  // Remove the attachment from the comment
  const updatedAttachments = comment.attachments?.filter(
    (att: any) => att._id?.toString() !== attachmentId
  );
  
  comment.attachments = updatedAttachments;
  await comment.save();
  
  console.log(`Deleted attachment ${attachmentId} from comment ${commentId} in task ${taskId}`);
  
  // Format response
  const commentObj = comment.toObject();
  const formattedComment = {
    ...commentObj,
    _id: commentObj._id.toString(),
    id: commentObj._id.toString(),
    attachments: commentObj.attachments?.map((att: any) => ({
      id: att._id?.toString(),
      url: att.url,
      fileName: att.fileName,
      fileType: att.fileType,
      fileSize: att.size,
      uploadedAt: att.uploadedAt,
      uploadedBy: att.uploadedBy,
      uploadedById: att.uploadedById,
    })) || [],
  };
  
  return NextResponse.json({
    success: true,
    message: 'Attachment deleted successfully',
    comment: formattedComment,
  });
}