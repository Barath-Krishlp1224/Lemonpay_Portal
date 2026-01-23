"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  FileText, PlusCircle, Edit2, Trash2, ArrowLeft, Check,
  Tag, X, Search, Calendar, Filter, Clock, Flag, 
  CalendarDays, Hash, BarChart3, Target, Users,
  AlertCircle, CheckCircle, Clock as ClockIcon, BookOpen,
  GitBranch, MessageSquare, Paperclip, Eye, EyeOff,
  ChevronDown, ChevronUp, MoreVertical, ExternalLink,
  User, AlertTriangle, Bug, ClipboardCheck, Bookmark,
  Archive, Layers, BarChart, PieChart, ListTree,
  UserCircle, Mail, Phone, Briefcase, MapPin,
  CheckSquare, Square, Upload, Image, File, Download,
  Maximize2
} from "lucide-react";
import type { Employee, SavedProject, Task as TaskType, Epic } from "@/app/types/project";

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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
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

  // --- Missing Functions ---
  const handleAddLabel = useCallback(() => {
    if (taskFormData.currentLabel.trim() && !taskFormData.labels.includes(taskFormData.currentLabel.trim())) {
      setTaskFormData(prev => ({
        ...prev,
        labels: [...prev.labels, prev.currentLabel.trim()],
        currentLabel: ""
      }));
    }
  }, [taskFormData.currentLabel, taskFormData.labels]);

  const handleRemoveLabel = useCallback((label: string) => {
    setTaskFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  }, []);

  const handleLabelKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  }, [handleAddLabel]);

  const handleAssigneeToggle = useCallback((employeeId: string) => {
    setTaskFormData(prev => {
      const currentAssigneeIds = [...prev.assigneeIds];
      if (currentAssigneeIds.includes(employeeId)) {
        return {
          ...prev,
          assigneeIds: currentAssigneeIds.filter(id => id !== employeeId)
        };
      } else {
        return {
          ...prev,
          assigneeIds: [...currentAssigneeIds, employeeId]
        };
      }
    });
  }, []);

  const handleReporterToggle = useCallback((employeeId: string) => {
    setTaskFormData(prev => {
      const currentReporterIds = [...prev.reporterIds];
      if (currentReporterIds.includes(employeeId)) {
        return {
          ...prev,
          reporterIds: currentReporterIds.filter(id => id !== employeeId)
        };
      } else {
        return {
          ...prev,
          reporterIds: [...currentReporterIds, employeeId]
        };
      }
    });
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
  const getFileIcon = (fileType: string | undefined) => {
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
        
        return {
          ...task,
          assigneeNames,
          reporterNames,
          subtasks,
          issueKey: task.issueKey || task.taskId || `TASK-${task._id?.substring(0, 8)}`
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

  const filteredTasks = useMemo(() => {
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    
    return tasksArray.filter((task) => {
      if (!task) return false;
      
      const summary = task.summary || "";
      const taskId = task.taskId || "";
      const issueKey = task.issueKey || "";
      
      const matchesSearch = 
        summary.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        taskId.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        issueKey.toLowerCase().includes(taskSearchQuery.toLowerCase());
      
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
      const matchesIssueType = issueTypeFilter ? task.issueType === issueTypeFilter : true;

      return matchesSearch && matchesStatus && matchesPriority && matchesIssueType;
    });
  }, [tasks, taskSearchQuery, statusFilter, priorityFilter, issueTypeFilter]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Highest": return "bg-red-100 text-red-800 border border-red-200";
      case "High": return "bg-orange-100 text-orange-800 border border-orange-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Low": return "bg-green-100 text-green-800 border border-green-200";
      case "Lowest": return "bg-blue-100 text-blue-800 border border-blue-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 text-green-800 border border-green-200";
      case "In Progress": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Review": return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Todo": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Backlog": return "bg-gray-100 text-gray-800 border border-gray-200";
      case "Blocked": return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getSubtaskStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 text-green-800 border border-green-200";
      case "In Progress": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Todo": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getIssueTypeColor = (issueType: string) => {
    switch(issueType) {
      case "Story": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Task": return "bg-green-100 text-green-800 border border-green-200";
      case "Bug": return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    switch(issueType) {
      case "Story": return <BookOpen size={10} />;
      case "Task": return <ClipboardCheck size={10} />;
      case "Bug": return <Bug size={10} />;
      default: return <FileText size={10} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Done": return <CheckCircle size={10} />;
      case "In Progress": return <ClockIcon size={10} />;
      case "Review": return <Eye size={10} />;
      case "Todo": return <Bookmark size={10} />;
      case "Backlog": return <Archive size={10} />;
      case "Blocked": return <AlertTriangle size={10} />;
      default: return <Bookmark size={10} />;
    }
  };

  const getSubtaskStatusIcon = (status: string) => {
    switch(status) {
      case "Done": return <CheckCircle size={12} />;
      case "In Progress": return <ClockIcon size={12} />;
      case "Todo": return <Bookmark size={12} />;
      default: return <Bookmark size={12} />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "Highest": return <AlertTriangle size={10} />;
      case "High": return <Flag size={10} />;
      case "Medium": return <BarChart3 size={10} />;
      case "Low": return <ArrowLeft size={10} />;
      case "Lowest": return <ArrowLeft size={10} />;
      default: return <BarChart3 size={10} />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getSelectedAssignees = () => {
    return employees.filter(emp => taskFormData.assigneeIds.includes(emp._id));
  };

  const getSelectedReporters = () => {
    return employees.filter(emp => taskFormData.reporterIds.includes(emp._id));
  };

  const getTaskAssignees = (task: Task) => {
    const assigneeIds = task.assigneeIds || [];
    const assigneeNames = task.assigneeNames || [];
    
    // If we have assigneeNames but want full employee info, try to match
    if (assigneeNames.length > 0 && assigneeIds.length === 0) {
      return assigneeNames.map((name, index) => ({
        _id: `assignee-${index}`,
        name: name,
        email: task.assigneeEmails?.[index] || "",
        role: task.assigneeRoles?.[index] || "Employee",
        department: "",
        status: "active"
      }));
    }
    
    return employees.filter(emp => assigneeIds.includes(emp._id));
  };

  const getTaskReporters = (task: Task) => {
    const reporterIds = task.reporterIds || [];
    const reporterNames = task.reporterNames || [];
    
    // If we have reporterNames but want full employee info, try to match
    if (reporterNames.length > 0 && reporterIds.length === 0) {
      return reporterNames.map((name, index) => ({
        _id: `reporter-${index}`,
        name: name,
        email: task.reporterEmails?.[index] || "",
        role: task.reporterRoles?.[index] || "Employee",
        department: "",
        status: "active"
      }));
    }
    
    return employees.filter(emp => reporterIds.includes(emp._id));
  };

  const getTaskAssigneeDisplay = (task: Task) => {
    if (task.assigneeNames && task.assigneeNames.length > 0) {
      return task.assigneeNames;
    }
    return getTaskAssignees(task).map(emp => emp.name);
  };

  const getTaskReporterDisplay = (task: Task) => {
    if (task.reporterNames && task.reporterNames.length > 0) {
      return task.reporterNames;
    }
    return getTaskReporters(task).map(emp => emp.name);
  };

  const getViewTask = () => {
    return tasks.find(task => task._id === viewTaskId);
  };

  // Calculate subtask progress statistics
  const calculateSubtaskProgress = (subtasks: Subtask[] = []) => {
    if (subtasks.length === 0) {
      return { total: 0, done: 0, inProgress: 0, todo: 0, overallProgress: 0 };
    }
    
    const done = subtasks.filter(s => s.status === "Done").length;
    const inProgress = subtasks.filter(s => s.status === "In Progress").length;
    const todo = subtasks.filter(s => s.status === "Todo").length;
    const overallProgress = Math.round((done / subtasks.length) * 100);
    
    return {
      total: subtasks.length,
      done,
      inProgress,
      todo,
      overallProgress
    };
  };

  // Calculate task progress based on subtasks or status
  const calculateTaskProgress = (task: Task) => {
    if (task.subtasks && task.subtasks.length > 0) {
      return calculateSubtaskProgress(task.subtasks).overallProgress;
    }
    
    // Fallback to status-based progress
    switch (task.status) {
      case "Done": return 100;
      case "Review": return 75;
      case "In Progress": return 50;
      case "Todo": return 10;
      case "Backlog": return 0;
      case "Blocked": return 0;
      default: return 0;
    }
  };

  // Get employee details by ID
  const getEmployeeById = (id: string) => {
    return employees.find(emp => emp._id === id);
  };

  if (!selectedProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl">
        <FileText className="text-slate-300 mb-4" size={48} />
        <p className="text-slate-400 font-bold mb-2">Select a project first</p>
        <p className="text-slate-400 text-sm text-center">Tasks will appear here</p>
      </div>
    );
  }

  if (!selectedEpic) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-xl">
        <Target className="text-slate-300 mb-4" size={48} />
        <p className="text-slate-400 font-bold mb-2">Select an epic to view tasks</p>
        <button
          onClick={onBackToEpics}
          className="px-4 py-2 bg-[#3fa87d] hover:bg-[#35946d] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 mt-4"
        >
          <ArrowLeft size={14} /> Back to Epics
        </button>
      </div>
    );
  }

  const generateIssueKey = () => {
    if (editingTaskId) {
      const task = tasks.find(t => t._id === editingTaskId);
      return task?.issueKey || "";
    }
    
    const projectKey = selectedProject.key;
    const taskNumber = tasks.length + 1;
    return `${projectKey}-${taskNumber.toString().padStart(3, '0')}`;
  };

  const viewTask = getViewTask();

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={onBackToEpics}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Epics"
              >
                <ArrowLeft size={16} className="text-slate-500" />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Tasks Management</h2>
            </div>
            <div className="flex items-center gap-3 ml-7">
              <div className="px-2 py-1 bg-slate-100 rounded-lg">
                <span className="text-xs font-bold text-slate-600">{selectedEpic.epicId}</span>
              </div>
              <span className="text-xs text-slate-500 truncate max-w-xs">{selectedEpic.name}</span>
            </div>
          </div>
          {!showTaskForm && (
            <button
              onClick={() => {
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
                });
              }}
              className="px-4 py-2 bg-[#3fa87d] hover:bg-[#35946d] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <PlusCircle size={14} /> New Task or Bug
            </button>
          )}
        </div>

        {!showTaskForm ? (
          <div className="flex-1 flex flex-col">
            {/* Tasks Search & Filter Bar */}
            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search tasks by summary or ID..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all appearance-none"
                  >
                    <option value="">All Status</option>
                    <option value="Backlog">Backlog</option>
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all appearance-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="Lowest">Lowest</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Highest">Highest</option>
                  </select>
                </div>
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={issueTypeFilter}
                    onChange={(e) => setIssueTypeFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all appearance-none"
                  >
                    <option value="">All Types</option>
                    <option value="Story">Story</option>
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                  </select>
                </div>
              </div>
              {(statusFilter || priorityFilter || issueTypeFilter || taskSearchQuery) && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setPriorityFilter("");
                      setIssueTypeFilter("");
                      setTaskSearchQuery("");
                    }}
                    className="text-xs font-bold text-[#3fa87d] flex items-center gap-1 hover:text-[#35946d]"
                  >
                    Clear all filters
                  </button>
                  <span className="text-xs text-slate-500">
                    Showing {filteredTasks.length} of {tasks.length} tasks
                  </span>
                </div>
              )}
            </div>

            {/* Tasks List - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3 pb-2">
                {loadingTasks ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3fa87d]"></div>
                    <p className="text-sm text-slate-400 mt-2">Loading tasks...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-400 font-bold mb-2">
                      {tasks.length === 0 ? "No tasks yet for this epic" : "No matching tasks found"}
                    </p>
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="text-[#3fa87d] text-xs font-bold underline hover:text-[#35946d]"
                    >
                      Create your first task
                    </button>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    if (!task) return null;
                    
                    const assigneeNames = getTaskAssigneeDisplay(task);
                    const reporterNames = getTaskReporterDisplay(task);
                    const subtaskProgress = calculateSubtaskProgress(task.subtasks);
                    const taskProgress = calculateTaskProgress(task);
                    
                    return (
                      <div 
                        key={task._id} 
                        className="border-2 border-slate-200 rounded-2xl hover:border-[#3fa87d]/50 transition-colors bg-white cursor-pointer hover:shadow-md"
                        onClick={() => handleViewTask(task)}
                      >
                        {/* Task Header */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-wrap gap-2">
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getIssueTypeColor(task.issueType)}`}>
                                {getIssueTypeIcon(task.issueType)}
                                <span>{task.issueType}</span>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getStatusColor(task.status)}`}>
                                {getStatusIcon(task.status)}
                                <span>{task.status}</span>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)}
                                <span>{task.priority}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}
                                className="p-1 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                title="Edit Task"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task._id);
                                }}
                                className="p-1 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800 mb-1">{task.summary || "No title"}</h4>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                                  {task.issueKey || "No ID"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatDate(task.createdAt)}
                                </span>
                              </div>
                            </div>
                            {task.storyPoints > 0 && (
                              <div className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                                {task.storyPoints} SP
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-700">Progress</span>
                              <span className="text-xs font-bold text-slate-700">{taskProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  taskProgress === 100 ? 'bg-green-500' :
                                  taskProgress >= 50 ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${taskProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Subtasks Summary */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ListTree size={14} className="text-slate-500" />
                                  <span className="text-xs font-bold text-slate-700">Subtasks</span>
                                </div>
                                <span className="text-xs font-bold text-slate-700">{subtaskProgress.overallProgress}%</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Total: {subtaskProgress.total}</span>
                                <span>Done: {subtaskProgress.done}</span>
                                <span>In Progress: {subtaskProgress.inProgress}</span>
                                <span>Todo: {subtaskProgress.todo}</span>
                              </div>
                            </div>
                          )}

                          {/* Assignees and Reporters */}
                          <div className="flex items-start gap-6 text-xs text-slate-600 mb-3">
                            {assigneeNames.length > 0 && (
                              <div>
                                <div className="text-slate-500 mb-1">Assignees:</div>
                                <div className="flex flex-wrap gap-1">
                                  {assigneeNames.map((name, index) => (
                                    <div key={index} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                                      <div className="w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center text-[8px] font-bold">
                                        {name.charAt(0)}
                                      </div>
                                      <span className="font-medium text-[11px]">{name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {reporterNames.length > 0 && (
                              <div>
                                <div className="text-slate-500 mb-1">Reporters:</div>
                                <div className="flex flex-wrap gap-1">
                                  {reporterNames.map((name, index) => (
                                    <div key={index} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                                      <User size={10} className="text-slate-400" />
                                      <span className="font-medium text-[11px]">{name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.labels.map((label, index) => (
                                <div key={index} className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full border border-slate-300">
                                  {label}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Due Date and Duration */}
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  Due: {formatDate(task.dueDate)}
                                </div>
                              )}
                              {task.duration > 0 && (
                                <div className="flex items-center gap-1">
                                  <CalendarDays size={12} />
                                  Duration: {task.duration} days
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare size={12} className="text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {task.comments?.length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Task Creation/Edit Form - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-6 pb-4">
                {/* Form Header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pt-2 pb-4 z-10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowTaskForm(false);
                        setEditingTaskId(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Back to Tasks"
                    >
                      <ArrowLeft size={16} className="text-slate-500" />
                    </button>
                    <h3 className="font-bold text-slate-800">
                      {editingTaskId ? "Edit Task" : "Create New Task"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                      {selectedEpic.epicId}
                    </div>
                    <div className="px-3 py-1 bg-[#3fa87d]/10 text-[#3fa87d] text-xs font-bold rounded-full">
                      {selectedProject.key}
                    </div>
                  </div>
                </div>

                {/* Auto-generated fields display */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Project</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800">
                      {selectedProject.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Epic</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800">
                      {selectedEpic.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Issue Key</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 font-mono">
                      {generateIssueKey()}
                    </div>
                  </div>
                </div>

                {/* Task Form */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                      Summary <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={taskFormData.summary}
                      onChange={(e) => setTaskFormData({...taskFormData, summary: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      placeholder="Brief summary of the task"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
                    <textarea
                      value={taskFormData.description}
                      onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all min-h-[100px] resize-y"
                      placeholder="Detailed description of the task"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Issue Type</label>
                      <div className="relative">
                        <select
                          value={taskFormData.issueType}
                          onChange={(e) => setTaskFormData({...taskFormData, issueType: e.target.value as any})}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all appearance-none"
                        >
                          <option value="Story">Story</option>
                          <option value="Task">Task</option>
                          <option value="Bug">Bug</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Status</label>
                      <div className="relative">
                        <select
                          value={taskFormData.status}
                          onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value as any})}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all appearance-none"
                        >
                          <option value="Backlog">Backlog</option>
                          <option value="Todo">Todo</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Priority</label>
                      <div className="relative">
                        <select
                          value={taskFormData.priority}
                          onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value as any})}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all appearance-none"
                        >
                          <option value="Lowest">Lowest</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Highest">Highest</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assignees Section - Multi-select */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Assignees</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {employees.map(emp => (
                          <button
                            key={emp._id}
                            type="button"
                            onClick={() => handleAssigneeToggle(emp._id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                              taskFormData.assigneeIds.includes(emp._id)
                                ? "bg-[#3fa87d] text-white border-[#3fa87d]"
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#3fa87d]"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              taskFormData.assigneeIds.includes(emp._id)
                                ? "bg-white text-[#3fa87d]"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {emp.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold">{emp.name}</span>
                            {taskFormData.assigneeIds.includes(emp._id) && (
                              <Check size={14} />
                            )}
                          </button>
                        ))}
                      </div>
                      {getSelectedAssignees().length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-2">Selected Assignees:</div>
                          <div className="flex flex-wrap gap-2">
                            {getSelectedAssignees().map(emp => (
                              <div key={emp._id} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                                <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-xs font-bold">
                                  {emp.name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold">{emp.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleAssigneeToggle(emp._id)}
                                  className="ml-2 p-1 hover:bg-slate-200 rounded-lg"
                                >
                                  <X size={12} className="text-slate-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reporters Section - Multi-select */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase">Reporters</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {employees.map(emp => (
                          <button
                            key={emp._id}
                            type="button"
                            onClick={() => handleReporterToggle(emp._id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                              taskFormData.reporterIds.includes(emp._id)
                                ? "bg-[#3fa87d] text-white border-[#3fa87d]"
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#3fa87d]"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              taskFormData.reporterIds.includes(emp._id)
                                ? "bg-white text-[#3fa87d]"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {emp.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold">{emp.name}</span>
                            {taskFormData.reporterIds.includes(emp._id) && (
                              <Check size={14} />
                            )}
                          </button>
                        ))}
                      </div>
                      {getSelectedReporters().length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-2">Selected Reporters:</div>
                          <div className="flex flex-wrap gap-2">
                            {getSelectedReporters().map(emp => (
                              <div key={emp._id} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                                <User size={14} className="text-slate-500" />
                                <span className="text-sm font-bold">{emp.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleReporterToggle(emp._id)}
                                  className="ml-2 p-1 hover:bg-slate-200 rounded-lg"
                                >
                                  <X size={12} className="text-slate-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Story Points</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taskFormData.storyPoints}
                        onChange={(e) => setTaskFormData({...taskFormData, storyPoints: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Duration (days)</label>
                      <input
                        type="number"
                        min="0"
                        value={taskFormData.duration}
                        onChange={(e) => setTaskFormData({...taskFormData, duration: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Due Date</label>
                      <input
                        type="date"
                        value={taskFormData.dueDate}
                        onChange={(e) => setTaskFormData({...taskFormData, dueDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Labels</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={taskFormData.currentLabel}
                          onChange={(e) => setTaskFormData({...taskFormData, currentLabel: e.target.value})}
                          onKeyPress={handleLabelKeyPress}
                          className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                          placeholder="Add label and press Enter"
                        />
                        <button
                          type="button"
                          onClick={handleAddLabel}
                          disabled={!taskFormData.currentLabel.trim()}
                          className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-[#3fa87d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </div>
                      {taskFormData.labels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {taskFormData.labels.map((label, index) => (
                            <div key={index} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1 border border-slate-300">
                              <Tag size={10} />
                              {label}
                              <button
                                type="button"
                                onClick={() => handleRemoveLabel(label)}
                                className="ml-1 hover:text-red-500 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hours Tracking */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Estimated Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={taskFormData.estimatedHours}
                        onChange={(e) => setTaskFormData({...taskFormData, estimatedHours: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                        placeholder="Estimated hours to complete"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Actual Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={taskFormData.actualHours}
                        onChange={(e) => setTaskFormData({...taskFormData, actualHours: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                        placeholder="Hours spent so far"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={handleTaskSubmit}
                      disabled={loading || !taskFormData.summary.trim()}
                      className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-[#3fa87d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {loading 
                        ? editingTaskId ? "Updating Task..." : "Creating Task..." 
                        : editingTaskId ? "Update Task" : "Create Task"
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Task Modal - UPDATED WITH COMMENTS AND ATTACHMENTS */}
        {isViewMode && viewTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsViewMode(false)}>
            <div 
              className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] mt-1 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsViewMode(false);
                      setViewTaskId(null);
                      setTaskComments([]);
                      setTaskAttachments([]);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Close"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">Task Details</h2>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${getIssueTypeColor(viewTask.issueType)}`}>
                        {getIssueTypeIcon(viewTask.issueType)}
                        <span>{viewTask.issueType}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${getStatusColor(viewTask.status)}`}>
                        {getStatusIcon(viewTask.status)}
                        <span>{viewTask.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full font-mono">
                    {viewTask.issueKey || "No ID"}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTask(viewTask)}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-hidden flex">
                {/* Left Column - Task Details */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100">
                  <div className="space-y-6">
                    {/* Task Summary */}
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-slate-800">{viewTask.summary || "No title"}</h3>
                      {viewTask.description && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} />
                            Description
                          </h4>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-700 whitespace-pre-wrap">{viewTask.description}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Key Information Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                        <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${getPriorityColor(viewTask.priority)}`}>
                          {getPriorityIcon(viewTask.priority)}
                          <span>{viewTask.priority}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Story Points</label>
                        <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl text-sm font-bold flex items-center gap-2">
                          <BarChart size={16} className="text-slate-500" />
                          {viewTask.storyPoints || 0} SP
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Progress</label>
                        <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl">
                          <div className="text-sm font-bold mb-1">{calculateTaskProgress(viewTask)}%</div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                calculateTaskProgress(viewTask) === 100 ? 'bg-green-500' :
                                calculateTaskProgress(viewTask) >= 50 ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}
                              style={{ width: `${calculateTaskProgress(viewTask)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dates Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Timeline</label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Duration:</span>
                            <span className="text-sm font-bold text-slate-800">{viewTask.duration || 0} days</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Created:</span>
                            <span className="text-sm font-bold text-slate-800">{formatDateTime(viewTask.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Updated:</span>
                            <span className="text-sm font-bold text-slate-800">{formatDateTime(viewTask.updatedAt)}</span>
                          </div>
                          {viewTask.dueDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Due Date:</span>
                              <span className={`text-sm font-bold ${new Date(viewTask.dueDate) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                                {formatDate(viewTask.dueDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hours Tracking */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Hours Tracking</label>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Estimated:</span>
                            <span className="text-sm font-bold text-slate-800">{viewTask.estimatedHours || 0} hours</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Actual:</span>
                            <span className="text-sm font-bold text-slate-800">{viewTask.actualHours || 0} hours</span>
                          </div>
                          {viewTask.estimatedHours && viewTask.actualHours && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Variance:</span>
                              <span className={`text-sm font-bold ${
                                viewTask.actualHours > viewTask.estimatedHours ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {(viewTask.actualHours - viewTask.estimatedHours).toFixed(1)} hours
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    {viewTask.labels && viewTask.labels.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Tag size={16} />
                          Labels
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewTask.labels.map((label, index) => (
                            <div key={index} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-300 flex items-center gap-1">
                              <Tag size={12} />
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project & Epic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <FileText size={16} />
                          Project
                        </h4>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{selectedProject.name}</div>
                              <div className="text-sm text-slate-600">{selectedProject.key}</div>
                            </div>
                          </div>
                          {selectedProject.description && (
                            <p className="text-sm text-slate-600 mt-2">{selectedProject.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Target size={16} />
                          Epic
                        </h4>
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Target size={20} className="text-purple-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{selectedEpic.name}</div>
                              <div className="text-sm text-slate-600">{selectedEpic.epicId}</div>
                            </div>
                          </div>
                          {selectedEpic.description && (
                            <p className="text-sm text-slate-600 mt-2">{selectedEpic.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Comments, Attachments & Activity */}
                <div className="w-96 overflow-y-auto border-l border-slate-100">
                  <div className="p-6 space-y-8">
                    {/* Comments Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <MessageSquare size={16} />
                          Comments ({taskComments.length})
                        </h4>
                        {loadingComments && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3fa87d]"></div>
                        )}
                      </div>

                      {/* Add New Comment */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#3fa87d] transition-all min-h-[80px] resize-none"
                          rows={3}
                        />
                        
                        {/* File Upload Area */}
                        <div className="mt-3 space-y-2">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="comment-attachments"
                          />
                          <label htmlFor="comment-attachments" className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#3fa87d] cursor-pointer">
                            <Paperclip size={14} />
                            <span>Attach files</span>
                          </label>
                          
                          {/* Selected Files Preview */}
                          {selectedFiles.length > 0 && (
                            <div className="space-y-2">
                              {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <File size={12} className="text-slate-400" />
                                    <span className="text-xs text-slate-700 truncate max-w-[180px]">{file.name}</span>
                                    <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(index)}
                                    className="p-1 hover:bg-red-100 rounded text-red-500"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Submit Button */}
                        <button
                          onClick={() => handleSubmitComment(viewTask._id)}
                          disabled={uploadingComment || (!newComment.trim() && selectedFiles.length === 0)}
                          className="w-full mt-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-[#3fa87d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {uploadingComment && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          )}
                          {uploadingComment ? "Posting..." : "Post Comment"}
                        </button>
                      </div>

                      {/* Comments List */}
                      {loadingComments ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3fa87d]"></div>
                        </div>
                      ) : taskComments.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <MessageSquare size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500">No comments yet</p>
                          <p className="text-xs text-slate-400 mt-1">Be the first to comment</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {taskComments.map((comment) => {
                            const isExpanded = expandedComments.has(comment._id);
                            const commentEmployee = employees.find(e => e._id === comment.userId);
                            const commentContent = comment.content || comment.text || '';
                            const contentLength = commentContent.length;
                            
                            return (
                              <div key={comment._id} className="p-4 bg-white rounded-xl border border-slate-200">
                                {/* Comment Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                                      {commentEmployee?.name?.charAt(0) || comment.userName?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-800">{comment.userName || 'Unknown'}</div>
                                      <div className="text-xs text-slate-500">
                                        {comment.userRole && `${comment.userRole} • `}
                                        {formatDateTime(comment.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteComment(viewTask._id, comment._id)}
                                    className="p-1 hover:bg-red-100 rounded text-red-500"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                
                                {/* Comment Content */}
                                <div className="mb-3">
                                  <p className={`text-slate-700 ${!isExpanded && contentLength > 200 ? 'line-clamp-3' : ''}`}>
                                    {commentContent}
                                  </p>
                                  {contentLength > 200 && (
                                    <button
                                      onClick={() => toggleCommentExpansion(comment._id)}
                                      className="text-xs text-[#3fa87d] font-bold mt-1 hover:underline"
                                    >
                                      {isExpanded ? "Show less" : "Read more"}
                                    </button>
                                  )}
                                </div>
                                
                                {/* Comment Attachments */}
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className="space-y-2 mt-3">
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                      <Paperclip size={12} />
                                      Attachments ({comment.attachments.length})
                                    </div>
                                    <div className="space-y-1">
                                      {comment.attachments.map((attachment) => (
                                        <div key={attachment._id || attachment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                                          <div className="flex items-center gap-2">
                                            {getFileIcon(attachment.fileType)}
                                            <div>
                                              <div className="text-xs text-slate-700 truncate max-w-[180px]">{attachment.fileName}</div>
                                              <div className="text-[10px] text-slate-500">
                                                {getFileTypeDisplay(attachment.fileType)} • {formatFileSize(attachment.size || attachment.fileSize)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {isViewableInBrowser(attachment.fileType) ? (
                                              <button
                                                onClick={() => handleViewAttachment(attachment)}
                                                className="p-1 hover:bg-blue-100 rounded text-blue-500"
                                                title="View file"
                                              >
                                                <Eye size={12} />
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                                                className="p-1 hover:bg-blue-100 rounded text-blue-500"
                                                title="Open in new tab"
                                              >
                                                <ExternalLink size={12} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDownloadAttachment(attachment)}
                                              className="p-1 hover:bg-green-100 rounded text-green-500"
                                              title="Download"
                                            >
                                              <Download size={12} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAttachment(viewTask._id, attachment._id || attachment.id || '', comment._id)}
                                              className="p-1 hover:bg-red-100 rounded text-red-500"
                                              title="Delete attachment"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Paperclip size={16} />
                          Attachments ({taskAttachments.length})
                        </h4>
                        {loadingAttachments && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3fa87d]"></div>
                        )}
                      </div>

                      {loadingAttachments ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3fa87d]"></div>
                        </div>
                      ) : taskAttachments.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <Paperclip size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500">No attachments</p>
                          <p className="text-xs text-slate-400 mt-1">Upload files in comments</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {taskAttachments.map((attachment) => {
                            const uploader = employees.find(e => e._id === attachment.uploadedBy);
                            return (
                              <div key={attachment._id || attachment.id} className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#3fa87d]/50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                      {getFileIcon(attachment.fileType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-slate-800 truncate">{attachment.fileName}</div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{getFileTypeDisplay(attachment.fileType)}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(attachment.size || attachment.fileSize)}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <User size={10} />
                                        Uploaded by {uploader?.name || attachment.uploadedByName || 'Unknown'}
                                        <span className="mx-1">•</span>
                                        {formatDateTime(attachment.uploadedAt || attachment.createdAt || '')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isViewableInBrowser(attachment.fileType) ? (
                                      <button
                                        onClick={() => handleViewAttachment(attachment)}
                                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500"
                                        title="View file"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownloadAttachment(attachment)}
                                      className="p-1.5 hover:bg-green-100 rounded-lg text-green-500"
                                      title="Download"
                                    >
                                      <Download size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAttachment(viewTask._id, attachment._id || attachment.id || '', attachment.commentId)}
                                      className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
                                      title="Delete attachment"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Created by: {viewTask.createdBy || "Unknown"} • Last updated: {formatDateTime(viewTask.updatedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsViewMode(false);
                      setViewTaskId(null);
                      setTaskComments([]);
                      setTaskAttachments([]);
                    }}
                    className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attachment Viewer Modal */}
        {viewingAttachment && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={closeAttachmentViewer}>
            <div 
              className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Viewer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeAttachmentViewer}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Close"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 truncate max-w-md">
                      {viewingAttachment.fileName}
                    </h2>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{getFileTypeDisplay(viewingAttachment.fileType)}</span>
                      <span>•</span>
                      <span>{formatFileSize(viewingAttachment.size || viewingAttachment.fileSize)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadAttachment(viewingAttachment)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                    title="Download"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 overflow-hidden p-6">
                {viewingAttachment.fileType?.startsWith('image/') ? (
                  <div className="flex items-center justify-center h-full">
                    <img 
                      src={viewerUrl} 
                      alt={viewingAttachment.fileName}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/api/placeholder/800/600';
                        e.currentTarget.alt = 'Image failed to load';
                      }}
                    />
                  </div>
                ) : viewingAttachment.fileType?.includes('pdf') ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
                      <div className="text-sm text-slate-700">
                        PDF Document - {viewingAttachment.fileName}
                      </div>
                      <button
                        onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Open in New Tab
                      </button>
                    </div>
                    <iframe 
                      src={viewerUrl}
                      title={viewingAttachment.fileName}
                      className="flex-1 w-full border border-slate-300 rounded-lg"
                      onError={(e) => {
                        const iframe = e.currentTarget;
                        iframe.srcdoc = `
                          <html>
                            <head><title>PDF Viewer</title></head>
                            <body style="margin:0;padding:20px;background:#f5f5f5;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;">
                              <div style="text-align:center;">
                                <h3 style="color:#666;margin-bottom:10px;">PDF cannot be displayed inline</h3>
                                <p style="color:#999;margin-bottom:20px;">Please download or open in a new tab</p>
                                <a href="${viewerUrl}" download="${viewingAttachment.fileName}" style="padding:10px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;">Download PDF</a>
                              </div>
                            </body>
                          </html>
                        `;
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {getFileIcon(viewingAttachment.fileType)}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        {viewingAttachment.fileName}
                      </h3>
                      <p className="text-slate-600 mb-4">
                        This file type cannot be previewed directly. You can download it or open it in a new tab.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> Open in New Tab
                        </button>
                        <button
                          onClick={() => handleDownloadAttachment(viewingAttachment)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewer Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                <div>
                  Uploaded by: {viewingAttachment.uploadedByName || 'Unknown'} • 
                  Date: {formatDateTime(viewingAttachment.uploadedAt || viewingAttachment.createdAt || '')}
                </div>
                <button
                  onClick={closeAttachmentViewer}
                  className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
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