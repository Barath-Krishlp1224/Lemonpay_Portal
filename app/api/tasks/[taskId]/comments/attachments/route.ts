import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import Comment, { IAttachment } from '@/models/Comment';
import Task from '@/models/Task';

// For file uploads
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';

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

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper function to save uploaded file
async function saveUploadedFile(file: File, userId: string): Promise<{
  url: string;
  fileName: string;
  fileType: string;
  size: number;
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
  
  // Create file path
  const filePath = join(UPLOAD_DIR, fileName);
  
  // Save file
  await writeFile(filePath, buffer);
  
  // Return file info
  return {
    url: `/uploads/comments/${fileName}`,
    fileName: originalName,
    fileType: file.type,
    size: buffer.length,
  };
}

// Helper function to format attachment
function formatAttachment(
  fileInfo: { url: string; fileName: string; fileType: string; size: number },
  userId: string,
  userName: string
): IAttachment {
  return {
    url: fileInfo.url,
    fileName: fileInfo.fileName,
    fileType: fileInfo.fileType,
    size: fileInfo.size,
    uploadedBy: userName,
    uploadedById: userId,
    uploadedAt: new Date(),
  } as IAttachment;
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
    
    return NextResponse.json({
      success: true,
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    let attachments: IAttachment[] = [];
    
    if (contentType.includes('multipart/form-data')) {
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
              const attachment = formatAttachment(fileInfo, userId, userName);
              attachments.push(attachment);
            } catch (error: any) {
              console.error('Error processing file:', error.message);
              // Continue with other files even if one fails
            }
          }
        }
      }
    } else {
      // Handle JSON request (text only)
      const body = await request.json();
      text = body.text || '';
    }
    
    // Validate comment text (if no attachments, text is required)
    if (!text.trim() && attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment text or attachment is required' },
        { status: 400 }
      );
    }
    
    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Comment cannot exceed 5000 characters' },
        { status: 400 }
      );
    }
    
    // Validate attachments limit
    if (attachments.length > 10) {
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
    });
    
    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      comment: formattedComment,
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
    let newAttachments: IAttachment[] = [];
    let removedAttachmentIds: string[] = [];
    
    if (contentType.includes('multipart/form-data')) {
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
              const attachment = formatAttachment(fileInfo, userId, userName);
              newAttachments.push(attachment);
            } catch (error: any) {
              console.error('Error processing file:', error.message);
              // Continue with other files even if one fails
            }
          }
        }
      }
    } else {
      // Handle JSON request
      const body = await request.json();
      text = body.text || '';
      commentId = body.commentId || '';
      removedAttachmentIds = body.removedAttachmentIds || [];
    }
    
    // Validate inputs
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Valid Comment ID is required' },
        { status: 400 }
      );
    }
    
    if (!text.trim() && removedAttachmentIds.length === 0 && newAttachments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes detected' },
        { status: 400 }
      );
    }
    
    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Comment cannot exceed 5000 characters' },
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
    
    // Check permissions - only allow editing if:
    // 1. User is Admin/Manager, OR
    // 2. User is the original comment author
    if (userRole !== 'Admin' && userRole !== 'Manager') {
      if (comment.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own comments' },
          { status: 403 }
        );
      }
    }
    
    // Prepare update
    const updateData: any = {};
    
    if (text.trim()) {
      updateData.text = text.trim();
    }
    
    // Handle attachments
    let updatedAttachments = comment.attachments || [];
    
    // Remove specified attachments
    if (removedAttachmentIds.length > 0) {
      updatedAttachments = updatedAttachments.filter((attachment: any) => {
        const attachmentId = attachment._id?.toString();
        return !removedAttachmentIds.includes(attachmentId);
      });
    }
    
    // Add new attachments
    if (newAttachments.length > 0) {
      // Check total attachments limit
      const totalAttachments = updatedAttachments.length + newAttachments.length;
      if (totalAttachments > 10) {
        return NextResponse.json(
          { success: false, error: 'Cannot have more than 10 attachments per comment' },
          { status: 400 }
        );
      }
      
      updatedAttachments = [...updatedAttachments, ...newAttachments];
    }
    
    updateData.attachments = updatedAttachments;
    
    // Update the comment
    Object.assign(comment, updateData);
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
    });
    
    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      comment: formattedComment,
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
    if (attachmentId) {
      // This is an attachment deletion request
      return await handleAttachmentDelete(userId, userName, userRole, taskId, commentId, attachmentId);
    } else {
      // This is a comment deletion request
      return await handleCommentDelete(userId, userName, userRole, taskId, commentId);
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
  commentId: string | null
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
  commentId: string | null,
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
  
  // Check permissions - only allow deletion if:
  // 1. User is Admin/Manager, OR
  // 2. User is the attachment uploader
  const attachment = comment.attachments?.find(
    (att: any) => att._id?.toString() === attachmentId
  );
  
  if (!attachment) {
    return NextResponse.json(
      { success: false, error: 'Attachment not found' },
      { status: 404 }
    );
  }
  
  if (userRole !== 'Admin' && userRole !== 'Manager') {
    if (attachment.uploadedById !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own attachments' },
        { status: 403 }
      );
    }
  }
  
  // Remove the attachment
  comment.attachments = comment.attachments?.filter(
    (att: any) => att._id?.toString() !== attachmentId
  );
  
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