"use client";

import React, { useCallback, useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Eye,
  Calendar,
  User,
  AlertTriangle,
  BarChart3,
  Loader2,
  Play,
  Lock,
  Unlock,
  FolderTree,
  Layers,
  Briefcase,
  ListTree,
  Send,
  AtSign,
  MessageSquare,
  MoreVertical,
  Pencil,
  Check,
  X as XIcon,
  AlertCircle as AlertCircleIcon,
  Paperclip,
  Image as ImageIcon,
  File,
  XCircle,
  Upload,
  FileText,
  Download,
  ExternalLink
} from "lucide-react";
import {
  Task,
  Subtask,
  Employee,
  SubtaskChangeHandler,
  SubtaskPathHandler,
  Comment,
  Attachment
} from "./types";
import TaskSubtaskEditor from "./TaskSubtaskEditor";
import SubtaskModal from "./SubtaskModal";

// --- Utilities ---
const calculateDaysDiff = (dateStr: string | undefined | null): number | null => {
  if (!dateStr) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) { return null; }
};

const sumAllSubtasksTime = (subtasks: Subtask[] | undefined | null): number => {
  if (!subtasks || subtasks.length === 0) return 0;
  return subtasks.reduce((total, sub) => {
    const raw = sub.timeSpent;
    const current = typeof raw === "number" ? raw : parseFloat(raw as string) || 0;
    const nested = sub.subtasks ? sumAllSubtasksTime(sub.subtasks) : 0;
    return total + current + nested;
  }, 0);
};

const sumAllSubtasksStoryPoints = (subtasks: Subtask[] | undefined | null): number => {
  if (!subtasks || subtasks.length === 0) return 0;
  return subtasks.reduce((total, sub) => {
    const raw = sub.storyPoints;
    const current = typeof raw === "number" ? raw : parseFloat(raw as string) || 0;
    const nested = sub.subtasks ? sumAllSubtasksStoryPoints(sub.subtasks) : 0;
    return total + current + nested;
  }, 0);
};

// --- All Task Statuses ---
const allTaskStatuses = [
  "Icebox",
  "Backlog",
  "Prioritized",
  "Todo",
  "Ready for Dev",
  "In Progress",
  "Dev Review",
  "Code Review",
  "QA Ready",
  "QA In Progress",
  "QA Review",
  "UAT",
  "Client Review",
  "Ready for Release",
  "Staging",
  "Production",
  "Live",
  "Done",
  "Closed",
  "Blocked",
  "On Hold",
  "Rejected"
];

// --- Status Color Logic ---
const getStatusBgColor = (status: string = "") => {
  const statusColors: Record<string, string> = {
    "Icebox": "bg-gray-100 text-gray-800 border-gray-200",
    "Backlog": "bg-slate-100 text-slate-800 border-slate-200",
    "Prioritized": "bg-blue-100 text-blue-800 border-blue-200",
    "Todo": "bg-blue-50 text-blue-900 border-blue-100",
    "Ready for Dev": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "In Progress": "bg-amber-100 text-amber-800 border-amber-200",
    "Dev Review": "bg-purple-100 text-purple-800 border-purple-200",
    "Code Review": "bg-violet-100 text-violet-800 border-violet-200",
    "QA Ready": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    "QA In Progress": "bg-pink-100 text-pink-800 border-pink-200",
    "QA Review": "bg-rose-100 text-rose-800 border-rose-200",
    "UAT": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "Client Review": "bg-indigo-50 text-indigo-900 border-indigo-100",
    "Ready for Release": "bg-teal-100 text-teal-800 border-teal-200",
    "Staging": "bg-orange-100 text-orange-800 border-orange-200",
    "Production": "bg-green-100 text-green-800 border-green-200",
    "Live": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Done": "bg-emerald-50 text-emerald-900 border-emerald-100",
    "Closed": "bg-gray-100 text-gray-800 border-gray-200",
    "Blocked": "bg-red-100 text-red-800 border-red-200",
    "On Hold": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Rejected": "bg-red-50 text-red-900 border-red-100",
  };
  
  return statusColors[status] || "bg-slate-100 text-slate-800 border-slate-200";
};

// --- Get Subtask Progress with Fallback ---
const getSubtaskProgress = (subtask: Subtask): number => {
  if ('progress' in subtask && subtask.progress !== undefined) {
    return Number(subtask.progress) || 0;
  }
  
  switch (subtask.status?.toLowerCase()) {
    case "completed":
    case "done":
      return 100;
    case "in progress":
      return 50;
    case "paused":
      return 25;
    case "to do":
    case "todo":
    default:
      return 0;
  }
};

// --- Check if user can edit specific subtask ---
const canUserEditSubtask = (subtask: Subtask, currentUser: { name: string; role: string; id: string }): boolean => {
  if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
  
  if (currentUser.role === "Employee") {
    if (!subtask.assigneeName) return true;
    return subtask.assigneeName.toLowerCase() === currentUser.name.toLowerCase();
  }
  
  return false;
};

// --- Check if user can edit/delete comment ---
const canUserModifyComment = (comment: Comment, currentUser: { name: string; role: string; id: string }) => {
  // Admins and Managers can edit/delete any comment
  if (currentUser.role === "Admin" || currentUser.role === "Manager") {
    return { canEdit: true, canDelete: true };
  }
  
  // Employees can only edit/delete their own comments
  if (currentUser.role === "Employee") {
    const isOwner = comment.userId === currentUser.id || comment.userName === currentUser.name;
    return { canEdit: isOwner, canDelete: isOwner };
  }
  
  return { canEdit: false, canDelete: false };
};

// --- Check if user can delete attachment ---
const canUserDeleteAttachment = (attachment: Attachment, comment: Comment, currentUser: { name: string; role: string; id: string }) => {
  if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
  
  // Users can delete their own attachments
  if (attachment.uploadedById === currentUser.id) return true;
  
  // Users can delete attachments from their own comments
  if (comment.userId === currentUser.id) return true;
  
  return false;
};

// --- File upload utilities ---
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

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <ImageIcon size={16} className="text-blue-500" />;
  } else if (fileType.includes('pdf')) {
    return <FileText size={16} className="text-red-500" />;
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return <FileText size={16} className="text-blue-600" />;
  } else if (fileType.includes('excel') || fileType.includes('sheet')) {
    return <FileText size={16} className="text-green-600" />;
  } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) {
    return <File size={16} className="text-purple-500" />;
  } else if (fileType.includes('text')) {
    return <FileText size={16} className="text-gray-600" />;
  } else {
    return <File size={16} className="text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (fileName: string): string => {
  return fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
};

// --- Image Preview Component ---
const ImagePreview: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ExternalLink size={20} className="text-white drop-shadow-lg" />
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} className="text-white" />
          </button>
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

// --- Comment Component with Edit/Delete and File Upload ---
interface CommentBoxProps {
  comments?: Comment[];
  employees: Employee[];
  currentUser: { name: string; id: string; role: string };
  onAddComment: (text: string, attachments?: File[]) => Promise<void>;
  onUpdateComment: (commentId: string, newText: string, attachments?: File[], removedAttachmentIds?: string[]) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onDeleteAttachment: (commentId: string, attachmentId: string) => Promise<void>;
  onTagEmployee: (employeeName: string) => void;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

const CommentBox: React.FC<CommentBoxProps> = ({
  comments = [],
  employees,
  currentUser,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onDeleteAttachment,
  onTagEmployee
}) => {
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionSearch, setMentionSearch] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // File upload states
  const [files, setFiles] = useState<File[]>([]);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [filesToRemove, setFilesToRemove] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest(`.comment-menu-${openMenuId}`)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Filter employees based on mention search
  useEffect(() => {
    if (mentionSearch) {
      const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(mentionSearch.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [mentionSearch, employees]);

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingCommentId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [editingCommentId, editText.length]);

  // Generate image previews when files change
  useEffect(() => {
    const previews: string[] = [];
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        previews.push(URL.createObjectURL(file));
      }
    });
    setImagePreviews(previews);
    
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [files]);

  useEffect(() => {
    const previews: string[] = [];
    editFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        previews.push(URL.createObjectURL(file));
      }
    });
    setEditImagePreviews(previews);
    
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [editFiles]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 10MB limit`);
      } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name} has unsupported file type (${file.type})`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      if (isEdit) {
        setEditFiles(prev => [...prev, ...validFiles]);
      } else {
        setFiles(prev => [...prev, ...validFiles]);
      }
    }

    // Reset file input
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, isEdit: boolean = false) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const dataTransfer = new DataTransfer();
    
    droppedFiles.forEach(file => {
      if (file.size <= MAX_FILE_SIZE && ALLOWED_FILE_TYPES.includes(file.type)) {
        dataTransfer.items.add(file);
      }
    });

    if (dataTransfer.files.length > 0) {
      const event = { target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event, isEdit);
    }
  };

  // Remove file from upload list
  const removeFile = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      const file = editFiles[index];
      if (file.type.startsWith('image/')) {
        const previewIndex = editFiles.slice(0, index).filter(f => f.type.startsWith('image/')).length;
        URL.revokeObjectURL(editImagePreviews[previewIndex]);
        setEditImagePreviews(prev => prev.filter((_, i) => i !== previewIndex));
      }
      setEditFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      const file = files[index];
      if (file.type.startsWith('image/')) {
        const previewIndex = files.slice(0, index).filter(f => f.type.startsWith('image/')).length;
        URL.revokeObjectURL(imagePreviews[previewIndex]);
        setImagePreviews(prev => prev.filter((_, i) => i !== previewIndex));
      }
      setFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Mark existing attachment for removal
  const markAttachmentForRemoval = (attachmentId: string) => {
    if (filesToRemove.includes(attachmentId)) {
      setFilesToRemove(prev => prev.filter(id => id !== attachmentId));
    } else {
      setFilesToRemove(prev => [...prev, attachmentId]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1 && (cursorPos === lastAtIndex + 1 || textBeforeCursor[lastAtIndex + 1] === " " || textBeforeCursor.substring(lastAtIndex + 1).includes(" "))) {
      setShowMentionList(true);
      setMentionPosition(lastAtIndex);
      setMentionSearch("");
    } else if (lastAtIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceIndex = searchTerm.indexOf(" ");
      if (spaceIndex === -1) {
        setShowMentionList(true);
        setMentionSearch(searchTerm);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionList && e.key === "ArrowDown") {
      e.preventDefault();
    } else if (showMentionList && e.key === "Enter" && filteredEmployees.length > 0) {
      e.preventDefault();
      handleMentionSelect(filteredEmployees[0].name);
    } else if (e.key === "Enter" && !e.shiftKey && (commentText.trim() || files.length > 0)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === "Enter" && !e.shiftKey && (editText.trim() || editFiles.length > 0 || filesToRemove.length > 0)) {
      e.preventDefault();
      handleSaveEdit(commentId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingCommentId(null);
      setEditText("");
      setEditFiles([]);
      setFilesToRemove([]);
    }
  };

  const handleMentionSelect = (employeeName: string) => {
    const textBefore = commentText.substring(0, mentionPosition);
    const textAfter = commentText.substring(mentionPosition);
    const spaceIndex = textAfter.indexOf(" ");
    const replaceLength = spaceIndex !== -1 ? spaceIndex : textAfter.length;
    
    const newText = textBefore + "@" + employeeName + " " + textAfter.substring(replaceLength);
    setCommentText(newText);
    setShowMentionList(false);
    setMentionSearch("");
    
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = mentionPosition + employeeName.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    onTagEmployee(employeeName);
  };

  const handleSubmit = async () => {
    if ((commentText.trim() || files.length > 0) && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddComment(commentText, files);
        setCommentText("");
        setFiles([]);
        setImagePreviews([]);
        setShowMentionList(false);
      } catch (error) {
        console.error("Failed to add comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment._id || comment.id || null);
    setEditText(comment.text);
    setEditFiles([]);
    setEditImagePreviews([]);
    setFilesToRemove([]);
  };

  const handleSaveEdit = async (commentId: string) => {
    if ((editText.trim() || editFiles.length > 0 || filesToRemove.length > 0) && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onUpdateComment(commentId, editText, editFiles, filesToRemove);
        setEditingCommentId(null);
        setEditText("");
        setEditFiles([]);
        setEditImagePreviews([]);
        setFilesToRemove([]);
      } catch (error) {
        console.error("Failed to update comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isSubmitting) {
      setIsSubmitting(true);
      try {
        await onDeleteComment(commentId);
        setDeleteConfirmId(null);
      } catch (error) {
        console.error("Failed to delete comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteAttachmentClick = async (commentId: string, attachmentId: string) => {
    if (!isSubmitting) {
      setIsSubmitting(true);
      try {
        await onDeleteAttachment(commentId, attachmentId);
      } catch (error) {
        console.error("Failed to delete attachment:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const formatCommentText = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith("@")) {
        const employeeName = part.substring(1);
        const employee = employees.find(e => e.name === employeeName);
        return employee ? (
          <span key={index} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold mx-1">
            <AtSign size={10} />
            {employeeName}
          </span>
        ) : part;
      }
      return part;
    });
  };

  const formatTimestamp = (timestamp?: string, editedAt?: string) => {
    if (!timestamp) return "Just now";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
  };

  // File preview component
  const renderFilePreview = (file: File, index: number, isEdit: boolean = false) => {
    const isImage = file.type.startsWith('image/');
    const previewIndex = isEdit 
      ? editFiles.slice(0, index).filter(f => f.type.startsWith('image/')).length
      : files.slice(0, index).filter(f => f.type.startsWith('image/')).length;
    const previewUrl = isEdit ? editImagePreviews[previewIndex] : imagePreviews[previewIndex];
    
    return (
      <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
        <div className="flex-shrink-0">
          {getFileIcon(file.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-black truncate">{file.name}</p>
          <p className="text-[10px] text-slate-500">{formatFileSize(file.size)} • {getFileExtension(file.name)}</p>
        </div>
        <button
          type="button"
          onClick={() => removeFile(index, isEdit)}
          className="p-1 text-slate-400 hover:text-red-500 rounded"
        >
          <XCircle size={14} />
        </button>
      </div>
    );
  };

  // Existing attachment component
  const renderExistingAttachment = (attachment: Attachment, comment: Comment) => {
    const isMarkedForRemoval = filesToRemove.includes(attachment.id);
    const canDelete = canUserDeleteAttachment(attachment, comment, currentUser);
    const isImage = attachment.fileType.startsWith('image/');
    
    return (
      <div key={attachment.id} className={`group relative ${isMarkedForRemoval ? 'opacity-50' : ''}`}>
        <div className={`flex items-center gap-2 p-2 bg-white rounded-lg border ${isMarkedForRemoval ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-blue-300'}`}>
          <div className="flex-shrink-0">
            {getFileIcon(attachment.fileType)}
          </div>
          <div className="flex-1 min-w-0">
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 truncate block"
              download={attachment.fileName}
            >
              {attachment.fileName}
            </a>
            <p className="text-[10px] text-slate-500">
              {formatFileSize(attachment.fileSize)} • {getFileExtension(attachment.fileName)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-blue-600 rounded"
              title="Download"
              download={attachment.fileName}
            >
              <Download size={14} />
            </a>
            {editingCommentId === comment._id && (
              <button
                type="button"
                onClick={() => markAttachmentForRemoval(attachment.id)}
                className={`p-1 rounded ${isMarkedForRemoval ? 'text-green-500 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
                title={isMarkedForRemoval ? 'Restore attachment' : 'Remove attachment'}
              >
                {isMarkedForRemoval ? <Check size={14} /> : <Trash2 size={14} />}
              </button>
            )}
            {!editingCommentId && canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteAttachmentClick(comment._id || comment.id || "", attachment.id)}
                className="p-1 text-red-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete attachment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Image preview overlay */}
        {isImage && !isMarkedForRemoval && (
          <div className="mt-2">
            <ImagePreview 
              src={attachment.url} 
              alt={attachment.fileName}
              className="max-h-48"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Existing Comments */}
      {comments && comments.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {comments.map((comment, index) => {
            const isEditingThis = editingCommentId === (comment._id || comment.id);
            const isDeleteConfirm = deleteConfirmId === (comment._id || comment.id);
            const { canEdit, canDelete } = canUserModifyComment(comment, currentUser);
            const isEdited = comment.editedAt && comment.editedAt !== comment.createdAt;
            const imageAttachments = comment.attachments?.filter(a => a.fileType.startsWith('image/')) || [];
            const fileAttachments = comment.attachments?.filter(a => !a.fileType.startsWith('image/')) || [];
            
            return (
              <div key={comment._id || comment.id || index} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 border border-blue-200 flex-shrink-0">
                    {comment.userName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-black">{comment.userName}</span>
                        <span className="text-xs text-slate-500">
                          {formatTimestamp(comment.timestamp || comment.createdAt)}
                          {isEdited && (
                            <span className="ml-1 italic text-slate-400" title={`Edited at ${new Date(comment.editedAt!).toLocaleString()}`}>
                              (edited)
                            </span>
                          )}
                        </span>
                        {comment.userId === currentUser.id && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      
                      {(canEdit || canDelete) && !isEditingThis && !isDeleteConfirm && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(comment._id || comment.id || null);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {openMenuId === (comment._id || comment.id) && (
                            <div
                              className={`absolute right-0 mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 comment-menu-${comment._id || comment.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(comment);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  <Pencil size={14} />
                                  Edit Comment
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(comment._id || comment.id || null);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 size={14} />
                                  Delete Comment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Comment text or edit form */}
                    {isEditingThis ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          ref={editTextareaRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, comment._id || comment.id || "")}
                          className="w-full p-3 bg-white rounded-xl border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm text-black min-h-[80px]"
                          rows={3}
                          disabled={isSubmitting}
                        />
                        
                        {/* Existing attachments */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">Existing attachments:</p>
                            <div className="space-y-2">
                              {comment.attachments.map(attachment => 
                                renderExistingAttachment(attachment, comment)
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* New file upload for edit */}
                        <div
                          className={`border-2 border-dashed rounded-xl p-4 transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, true)}
                        >
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 mb-1">Drop files here or click to upload</p>
                            <p className="text-xs text-slate-400">Max 10MB per file • Images, PDF, Docs, Excel, ZIP</p>
                            <input
                              ref={editFileInputRef}
                              type="file"
                              multiple
                              onChange={(e) => handleFileSelect(e, true)}
                              className="hidden"
                              accept={ALLOWED_FILE_TYPES.join(',')}
                            />
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                              disabled={isSubmitting}
                            >
                              <Paperclip size={14} className="inline mr-1" />
                              Add Files
                            </button>
                          </div>
                        </div>
                        
                        {/* Uploaded files preview for edit */}
                        {editFiles.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">New attachments:</p>
                            <div className="space-y-2">
                              {editFiles.map((file, index) => renderFilePreview(file, index, true))}
                            </div>
                          </div>
                        )}
                        
                        {/* Edit actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => handleSaveEdit(comment._id || comment.id || "")}
                            disabled={(!editText.trim() && editFiles.length === 0 && filesToRemove.length === 0) || isSubmitting}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              (editText.trim() || editFiles.length > 0 || filesToRemove.length > 0) && !isSubmitting
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {isSubmitting ? (
                              <Loader2 size={16} className="animate-spin mx-2" />
                            ) : (
                              <>
                                <Check size={16} className="inline mr-1" />
                                Save Changes
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditText("");
                              setEditFiles([]);
                              setEditImagePreviews([]);
                              setFilesToRemove([]);
                            }}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            <XIcon size={16} className="inline mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isDeleteConfirm ? (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircleIcon size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Delete this comment?</p>
                            <p className="text-xs text-red-600">This action cannot be undone.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(comment._id || comment.id || "")}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              !isSubmitting
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-red-300 text-red-100 cursor-not-allowed"
                            }`}
                          >
                            {isSubmitting ? (
                              <Loader2 size={16} className="animate-spin mx-2" />
                            ) : (
                              <>
                                <Trash2 size={16} className="inline mr-1" />
                                Delete
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Comment text */}
                        <div className="text-sm text-slate-700 whitespace-pre-wrap mb-3">
                          {formatCommentText(comment.text)}
                        </div>
                        
                        {/* Image attachments */}
                        {imageAttachments.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon size={14} className="text-slate-400" />
                              <span className="text-xs text-slate-500 font-medium">Images:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {imageAttachments.map(attachment => (
                                <ImagePreview
                                  key={attachment.id}
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* File attachments */}
                        {fileAttachments.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2">
                              <Paperclip size={14} className="text-slate-400" />
                              <span className="text-xs text-slate-500 font-medium">Files:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {fileAttachments.map(attachment => (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                  download={attachment.fileName}
                                >
                                  <div className="flex-shrink-0">
                                    {getFileIcon(attachment.fileType)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-blue-600 group-hover:text-blue-800 truncate">{attachment.fileName}</p>
                                    <p className="text-[10px] text-slate-500">
                                      {formatFileSize(attachment.fileSize)} • {getFileExtension(attachment.fileName)}
                                    </p>
                                  </div>
                                  <Download size={14} className="text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No comments yet</p>
          <p className="text-slate-400 text-sm">Start the conversation!</p>
        </div>
      )}

      {/* New Comment Input */}
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 border border-blue-200 flex-shrink-0 mt-1">
            {currentUser.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... Type @ to mention someone"
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm text-black placeholder:text-slate-400 min-h-[100px]"
              rows={3}
              disabled={isSubmitting}
            />
            
            {/* Uploaded files preview */}
            {files.length > 0 && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Attachments ({files.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setImagePreviews([]);
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                    disabled={isSubmitting}
                  >
                    Clear all
                  </button>
                </div>
                
                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-medium">Images:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {imagePreviews.map((preview, index) => {
                        const file = files.filter(f => f.type.startsWith('image/'))[index];
                        return (
                          <div key={index} className="relative group">
                            <img 
                              src={preview} 
                              alt={file.name} 
                              className="w-full h-24 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const fileIndex = files.findIndex(f => 
                                  f.type.startsWith('image/') && 
                                  files.slice(0, fileIndex).filter(f => f.type.startsWith('image/')).length === index
                                );
                                removeFile(fileIndex);
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* File list */}
                <div className="space-y-2">
                  {files.filter(f => !f.type.startsWith('image/')).length > 0 && (
                    <>
                      <div className="text-xs text-slate-500 font-medium">Files:</div>
                      <div className="space-y-1">
                        {files.filter(f => !f.type.startsWith('image/')).map((file, index) => {
                          const fileIndex = files.findIndex(f => f === file);
                          return renderFilePreview(file, fileIndex);
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Attach files"
                  disabled={isSubmitting}
                >
                  <Paperclip size={18} />
                </button>
                <span className="text-xs text-slate-500">
                  {files.length > 0 ? `${files.length} file(s) attached` : 'No files attached'}
                </span>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={(!commentText.trim() && files.length === 0) || isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  (commentText.trim() || files.length > 0) && !isSubmitting
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                } transition-colors`}
                title="Send comment"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* File upload input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e)}
          className="hidden"
          accept={ALLOWED_FILE_TYPES.join(',')}
        />

        {/* Drag and drop area */}
        <div
          className={`mt-3 border-2 border-dashed rounded-2xl p-6 transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e)}
        >
          <div className="text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-1">Drag & drop files here to attach</p>
            <p className="text-xs text-slate-400">Supports images, documents, and other files up to 10MB each</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center gap-2 mx-auto"
              disabled={isSubmitting}
            >
              <Paperclip size={14} />
              Browse Files
            </button>
          </div>
        </div>

        {/* Mention Dropdown */}
        {showMentionList && (
          <div className="absolute left-12 right-0 top-full mt-1 z-50">
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AtSign size={12} />
                  <span>Mention teammate:</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <button
                      key={employee._id}
                      onClick={() => handleMentionSelect(employee.name)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-200">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black">{employee.name}</div>
                        <div className="text-xs text-slate-500">{employee.role || "Employee"}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500">
                    No employees found
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-slate-100 text-xs text-slate-400">
                Press Enter to select, Esc to cancel
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-Components ---
const DueDateReminder: React.FC<{ dueDate?: string | null; endDate?: string | null; status?: string }> = ({ dueDate, endDate, status }) => {
  const daysToDue = calculateDaysDiff(dueDate);
  const daysToEnd = calculateDaysDiff(endDate);
  
  const completionStatuses = ["Done", "Completed", "Closed", "Live"];
  const isCompleted = completionStatuses.includes(status || "");
  
  if (isCompleted || (daysToDue === null && daysToEnd === null)) return null;
  const daysRemaining = (daysToDue ?? daysToEnd) as number;
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 2;

  return (
    <div className={`border-2 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-sm transition-all duration-300 ${
      isOverdue ? 'bg-red-50 border-red-200 text-red-900' : 
      isUrgent ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
    }`}>
      <div className="bg-white p-3 rounded-xl shadow-sm">
        {isOverdue ? <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" /> : <Clock className="w-6 h-6 text-emerald-600" />}
      </div>
      <div className="flex-1">
        <p className="font-bold text-lg leading-tight">
          {isOverdue ? `Target overdue by ${Math.abs(daysRemaining)} days` : daysRemaining === 0 ? `Target is today!` : `${daysRemaining} days remaining`}
        </p>
      </div>
    </div>
  );
};

const SubtaskViewer: React.FC<{
  subtasks: Subtask[];
  level: number;
  handleSubtaskStatusChange: (subId: string | null, newStatus: string, canEdit: boolean) => void;
  onView: (subtask: Subtask) => void;
  currentUser: { name: string; role: string; id: string };
}> = ({ subtasks, level, handleSubtaskStatusChange, onView, currentUser }) => {
  if (!subtasks || subtasks.length === 0) return null;
  
  return (
    <ul className={`space-y-3 ${level > 0 ? "mt-3 border-l-2 border-slate-200 ml-4 pl-4" : ""}`}>
      {subtasks.map((sub, i) => {
        const progress = getSubtaskProgress(sub);
        const subStatus = sub.status || "To Do";
        const subTitle = sub.title || "Untitled Subtask";
        const subAssignee = sub.assigneeName || "";
        
        const canEditThisSubtask = canUserEditSubtask(sub, currentUser);
        
        return (
          <li key={sub.id || i} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Title Column (4 cols) */}
              <div className="col-span-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                    {sub.id || `SUB-${i + 1}`}
                  </span>
                  <p className="font-bold text-black text-sm truncate" title={subTitle}>
                    {subTitle}
                  </p>
                  {!canEditThisSubtask && subAssignee && (
                    <Lock size={12} className="text-slate-400 ml-auto" />
                  )}
                </div>
                {subAssignee && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <User size={10} className="text-slate-400" />
                    <span>{subAssignee}</span>
                    {subAssignee.toLowerCase() === currentUser.name.toLowerCase() && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-1">
                        You
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status Column (3 cols) */}
              <div className="col-span-2">
                {canEditThisSubtask ? (
                  <select
                    value={subStatus}
                    onChange={(e) => sub.id && handleSubtaskStatusChange(sub.id, e.target.value, true)}
                    className={`w-full text-xs font-black border rounded-lg px-2 py-1.5 outline-none cursor-pointer text-black ${getStatusBgColor(subStatus)}`}
                  >
                    {["To Do", "In Progress", "Completed", "Paused"].map(s => 
                      <option key={s} value={s} className="bg-white text-black">{s}</option>
                    )}
                  </select>
                ) : (
                  <div className="relative">
                    <span className={`inline-block w-full text-xs font-black border rounded-lg px-2 py-1.5 text-center ${getStatusBgColor(subStatus)}`}>
                      {subStatus}
                    </span>
                    {!canEditThisSubtask && (
                      <div className="absolute -top-1 -right-1">
                        <Lock size={10} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Progress Column (4 cols) */}
              <div className="col-span-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">Progress</span>
                    <span className={`text-xs font-bold ${
                      progress === 100 ? 'text-emerald-600' : 
                      progress >= 70 ? 'text-blue-600' : 
                      progress >= 30 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        progress === 100 ? 'bg-emerald-500' : 
                        progress >= 70 ? 'bg-blue-500' : 
                        progress >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {sub.timeSpent && (
                    <div className="text-[10px] text-slate-500 font-medium mt-1">
                      Time spent: {typeof sub.timeSpent === 'number' ? sub.timeSpent : parseFloat(sub.timeSpent as string) || 0} hours
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions Column (1 col) */}
              <div className="col-span-1 flex justify-end">
                <button 
                  onClick={() => onView(sub)} 
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  title="View details"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
            
            {/* Nested subtasks - Always visible to all users */}
            {sub.subtasks && sub.subtasks.length > 0 && (
              <div className="mt-4">
                <SubtaskViewer 
                  subtasks={sub.subtasks} 
                  level={level + 1} 
                  handleSubtaskStatusChange={handleSubtaskStatusChange} 
                  onView={onView} 
                  currentUser={currentUser}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

// --- Main Modal Component ---
interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  draftTask: Partial<Task>;
  subtasks: Subtask[];
  employees: Employee[];
  currentProjectPrefix: string;
  handleEdit: (task: Task) => void;
  handleDelete: (id: string) => void;
  handleUpdate: (e: React.FormEvent) => void;
  cancelEdit: () => void;
  handleDraftChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubtaskChange: SubtaskChangeHandler;
  addSubtask: SubtaskPathHandler;
  removeSubtask: SubtaskPathHandler;
  onToggleEdit: SubtaskPathHandler;
  onToggleExpansion: SubtaskPathHandler;
  handleStartSprint: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onSubtaskStatusChange: (taskId: string, subtaskId: string | null, newStatus: string) => void;
  onAddComment: (taskId: string, commentText: string, attachments?: File[]) => Promise<void>;
  onUpdateComment: (taskId: string, commentId: string, newText: string, attachments?: File[], removedAttachmentIds?: string[]) => Promise<void>;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  onDeleteAttachment?: (taskId: string, commentId: string, attachmentId: string) => Promise<void>;
  comments?: Comment[];
  isLoading?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserName?: string;
}

const TaskModal: React.FC<TaskModalProps> = (props) => {
  const {
    task, isOpen, onClose, isEditing, draftTask, subtasks, employees,
    currentProjectPrefix, handleEdit, handleDelete,
    handleUpdate, cancelEdit, handleDraftChange, handleSubtaskChange,
    addSubtask, removeSubtask, onToggleEdit, onToggleExpansion,
    handleStartSprint, onTaskStatusChange, onSubtaskStatusChange,
    onAddComment, onUpdateComment, onDeleteComment, onDeleteAttachment,
    comments = [],
    isLoading = false,
    currentUserRole = "Employee", currentUserId = "", currentUserName = ""
  } = props;

  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const currentUser = useMemo(() => {
    if (typeof window !== "undefined") {
      return {
        name: currentUserName || localStorage.getItem("userName") || "",
        id: currentUserId || localStorage.getItem("userId") || "",
        role: currentUserRole || localStorage.getItem("userRole") || "Employee"
      };
    }
    return { name: "", id: "", role: "Employee" };
  }, [currentUserName, currentUserId, currentUserRole]);

  useEffect(() => {
    if (isOpen) {
      console.log('TaskModal opened:', {
        taskId: task._id,
        taskSubtasks: task.subtasks,
        subtasksProp: subtasks,
        isEditing,
        currentUser,
        currentUserName: currentUser.name
      });
    }
  }, [isOpen, task, subtasks, isEditing, currentUser]);

  const subtasksToDisplay = isEditing ? subtasks : (task.subtasks || []);
  
  const totalTime = useMemo(() => sumAllSubtasksTime(subtasksToDisplay), [subtasksToDisplay]);
  const totalPoints = useMemo(() => sumAllSubtasksStoryPoints(subtasksToDisplay), [subtasksToDisplay]);
  const current = isEditing ? draftTask : task;

  const taskDisplayName = task.displayName || 
                         task.summary || 
                         task.title || 
                         task.name || 
                         `Task ${task.taskId || task._id?.substring(0, 8)}`;

  const epicName = task.epicName || task.projectName || 'Epic not specified';

  const canEditTask = useMemo(() => {
    if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
    
    if (currentUser.role === "Employee") {
      if (!task.assigneeNames || task.assigneeNames.length === 0) return true;
      
      const isAssigned = task.assigneeNames?.some(
        name => name.toLowerCase() === currentUser.name.toLowerCase()
      );
      
      return isAssigned;
    }
    
    return false;
  }, [task, currentUser]);

  const canEditSubtasks = useMemo(() => {
    if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
    
    if (currentUser.role === "Employee") {
      if (canEditTask) return true;
      
      const hasAssignedSubtasks = task.subtasks?.some(
        sub => canUserEditSubtask(sub, currentUser)
      );
      
      return hasAssignedSubtasks;
    }
    
    return false;
  }, [task, currentUser, canEditTask]);

  const handleSubtaskStatusChange = useCallback((subtaskId: string | null, newStatus: string, canEdit: boolean) => {
    if (subtaskId && canEdit) {
      onSubtaskStatusChange(task._id, subtaskId, newStatus);
    }
  }, [task._id, onSubtaskStatusChange]);

  const handleAddComment = useCallback(async (commentText: string, attachments?: File[]) => {
    if (!commentText.trim() && (!attachments || attachments.length === 0)) return;
    
    setIsSubmittingComment(true);
    try {
      await onAddComment(task._id, commentText, attachments);
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [task._id, onAddComment]);

  const handleUpdateComment = useCallback(async (commentId: string, newText: string, attachments?: File[], removedAttachmentIds?: string[]) => {
    if (!newText.trim() && (!attachments || attachments.length === 0) && (!removedAttachmentIds || removedAttachmentIds.length === 0)) return;
    
    setIsSubmittingComment(true);
    try {
      await onUpdateComment(task._id, commentId, newText, attachments, removedAttachmentIds);
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [task._id, onUpdateComment]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setIsSubmittingComment(true);
    try {
      await onDeleteComment(task._id, commentId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [task._id, onDeleteComment]);

  const handleDeleteAttachment = useCallback(async (commentId: string, attachmentId: string) => {
    if (!onDeleteAttachment) return;
    
    setIsSubmittingComment(true);
    try {
      await onDeleteAttachment(task._id, commentId, attachmentId);
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [task._id, onDeleteAttachment]);

  const handleTagEmployee = useCallback((employeeName: string) => {
    console.log(`Tagged employee: ${employeeName}`);
  }, []);

  if (!isOpen) return null;
  if (isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl flex flex-col w-full max-w-7xl max-h-[90vh] mt-20 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header with epic name */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="space-y-3">
            {/* Epic Name Section */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-3 rounded-2xl">
                <FolderTree className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <span className="text-[11px] font-black text-purple-600 uppercase tracking-[0.4em] block">
                  EPIC
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                  {epicName}
                </h2>
              </div>
            </div>
            
            {/* Task ID and Name */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full uppercase tracking-wider">
                {task.taskId || `TASK-${task._id?.substring(0, 6)}`}
              </span>
              <div className="text-sm font-bold text-slate-700 max-w-xl truncate">
                {taskDisplayName}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {!canEditTask && (
              <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full">
                <Lock size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500">View Only</span>
              </div>
            )}
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
          <DueDateReminder dueDate={task.dueDate} endDate={task.endDate} status={task.status} />

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[
              { label: "Logged Effort", val: `${totalTime} hrs`, icon: <Clock className="text-blue-500"/> },
              { label: "Story Points", val: `${task.taskStoryPoints || 0} SP`, icon: <BarChart3 className="text-purple-500"/> },
              { label: "Progress", val: `${current.completion || 0}%`, icon: <CheckCircle2 className="text-emerald-500"/> },
              { label: "Current State", val: current.status || "Backlog", icon: <AlertCircle className="text-orange-500"/> }
            ].map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="bg-slate-50 p-4 rounded-2xl">{s.icon}</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-black text-black">{s.val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-10">
            {/* Multi-Column Specification Section */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-4 border-b">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Task Details</h3>
                {!canEditTask && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Eye size={14} />
                    <span className="text-[10px] font-bold">Read Only Mode</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {/* 1. Task Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Layers size={10} />
                    Task Name
                  </label>
                  {isEditing ? (
                    <input 
                      name="summary" 
                      placeholder="Enter task name..." 
                      value={current.summary || ""} 
                      onChange={handleDraftChange} 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 ring-blue-500 outline-none text-sm text-black placeholder:text-slate-500" 
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl font-bold text-black text-sm min-h-[60px]">
                      {taskDisplayName}
                    </div>
                  )}
                </div>

                {/* 2. Assignee */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <User size={10} />
                    Primary Lead
                  </label>
                  {isEditing ? (
                    <select 
                      name="assigneeNames" 
                      value={current.assigneeNames?.[0] || ""} 
                      onChange={handleDraftChange} 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 ring-blue-500 outline-none text-sm text-black"
                    >
                      <option value="" className="text-slate-500 italic">Unassigned</option>
                      {employees.map(e => <option key={e._id} value={e.name} className="text-black">{e.name}</option>)}
                    </select>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl min-h-[60px]">
                      <div className="flex flex-wrap gap-2">
                        {task.assigneeNames && task.assigneeNames.length > 0 ? (
                          task.assigneeNames.map((name, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-slate-200">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-200">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-black">{name}</span>
                                <div className="text-[10px] text-slate-400">Assignee</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-500 italic">Unassigned</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Workflow</label>
                  {canEditTask ? (
                    <select 
                      name="status" 
                      value={current.status} 
                      onChange={isEditing ? handleDraftChange : (e) => onTaskStatusChange(task._id, e.target.value)} 
                      className={`w-full p-4 rounded-2xl font-black border focus:ring-2 ring-blue-500 outline-none text-sm text-black transition-all ${getStatusBgColor(current.status)}`}
                    >
                      {allTaskStatuses.map(s => <option key={s} value={s} className="bg-white text-black font-bold">{s}</option>)}
                    </select>
                  ) : (
                    <div className={`p-4 rounded-2xl font-black text-sm text-black transition-all min-h-[60px] flex items-center ${getStatusBgColor(current.status)}`}>
                      {current.status}
                    </div>
                  )}
                </div>

                {/* 4. Dates */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Calendar size={10} />
                    Deadline
                  </label>
                  {isEditing ? (
                    <input 
                      type="date" 
                      name="dueDate" 
                      value={current.dueDate || ""} 
                      onChange={handleDraftChange} 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 ring-blue-500 outline-none text-sm text-black" 
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl font-bold text-black text-sm min-h-[60px]">
                      {task.dueDate ? (
                        <div>
                          <div>{new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {calculateDaysDiff(task.dueDate) !== null && (
                              <span className={calculateDaysDiff(task.dueDate)! < 0 ? 'text-red-600' : 'text-green-600'}>
                                {calculateDaysDiff(task.dueDate)! < 0 
                                  ? `${Math.abs(calculateDaysDiff(task.dueDate)!)} days overdue`
                                  : `${calculateDaysDiff(task.dueDate)} days remaining`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      ) : 'No deadline set'}
                    </div>
                  )}
                </div>

                {/* 5. Progress */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Completion</label>
                  {isEditing ? (
                    <input 
                      type="number" 
                      name="completion" 
                      placeholder="0" 
                      value={current.completion || 0} 
                      onChange={handleDraftChange} 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 ring-blue-500 outline-none text-sm text-black placeholder:text-slate-500" 
                      min="0"
                      max="100"
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl font-bold text-black text-sm min-h-[60px]">
                      <div className="flex items-center justify-between mb-1">
                        <span>Progress</span>
                        <span className={`font-black ${task.completion === 100 ? 'text-emerald-600' : task.completion >= 70 ? 'text-blue-600' : task.completion >= 30 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {task.completion || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${task.completion === 100 ? 'bg-emerald-500' : task.completion >= 70 ? 'bg-blue-500' : task.completion >= 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${task.completion || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div className="mt-8 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Briefcase size={10} />
                    Remarks & Notes
                  </label>
                  {isEditing ? (
                    <textarea 
                      name="remarks" 
                      placeholder="Add detailed notes here..." 
                      value={current.remarks || ""} 
                      onChange={handleDraftChange} 
                      rows={3} 
                      className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 ring-blue-500 outline-none resize-none text-sm text-black placeholder:text-slate-500" 
                    />
                  ) : (
                    <div className="p-5 bg-slate-50 rounded-2xl font-bold text-black leading-relaxed text-sm min-h-[80px]">
                      {task.remarks || 'No specific instructions provided.'}
                    </div>
                  )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Comments & Discussion</h3>
                  {comments.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold">
                      {comments.length}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <AtSign size={12} />
                  <span>Type @ to mention teammates</span>
                  <span className="mx-2">•</span>
                  <Paperclip size={12} />
                  <span>Drag & drop to upload files</span>
                </div>
              </div>
              
              <CommentBox
                comments={comments}
                employees={employees}
                currentUser={currentUser}
                onAddComment={handleAddComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onDeleteAttachment={handleDeleteAttachment}
                onTagEmployee={handleTagEmployee}
              />
            </div>

            {/* Subtasks Section - ALWAYS VISIBLE TO ALL USERS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <ListTree className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Work Breakdown Structure</h3>
                  <div className="text-xs text-slate-400">
                    ({subtasksToDisplay?.length || 0} subtasks)
                  </div>
                </div>
                {canEditSubtasks && !isEditing && (
                  <button 
                    onClick={() => handleEdit(task)} 
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    Edit Subtasks
                  </button>
                )}
              </div>
              {isEditing ? (
                canEditSubtasks ? (
                  <TaskSubtaskEditor
                    subtasks={subtasks}
                    employees={employees}
                    currentProjectPrefix={currentProjectPrefix}
                    handleSubtaskChange={handleSubtaskChange}
                    addSubtask={addSubtask}
                    removeSubtask={removeSubtask}
                    onToggleEdit={onToggleEdit}
                    onToggleExpansion={onToggleExpansion}
                    onViewSubtask={setSelectedSubtask}
                    allTaskStatuses={["To Do", "In Progress", "Completed", "Paused"]}
                    currentUserRole={currentUser.role}
                    currentUserName={currentUser.name}
                  />
                ) : (
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                    <Lock size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">You don't have permission to edit subtasks</p>
                  </div>
                )
              ) : (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  {subtasksToDisplay && subtasksToDisplay.length > 0 ? (
                    <>
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <div className="text-slate-500">
                            Subtasks are visible to all team members. Only assignees can modify their own subtasks.
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Lock size={10} className="text-slate-400" />
                              <span className="text-[10px] text-slate-500">Locked</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Unlock size={10} className="text-blue-400" />
                              <span className="text-[10px] text-blue-500">Editable</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <SubtaskViewer 
                        subtasks={subtasksToDisplay} 
                        level={0} 
                        handleSubtaskStatusChange={handleSubtaskStatusChange} 
                        onView={setSelectedSubtask}
                        currentUser={currentUser}
                      />
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ListTree className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No subtasks defined</p>
                      <p className="text-slate-400 text-sm mt-1">Add subtasks to break down the work</p>
                      {canEditSubtasks && (
                        <button 
                          onClick={() => handleEdit(task)} 
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                          + Add Subtasks
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer with permission-based controls */}
        <div className="p-10 border-t border-slate-100 flex justify-end gap-4 bg-white sticky bottom-0 z-20">
          {/* Only show "Start Sprint" for tasks in Icebox or Backlog status */}
          {(task.status === "Icebox" || task.status === "Backlog") && !isEditing && canEditTask && (
             <button onClick={() => handleStartSprint(task._id)} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2">
                <Play size={18}/> Start Sprint
             </button>
          )}

          {isEditing ? (
            <>
              {canEditTask && (
                <button onClick={handleUpdate} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl transition-all flex items-center gap-2">
                  <Save size={18}/> Commit Changes
                </button>
              )}
              <button onClick={cancelEdit} className="px-10 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-[2rem] font-black text-[10px] uppercase transition-all">
                Cancel
              </button>
            </>
          ) : (
            <>
              {canEditTask && (
                <button onClick={() => handleEdit(task)} className="px-10 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-xl transition-all flex items-center gap-2">
                  <Edit2 size={18}/> Modify Task
                </button>
              )}
              {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
                <button onClick={() => handleDelete(task._id)} className="px-10 py-4 text-red-500 hover:bg-red-50 rounded-[2rem] font-black text-[10px] uppercase transition-all flex items-center gap-2">
                  <Trash2 size={18}/> Remove
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {selectedSubtask && (
        <SubtaskModal subtask={selectedSubtask} isOpen={!!selectedSubtask} onClose={() => setSelectedSubtask(null)} />
      )}
    </div>
  );
};

export default TaskModal;