"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { File, Image, FileText } from "lucide-react";
import TasksList from "./TasksList";
import TaskForm from "./TaskForm";
import TaskDetailsModal from "./TaskDetailsModal";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

// Import interfaces from shared types if available, otherwise define them here
interface Subtask {
  _id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: "Todo" | "In Progress" | "Done";
  progressPercentage: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

interface TaskComment {
  _id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  content: string;
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  text?: string;
}

interface TaskAttachment {
  _id: string;
  id?: string;
  fileName: string;
  url: string;
  fileUrl?: string;
  size?: number;
  fileSize?: number;
  fileType?: string;
  mimeType?: string;
  uploadedBy?: string;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  createdAt?: string;
  taskId?: string;
  commentId?: string;
}

interface Task {
  _id: string;
  taskId: string;
  issueKey: string;
  summary: string;
  description: string;
  issueType: "Story" | "Task" | "Bug";
  status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
  priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
  assigneeIds: string[];
  reporterIds: string[];
  assigneeNames?: string[];
  reporterNames?: string[];
  assigneeEmails?: string[];
  reporterEmails?: string[];
  assigneeRoles?: string[];
  reporterRoles?: string[];
  epicId: string;
  epicName: string;
  storyPoints: number;
  labels: string[];
  dueDate: string;
  duration: number;
  attachments: string[];
  comments: TaskComment[];
  subtasks?: Subtask[];
  projectId: string;
  projectName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number;
  actualHours?: number;
  completion?: number;
}

interface TasksManagementProps {
  selectedProject: SavedProject | null;
  selectedEpic: Epic | null;
  employees: Employee[];
  onBackToEpics: () => void;
}

export default function TasksManagement({ 
  selectedProject, 
  selectedEpic, 
  employees, 
  onBackToEpics 
}: TasksManagementProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // --- Search and Filter State for Tasks ---
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("");

  // --- Task Form State ---
  const [taskFormData, setTaskFormData] = useState({
    summary: "",
    description: "",
    issueType: "Story" as "Story" | "Task" | "Bug",
    status: "Backlog" as "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked",
    priority: "Medium" as "Lowest" | "Low" | "Medium" | "High" | "Highest",
    assigneeIds: [] as string[],
    reporterIds: [] as string[],
    storyPoints: 5,
    labels: [] as string[],
    currentLabel: "",
    dueDate: "",
    duration: 7,
    estimatedHours: 0,
    actualHours: 0,
    completion: 0,
  });

  // --- View Mode State ---
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  
  // --- Comments & Attachments State ---
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [uploadingComment, setUploadingComment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  // --- Attachment Viewer State ---
  const [viewingAttachment, setViewingAttachment] = useState<TaskAttachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>("");

  // Calculate task progress based on subtasks
  const calculateTaskProgress = useCallback((task: Task): number => {
    if (task.subtasks && task.subtasks.length > 0) {
      // Calculate based on subtask completion
      const totalSubtasks = task.subtasks.length;
      const completedSubtasks = task.subtasks.filter(sub => sub.status === "Done").length;
      const inProgressSubtasks = task.subtasks.filter(sub => sub.status === "In Progress").length;
      
      // Weighted calculation: Done = 100%, In Progress = 50%, Todo = 0%
      const weightedProgress = (completedSubtasks * 100 + inProgressSubtasks * 50) / totalSubtasks;
      return Math.round(weightedProgress);
    }
    
    // Use existing completion if available
    if (task.completion !== undefined) {
      return task.completion;
    }
    
    // Fallback to status-based progress
    switch (task.status) {
      case "Done": return 100;
      case "Review": return 75;
      case "In Progress": return 50;
      case "Todo": return 25;
      case "Backlog": return 0;
      case "Blocked": return 0;
      default: return 0;
    }
  }, []);

  // Calculate subtask statistics
  const calculateSubtaskStatistics = useCallback((subtasks: Subtask[] = []) => {
    if (subtasks.length === 0) {
      return {
        total: 0,
        done: 0,
        inProgress: 0,
        todo: 0,
        overallProgress: 0
      };
    }
    
    const done = subtasks.filter(s => s.status === "Done").length;
    const inProgress = subtasks.filter(s => s.status === "In Progress").length;
    const todo = subtasks.filter(s => s.status === "Todo").length;
    
    // Calculate weighted progress
    const overallProgress = Math.round((done * 100 + inProgress * 50 + todo * 0) / subtasks.length);
    
    return {
      total: subtasks.length,
      done,
      inProgress,
      todo,
      overallProgress
    };
  }, []);

  // Fetch comments for a specific task
  const fetchTaskComments = async (taskId: string) => {
    if (!taskId) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Comments API returned 401, trying public access...');
          setTaskComments([]);
          return;
        }
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Comments API response:', data);
      
      let commentsArray: any[] = [];
      
      if (Array.isArray(data)) {
        commentsArray = data;
      } else if (data && Array.isArray(data.data)) {
        commentsArray = data.data;
      } else if (data && Array.isArray(data.comments)) {
        commentsArray = data.comments;
      } else if (data && data.success && Array.isArray(data.data)) {
        commentsArray = data.data;
      } else if (data && data.success && Array.isArray(data.comments)) {
        commentsArray = data.comments;
      } else if (data && data.comment) {
        commentsArray = [data.comment];
      }
      
      // Process comments to ensure they have proper structure
      const processedComments: TaskComment[] = commentsArray.map(comment => {
        const employee = employees.find(emp => emp._id === comment.userId);
        const content = comment.content || comment.text || '';
        
        // Process attachments if present
        let attachments: TaskAttachment[] = [];
        if (comment.attachments && Array.isArray(comment.attachments)) {
          attachments = comment.attachments.map((att: any) => {
            const attachment: TaskAttachment = {
              _id: att._id || att.id || `att-${Date.now()}`,
              id: att.id || att._id,
              fileName: att.fileName || att.name || 'unnamed_file',
              url: att.url || att.fileUrl || '',
              fileUrl: att.fileUrl || att.url,
              size: att.size || att.fileSize,
              fileSize: att.size || att.fileSize,
              fileType: att.fileType || att.mimeType || 'application/octet-stream',
              mimeType: att.mimeType || att.fileType,
              uploadedBy: att.uploadedBy || att.uploadedById,
              uploadedById: att.uploadedById,
              uploadedByName: att.uploadedByName || att.uploadedBy || 'Unknown',
              uploadedAt: att.uploadedAt || att.createdAt,
              createdAt: att.createdAt || att.uploadedAt || new Date().toISOString(),
              taskId: taskId,
              commentId: comment._id
            };
            return attachment;
          });
        }
        
        return {
          _id: comment._id || comment.id,
          userId: comment.userId,
          userName: comment.userName || employee?.name || 'Unknown',
          userEmail: comment.userEmail || employee?.email,
          userRole: comment.userRole || employee?.role,
          content: content,
          text: content,
          attachments: attachments,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt || comment.createdAt
        };
      });
      
      console.log('Processed comments with attachments:', processedComments);
      setTaskComments(processedComments);
      
      // Also extract attachments from comments for the attachments section
      const allAttachments: TaskAttachment[] = [];
      processedComments.forEach(comment => {
        if (comment.attachments && comment.attachments.length > 0) {
          allAttachments.push(...comment.attachments);
        }
      });
      
      // Remove duplicates based on _id or url
      const uniqueAttachments = allAttachments.filter((att, index, self) =>
        index === self.findIndex((t) => (
          t._id === att._id || 
          t.url === att.url ||
          (t.fileName === att.fileName && t.createdAt === att.createdAt)
        ))
      );
      
      console.log('All unique attachments:', uniqueAttachments);
      setTaskAttachments(uniqueAttachments);
      
    } catch (err: any) {
      console.error("Failed to fetch comments:", err);
      setMessage("❌ Failed to load comments and attachments");
      setTaskComments([]);
      setTaskAttachments([]);
    } finally {
      setLoadingComments(false);
      setLoadingAttachments(false);
    }
  };

  // Alternative: Fetch attachments directly if there's a separate endpoint
  const fetchAttachmentsDirectly = async (taskId: string) => {
    if (!taskId) return;
    
    setLoadingAttachments(true);
    try {
      // Try direct attachments endpoint if it exists
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct attachments API response:', data);
        
        let attachmentsArray: any[] = [];
        
        if (Array.isArray(data)) {
          attachmentsArray = data;
        } else if (data && Array.isArray(data.data)) {
          attachmentsArray = data.data;
        } else if (data && Array.isArray(data.attachments)) {
          attachmentsArray = data.attachments;
        } else if (data && data.success && Array.isArray(data.data)) {
          attachmentsArray = data.data;
        }
        
        const processedAttachments: TaskAttachment[] = attachmentsArray.map((att: any) => ({
          _id: att._id || att.id || `att-${Date.now()}`,
          id: att.id || att._id,
          fileName: att.fileName || att.name || 'unnamed_file',
          url: att.url || att.fileUrl || '',
          fileUrl: att.fileUrl || att.url,
          size: att.size || att.fileSize,
          fileSize: att.size || att.fileSize,
          fileType: att.fileType || att.mimeType || 'application/octet-stream',
          mimeType: att.mimeType || att.fileType,
          uploadedBy: att.uploadedBy || att.uploadedById,
          uploadedById: att.uploadedById,
          uploadedByName: att.uploadedByName || att.uploadedBy || 'Unknown',
          uploadedAt: att.uploadedAt || att.createdAt,
          createdAt: att.createdAt || att.uploadedAt || new Date().toISOString(),
          taskId: taskId,
          commentId: att.commentId
        }));
        
        console.log('Directly fetched attachments:', processedAttachments);
        setTaskAttachments(processedAttachments);
      } else if (response.status === 404 || response.status === 401) {
        console.log('Direct attachments endpoint not available, using comments as fallback');
        // Fallback to comments-based attachments
        fetchTaskComments(taskId);
      } else {
        throw new Error(`Direct attachments failed: ${response.status}`);
      }
    } catch (err: any) {
      console.error("Failed to fetch attachments directly:", err);
      console.log('Falling back to comments-based attachments');
      // Fallback to comments-based attachments
      fetchTaskComments(taskId);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Handle file selection for comment attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  // Remove selected file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit new comment with attachments
  const handleSubmitComment = async (taskId: string) => {
    const commentText = newComment.trim();
    if (!commentText && selectedFiles.length === 0) return;
    
    setUploadingComment(true);
    try {
      const currentEmployee = employees[0] || { _id: 'unknown', name: 'Anonymous', role: 'User' };
      
      const formData = new FormData();
      formData.append('text', commentText);
      
      // Add auth headers through form data
      formData.append('userId', currentEmployee._id);
      formData.append('userName', currentEmployee.name);
      formData.append('userRole', currentEmployee.role || 'User');
      
      // Append files
      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to post comment: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Comment posted:', data);

      // Refresh comments and attachments
      await fetchTaskComments(taskId);
      
      // Clear form
      setNewComment('');
      setSelectedFiles([]);
      
      setMessage("✅ Comment added successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setMessage(`❌ Failed to post comment: ${err.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploadingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      const currentEmployee = employees[0] || { _id: 'unknown', name: 'Anonymous', role: 'User' };
      
      const response = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentEmployee._id,
          'x-user-name': currentEmployee.name,
          'x-user-role': currentEmployee.role || 'User'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.status}`);
      }

      // Refresh comments and attachments
      await fetchTaskComments(taskId);
      
      setMessage("✅ Comment deleted successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Failed to delete comment:", err);
      setMessage("❌ Failed to delete comment");
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Delete an attachment
  const handleDeleteAttachment = async (taskId: string, attachmentId: string, commentId?: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    
    try {
      const currentEmployee = employees[0] || { _id: 'unknown', name: 'Anonymous', role: 'User' };
      
      // Try direct attachment deletion endpoint first
      let response;
      let url;
      
      if (commentId) {
        // Delete attachment from comment
        url = `/api/tasks/${taskId}/comments?commentId=${commentId}&attachmentId=${attachmentId}`;
      } else {
        // Try direct attachment endpoint
        url = `/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`;
      }
      
      response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentEmployee._id,
          'x-user-name': currentEmployee.name,
          'x-user-role': currentEmployee.role || 'User'
        }
      });

      if (!response.ok) {
        // Try alternative endpoint
        const altUrl = `/api/tasks/${taskId}/attachments/${attachmentId}`;
        response = await fetch(altUrl, {
          method: 'DELETE',
          headers: {
            'x-user-id': currentEmployee._id,
            'x-user-name': currentEmployee.name,
            'x-user-role': currentEmployee.role || 'User'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete attachment: ${response.status}`);
        }
      }

      // Refresh attachments
      await fetchTaskComments(taskId);
      
      setMessage("✅ Attachment deleted successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Failed to delete attachment:", err);
      setMessage("❌ Failed to delete attachment");
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // View attachment (open in new tab or modal)
  const handleViewAttachment = (attachment: TaskAttachment) => {
    if (!attachment.url) {
      setMessage("❌ No URL available for this file");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // For images and PDFs, we can show in a modal
    const fileType = attachment.fileType || attachment.mimeType || '';
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType.includes('pdf');
    
    if (isImage || isPDF) {
      // Open in a modal for better viewing experience
      setViewingAttachment(attachment);
      setViewerUrl(attachment.url);
    } else {
      // For other file types, open in new tab
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Close attachment viewer modal
  const closeAttachmentViewer = () => {
    setViewingAttachment(null);
    setViewerUrl("");
  };

  // Download attachment
  const handleDownloadAttachment = (attachment: TaskAttachment) => {
    if (!attachment.url) {
      setMessage("❌ No download URL available for this file");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMessage(`⬇️ Downloading ${attachment.fileName}...`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Toggle comment expansion
  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Format file size
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string | undefined): React.ReactElement => {
    if (!fileType) return <File size={16} className="text-gray-500" />;
    
    const type = fileType.toLowerCase();
    
    if (type.startsWith('image/')) {
      return <Image size={16} className="text-blue-500" />;
    } else if (type.includes('pdf')) {
      return <FileText size={16} className="text-red-500" />;
    } else if (type.includes('word') || type.includes('doc') || type.includes('docx')) {
      return <FileText size={16} className="text-blue-600" />;
    } else if (type.includes('excel') || type.includes('xls') || type.includes('csv')) {
      return <FileText size={16} className="text-green-600" />;
    } else if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('7z')) {
      return <File size={16} className="text-orange-500" />;
    } else if (type.includes('text/') || type.includes('txt')) {
      return <FileText size={16} className="text-gray-600" />;
    } else if (type.includes('json') || type.includes('xml')) {
      return <FileText size={16} className="text-purple-500" />;
    } else if (type.includes('video/')) {
      return <File size={16} className="text-purple-600" />;
    } else if (type.includes('audio/')) {
      return <File size={16} className="text-yellow-600" />;
    } else {
      return <File size={16} className="text-gray-500" />;
    }
  };

  // Get file type display name
  const getFileTypeDisplay = (fileType: string | undefined) => {
    if (!fileType) return 'File';
    
    const type = fileType.toLowerCase();
    
    if (type.startsWith('image/')) {
      return 'Image';
    } else if (type.includes('pdf')) {
      return 'PDF';
    } else if (type.includes('word') || type.includes('doc')) {
      return 'Word';
    } else if (type.includes('excel') || type.includes('xls')) {
      return 'Excel';
    } else if (type.includes('zip') || type.includes('rar')) {
      return 'Archive';
    } else if (type.includes('text/')) {
      return 'Text';
    } else if (type.includes('video/')) {
      return 'Video';
    } else if (type.includes('audio/')) {
      return 'Audio';
    } else if (type.includes('json')) {
      return 'JSON';
    } else if (type.includes('xml')) {
      return 'XML';
    } else {
      return fileType.split('/')[1] || 'File';
    }
  };

  // Check if file type is viewable in browser
  const isViewableInBrowser = (fileType: string | undefined) => {
    if (!fileType) return false;
    
    const type = fileType.toLowerCase();
    return (
      type.startsWith('image/') ||
      type.includes('pdf') ||
      type.includes('text/') ||
      type.includes('json') ||
      type.includes('xml') ||
      type.includes('html')
    );
  };

  // Fetch tasks with all subtasks and assignee details
  const fetchTasks = async (epicId: string) => {
    if (!epicId) return;
    
    setLoadingTasks(true);
    try {
      let response;
      let data;
      
      try {
        response = await fetch(`/api/tasks?epicId=${epicId}&includeSubtasks=true&populateAssignees=true`);
        if (!response.ok) throw new Error(`Tasks endpoint failed: ${response.status}`);
        data = await response.json();
      } catch (err) {
        console.log('Tasks endpoint failed, trying projects endpoint...');
        if (selectedProject) {
          response = await fetch(`/api/projects/${selectedProject._id}/tasks?includeSubtasks=true&populateAssignees=true`);
          if (!response.ok) throw new Error(`Projects endpoint failed: ${response.status}`);
          data = await response.json();
        } else {
          throw new Error('No project selected');
        }
      }
      
      console.log('Tasks API response:', data);
      
      let tasksArray: Task[] = [];
      
      if (Array.isArray(data)) {
        tasksArray = data;
      } else if (data && Array.isArray(data.data)) {
        tasksArray = data.data;
      } else if (data && Array.isArray(data.tasks)) {
        tasksArray = data.tasks;
      } else if (data && data.success && Array.isArray(data.data)) {
        tasksArray = data.data;
      } else if (data && data.task) {
        tasksArray = [data.task];
      }
      
      if (selectedEpic && (!data || !data.data || !Array.isArray(data.data))) {
        tasksArray = tasksArray.filter(task => task.epicId === epicId);
      }
      
      // Ensure subtasks and assignee info are properly populated
      tasksArray = tasksArray.map(task => {
        // Ensure assigneeNames exist
        let assigneeNames = task.assigneeNames || [];
        if (!assigneeNames.length && task.assigneeIds?.length > 0) {
          assigneeNames = employees
            .filter(emp => task.assigneeIds.includes(emp._id))
            .map(emp => emp.name);
        }
        
        // Ensure reporterNames exist
        let reporterNames = task.reporterNames || [];
        if (!reporterNames.length && task.reporterIds?.length > 0) {
          reporterNames = employees
            .filter(emp => task.reporterIds.includes(emp._id))
            .map(emp => emp.name);
        }
        
        // Ensure subtasks have assignee info
        let subtasks = task.subtasks || [];
        subtasks = subtasks.map(subtask => {
          // If subtask doesn't have assigneeName, try to get it from employees
          if (!subtask.assigneeName && subtask.assigneeId) {
            const assignee = employees.find(emp => emp._id === subtask.assigneeId);
            if (assignee) {
              return {
                ...subtask,
                assigneeName: assignee.name
              };
            }
          }
          return subtask;
        });
        
        // Calculate task progress
        const completion = calculateTaskProgress({ ...task, subtasks });
        
        return {
          ...task,
          assigneeNames,
          reporterNames,
          subtasks,
          issueKey: task.issueKey || task.taskId || `TASK-${task._id?.substring(0, 8)}`,
          completion // Add calculated completion
        };
      });
      
      console.log('Processed tasks with assignee info:', tasksArray);
      setTasks(tasksArray);
    } catch (err: any) {
      console.error("Failed to fetch tasks:", err);
      setMessage("❌ Failed to load tasks");
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Update task status
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task._id === taskId 
            ? { ...task, status: newStatus as any, completion: calculateTaskProgress({ ...task, status: newStatus as any }) }
            : task
        ));
        setMessage("✅ Task status updated!");
      } else {
        throw new Error('Failed to update task status');
      }
    } catch (err) {
      setMessage("❌ Failed to update task status");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Update subtask status
  const handleSubtaskStatusChange = async (taskId: string, subtaskId: string | null, newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setTasks(prev => prev.map(task => {
          if (task._id === taskId) {
            const updatedSubtasks = task.subtasks?.map(sub => 
              sub._id === subtaskId ? { ...sub, status: newStatus as any } : sub
            ) || [];
            
            // Recalculate task progress
            const completion = calculateTaskProgress({ ...task, subtasks: updatedSubtasks });
            
            return {
              ...task,
              subtasks: updatedSubtasks,
              completion
            };
          }
          return task;
        }));
        
        setMessage("✅ Subtask status updated!");
      } else {
        throw new Error('Failed to update subtask status');
      }
    } catch (err) {
      setMessage("❌ Failed to update subtask status");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    if (selectedEpic) {
      fetchTasks(selectedEpic._id);
    } else {
      setTasks([]);
    }
  }, [selectedEpic, employees]);

  // When viewing a task, fetch its comments and attachments
  useEffect(() => {
    if (viewTaskId && isViewMode) {
      // First try to fetch attachments directly
      fetchAttachmentsDirectly(viewTaskId);
      // Also fetch comments separately
      fetchTaskComments(viewTaskId);
    } else {
      setTaskComments([]);
      setTaskAttachments([]);
    }
  }, [viewTaskId, isViewMode]);

  const handleTaskSubmit = async () => {
    if (!selectedProject || !selectedEpic || !taskFormData.summary.trim()) {
      setMessage("❌ Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const selectedAssignees = employees.filter(emp => 
        taskFormData.assigneeIds.includes(emp._id)
      );
      const selectedReporters = employees.filter(emp => 
        taskFormData.reporterIds.includes(emp._id)
      );

      const assigneeNames = selectedAssignees.map(emp => emp.name);
      const reporterNames = selectedReporters.map(emp => emp.name);
      const assigneeEmails = selectedAssignees.map(emp => emp.email || "");
      const reporterEmails = selectedReporters.map(emp => emp.email || "");
      const assigneeRoles = selectedAssignees.map(emp => emp.role || "Employee");
      const reporterRoles = selectedReporters.map(emp => emp.role || "Employee");

      let url, method, response, data;
      
      if (editingTaskId) {
        url = `/api/tasks/${editingTaskId}`;
        method = "PUT";
        
        response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...taskFormData,
            assigneeNames: assigneeNames,
            reporterNames: reporterNames,
            assigneeEmails: assigneeEmails,
            reporterEmails: reporterEmails,
            assigneeRoles: assigneeRoles,
            reporterRoles: reporterRoles,
            epicId: selectedEpic._id,
            epicName: selectedEpic.name,
            projectId: selectedProject._id,
            projectName: selectedProject.name,
            completion: taskFormData.completion || 0,
          }),
        });
        
        data = await response.json();
      } else {
        const taskPayload = {
          ...taskFormData,
          assigneeNames: assigneeNames,
          reporterNames: reporterNames,
          assigneeEmails: assigneeEmails,
          reporterEmails: reporterEmails,
          assigneeRoles: assigneeRoles,
          reporterRoles: reporterRoles,
          epicId: selectedEpic._id,
          epicName: selectedEpic.name,
          projectId: selectedProject._id,
          projectName: selectedProject.name,
          projectKey: selectedProject.key,
          createdBy: employees.length > 0 ? employees[0]._id : "",
          completion: 0, // Start with 0 completion
        };
        
        try {
          response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskPayload),
          });
          
          if (!response.ok) throw new Error(`Tasks endpoint failed: ${response.status}`);
          data = await response.json();
        } catch (err) {
          console.log('Tasks endpoint failed, trying projects endpoint...');
          response = await fetch(`/api/projects/${selectedProject._id}/tasks`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskPayload),
          });
          
          data = await response.json();
        }
      }
      
      if (response.ok) {
        setMessage(editingTaskId ? "✅ Task updated successfully!" : "✅ Task created successfully!");
        
        // Reset form with Backlog as default status
        setTaskFormData({
          summary: "",
          description: "",
          issueType: "Story",
          status: "Backlog",
          priority: "Medium",
          assigneeIds: [],
          reporterIds: employees.length > 0 ? [employees[0]._id] : [],
          storyPoints: 5,
          labels: [],
          currentLabel: "",
          dueDate: "",
          duration: 7,
          estimatedHours: 0,
          actualHours: 0,
          completion: 0,
        });
        
        await fetchTasks(selectedEpic._id);
        setShowTaskForm(false);
        setEditingTaskId(null);
      } else {
        setMessage(`❌ ${data.error || data.message || "Failed to save task"}`);
      }
    } catch (err: any) {
      console.error('Task submission error:', err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskFormData({
      summary: task.summary || "",
      description: task.description || "",
      issueType: task.issueType || "Story",
      status: task.status || "Backlog",
      priority: task.priority || "Medium",
      assigneeIds: task.assigneeIds || [],
      reporterIds: task.reporterIds || [],
      storyPoints: task.storyPoints || 5,
      labels: task.labels || [],
      currentLabel: "",
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : "",
      duration: task.duration || 7,
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      completion: task.completion || 0,
    });
    setEditingTaskId(task._id);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("✅ Task deleted successfully!");
        await fetchTasks(selectedEpic!._id);
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error || "Failed to delete task"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleViewTask = (task: Task) => {
    setViewTaskId(task._id);
    setIsViewMode(true);
  };

  const getViewTask = () => {
    return tasks.find(task => task._id === viewTaskId);
  };

  const generateIssueKey = () => {
    if (editingTaskId) {
      const task = tasks.find(t => t._id === editingTaskId);
      return task?.issueKey || "";
    }
    
    const projectKey = selectedProject?.key || "PROJ";
    const taskNumber = tasks.length + 1;
    return `${projectKey}-${taskNumber.toString().padStart(3, '0')}`;
  };

  const viewTask = getViewTask();

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 flex-1 flex flex-col">
        {!showTaskForm ? (
          <TasksList
            selectedProject={selectedProject}
            selectedEpic={selectedEpic}
            employees={employees}
            tasks={tasks}
            loadingTasks={loadingTasks}
            onBackToEpics={onBackToEpics}
            onNewTask={() => {
              setShowTaskForm(true);
              setEditingTaskId(null);
              setTaskFormData({
                summary: "",
                description: "",
                issueType: "Story",
                status: "Backlog",
                priority: "Medium",
                assigneeIds: [],
                reporterIds: employees.length > 0 ? [employees[0]._id] : [],
                storyPoints: 5,
                labels: [],
                currentLabel: "",
                dueDate: "",
                duration: 7,
                estimatedHours: 0,
                actualHours: 0,
                completion: 0,
              });
            }}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onViewTask={handleViewTask}
            taskSearchQuery={taskSearchQuery}
            setTaskSearchQuery={setTaskSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            issueTypeFilter={issueTypeFilter}
            setIssueTypeFilter={setIssueTypeFilter}
            calculateTaskProgress={calculateTaskProgress}
            calculateSubtaskStatistics={calculateSubtaskStatistics}
          />
        ) : (
          <TaskForm
            selectedProject={selectedProject!}
            selectedEpic={selectedEpic!}
            employees={employees}
            editingTaskId={editingTaskId}
            taskFormData={taskFormData}
            loading={loading}
            onBack={() => {
              setShowTaskForm(false);
              setEditingTaskId(null);
            }}
            onSubmit={handleTaskSubmit}
            onFormDataChange={setTaskFormData}
            generateIssueKey={generateIssueKey}
          />
        )}

        {/* Task Details Modal */}
        {isViewMode && viewTask && (
          <TaskDetailsModal
            task={viewTask}
            selectedProject={selectedProject!}
            selectedEpic={selectedEpic!}
            employees={employees}
            taskComments={taskComments}
            taskAttachments={taskAttachments}
            loadingComments={loadingComments}
            loadingAttachments={loadingAttachments}
            newComment={newComment}
            setNewComment={setNewComment}
            selectedFiles={selectedFiles}
            uploadingComment={uploadingComment}
            expandedComments={expandedComments}
            onClose={() => {
              setIsViewMode(false);
              setViewTaskId(null);
              setTaskComments([]);
              setTaskAttachments([]);
              setNewComment('');
              setSelectedFiles([]);
              setExpandedComments(new Set());
            }}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onSubmitComment={() => handleSubmitComment(viewTask._id)}
            onFileSelect={handleFileSelect}
            onRemoveFile={handleRemoveFile}
            onDeleteComment={(commentId) => handleDeleteComment(viewTask._id, commentId)}
            onDeleteAttachment={(attachmentId, commentId) => handleDeleteAttachment(viewTask._id, attachmentId, commentId)}
            onViewAttachment={handleViewAttachment}
            onDownloadAttachment={handleDownloadAttachment}
            onToggleCommentExpansion={toggleCommentExpansion}
            calculateTaskProgress={calculateTaskProgress}
            calculateSubtaskStatistics={calculateSubtaskStatistics}
            formatFileSize={formatFileSize}
            getFileIcon={getFileIcon}
            getFileTypeDisplay={getFileTypeDisplay}
            isViewableInBrowser={isViewableInBrowser}
            viewingAttachment={viewingAttachment}
            viewerUrl={viewerUrl}
            onCloseAttachmentViewer={closeAttachmentViewer}
          />
        )}

        {/* Message Toast */}
        {message && (
          <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-xl text-sm font-bold animate-fade-in z-50 ${
            message.includes("✅") 
              ? "bg-green-100 text-green-800 border border-green-200" 
              : message.includes("❌")
              ? "bg-red-100 text-red-800 border border-red-200"
              : message.includes("⬇️")
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}