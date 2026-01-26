"use client";

import React from "react";
import { 
  X, Edit2, Trash2, User, FileText, Target, ListTree, Tag,
  MessageSquare, Paperclip, Eye, ExternalLink, Download,
  Calendar, Clock, BarChart, File, Image, ArrowLeft, CheckCircle,
  Clock as ClockIcon, Bookmark, Archive, AlertTriangle, Flag, BarChart3,
  BookOpen, ClipboardCheck, Bug, AlertCircle, ChevronDown, ChevronUp,
  CheckSquare, Square
} from "lucide-react";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

// Import the same interfaces from main component
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

interface TaskDetailsModalProps {
  task: Task;
  selectedProject: SavedProject;
  selectedEpic: Epic;
  employees: Employee[];
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  loadingComments: boolean;
  loadingAttachments: boolean;
  newComment: string;
  setNewComment: (comment: string) => void;
  selectedFiles: File[];
  uploadingComment: boolean;
  expandedComments: Set<string>;
  onClose: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSubmitComment: () => Promise<void>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteAttachment: (attachmentId: string, commentId?: string) => void;
  onViewAttachment: (attachment: TaskAttachment) => void;
  onDownloadAttachment: (attachment: TaskAttachment) => void;
  onToggleCommentExpansion: (commentId: string) => void;
  calculateTaskProgress: (task: Task) => number;
  calculateSubtaskStatistics: (subtasks: Subtask[] | undefined) => {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    overallProgress: number;
  };
  formatFileSize: (bytes: number | undefined) => string;
  getFileIcon: (fileType: string | undefined) => React.ReactElement;
  getFileTypeDisplay: (fileType: string | undefined) => string;
  isViewableInBrowser: (fileType: string | undefined) => boolean;
  viewingAttachment: TaskAttachment | null;
  viewerUrl: string;
  onCloseAttachmentViewer: () => void;
}

export default function TaskDetailsModal({
  task,
  selectedProject,
  selectedEpic,
  employees,
  taskComments,
  taskAttachments,
  loadingComments,
  loadingAttachments,
  newComment,
  setNewComment,
  selectedFiles,
  uploadingComment,
  expandedComments,
  onClose,
  onEditTask,
  onDeleteTask,
  onSubmitComment,
  onFileSelect,
  onRemoveFile,
  onDeleteComment,
  onDeleteAttachment,
  onViewAttachment,
  onDownloadAttachment,
  onToggleCommentExpansion,
  calculateTaskProgress,
  calculateSubtaskStatistics,
  formatFileSize,
  getFileIcon,
  getFileTypeDisplay,
  isViewableInBrowser,
  viewingAttachment,
  viewerUrl,
  onCloseAttachmentViewer
}: TaskDetailsModalProps) {
  const [expandedSubtasks, setExpandedSubtasks] = React.useState(false);
  const [selectedSubtask, setSelectedSubtask] = React.useState<string | null>(null);

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

  const getSubtaskStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 text-green-800 border border-green-200";
      case "In Progress": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Todo": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getSubtaskStatusIcon = (status: string) => {
    switch(status) {
      case "Done": return <CheckSquare size={12} className="text-green-600" />;
      case "In Progress": return <ClockIcon size={12} className="text-blue-600" />;
      case "Todo": return <Square size={12} className="text-yellow-600" />;
      default: return <Square size={12} className="text-gray-400" />;
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

  const getTaskAssigneeDisplay = (task: Task) => {
    if (task.assigneeNames && task.assigneeNames.length > 0) {
      return task.assigneeNames;
    }
    const assigneeIds = task.assigneeIds || [];
    return employees
      .filter(emp => assigneeIds.includes(emp._id))
      .map(emp => emp.name);
  };

  const getTaskReporterDisplay = (task: Task) => {
    if (task.reporterNames && task.reporterNames.length > 0) {
      return task.reporterNames;
    }
    const reporterIds = task.reporterIds || [];
    return employees
      .filter(emp => reporterIds.includes(emp._id))
      .map(emp => emp.name);
  };

  const calculateSubtaskProgress = (subtasks: Subtask[] | undefined) => {
    if (!subtasks || subtasks.length === 0) {
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
    const total = subtasks.length;
    
    // Calculate overall progress based on individual progress percentages
    const totalProgress = subtasks.reduce((sum, subtask) => {
      return sum + (subtask.progressPercentage || 0);
    }, 0);
    
    const overallProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      done,
      inProgress,
      todo,
      overallProgress
    };
  };

  const subtaskStats = calculateSubtaskProgress(task.subtasks);
  const hasManySubtasks = task.subtasks && task.subtasks.length > 3;
  const visibleSubtasks = expandedSubtasks || !hasManySubtasks ? task.subtasks : task.subtasks?.slice(0, 3);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] mt-1 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Close"
              >
                <X size={18} className="text-slate-500" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">Task Details</h2>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${getIssueTypeColor(task.issueType)}`}>
                    {getIssueTypeIcon(task.issueType)}
                    <span>{task.issueType}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    <span>{task.status}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full font-mono">
                {task.issueKey || "No ID"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditTask(task)}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      onDeleteTask(task._id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
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
                  <h3 className="text-2xl font-bold text-slate-800">{task.summary || "No title"}</h3>
                  {task.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText size={16} />
                        Description
                      </h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Key Information Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                    <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${getPriorityColor(task.priority)}`}>
                      {getPriorityIcon(task.priority)}
                      <span>{task.priority}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Story Points</label>
                    <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl text-sm font-bold flex items-center gap-2">
                      <BarChart size={16} className="text-slate-500" />
                      {task.storyPoints || 0} SP
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Overall Progress</label>
                    <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl">
                      <div className="text-sm font-bold mb-1">{calculateTaskProgress(task)}%</div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            calculateTaskProgress(task) === 100 ? 'bg-green-500' :
                            calculateTaskProgress(task) >= 50 ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${calculateTaskProgress(task)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {task.subtasks?.length ? `Auto-calculated from ${task.subtasks.length} subtasks` : 'Manual progress'}
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
                        <span className="text-sm font-bold text-slate-800">{task.duration || 0} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Created:</span>
                        <span className="text-sm font-bold text-slate-800">{formatDateTime(task.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Updated:</span>
                        <span className="text-sm font-bold text-slate-800">{formatDateTime(task.updatedAt)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Due Date:</span>
                          <span className={`text-sm font-bold ${new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatDate(task.dueDate)}
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
                        <span className="text-sm font-bold text-slate-800">{task.estimatedHours || 0} hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Actual:</span>
                        <span className="text-sm font-bold text-slate-800">{task.actualHours || 0} hours</span>
                      </div>
                      {task.estimatedHours && task.actualHours && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Variance:</span>
                          <span className={`text-sm font-bold ${
                            task.actualHours > task.estimatedHours ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {(task.actualHours - task.estimatedHours).toFixed(1)} hours
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Subtasks Section */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ListTree size={16} />
                        Subtasks ({task.subtasks.length})
                        <span className="text-xs font-normal text-slate-500 ml-2">
                          Overall Progress: {subtaskStats.overallProgress}%
                        </span>
                      </h4>
                      {hasManySubtasks && (
                        <button
                          onClick={() => setExpandedSubtasks(!expandedSubtasks)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          {expandedSubtasks ? (
                            <>
                              <ChevronUp size={12} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              Show All ({task.subtasks.length})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Subtask Statistics Cards */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                        <div className="text-lg font-bold text-slate-800">{subtaskStats.total}</div>
                        <div className="text-xs text-slate-500">Total</div>
                      </div>
                      <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
                        <div className="text-lg font-bold text-green-600">{subtaskStats.done}</div>
                        <div className="text-xs text-green-600">Done</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {subtaskStats.total > 0 ? Math.round((subtaskStats.done / subtaskStats.total) * 100) : 0}%
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                        <div className="text-lg font-bold text-blue-600">{subtaskStats.inProgress}</div>
                        <div className="text-xs text-blue-600">In Progress</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {subtaskStats.total > 0 ? Math.round((subtaskStats.inProgress / subtaskStats.total) * 100) : 0}%
                        </div>
                      </div>
                      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-center">
                        <div className="text-lg font-bold text-yellow-600">{subtaskStats.todo}</div>
                        <div className="text-xs text-yellow-600">Todo</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {subtaskStats.total > 0 ? Math.round((subtaskStats.todo / subtaskStats.total) * 100) : 0}%
                        </div>
                      </div>
                    </div>

                    {/* Subtasks List - Scrollable when many */}
                    <div className={`bg-slate-50 rounded-xl border border-slate-200 p-4 ${
                      hasManySubtasks && expandedSubtasks ? 'max-h-96 overflow-y-auto' : ''
                    }`}>
                      <div className="space-y-2">
                        {visibleSubtasks?.map((subtask, index) => (
                          <div 
                            key={subtask._id || index} 
                            className={`p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer ${
                              selectedSubtask === subtask._id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            onClick={() => setSelectedSubtask(selectedSubtask === subtask._id ? null : subtask._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {getSubtaskStatusIcon(subtask.status)}
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800 text-sm">{subtask.title}</div>
                                  {selectedSubtask === subtask._id && subtask.description && (
                                    <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded">
                                      {subtask.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="text-xs text-slate-500">
                                      Progress: <span className="font-bold">{subtask.progressPercentage || 0}%</span>
                                    </div>
                                    {subtask.assigneeName && (
                                      <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <User size={10} />
                                        {subtask.assigneeName}
                                      </div>
                                    )}
                                    <div className="text-xs text-slate-500">
                                      Updated: {formatDate(subtask.updatedAt)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {/* Progress Bar for each subtask */}
                                <div className="w-24">
                                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>{subtask.progressPercentage || 0}%</span>
                                    <span>{subtask.status}</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full ${
                                        subtask.progressPercentage === 100 ? 'bg-green-500' :
                                        subtask.progressPercentage >= 50 ? 'bg-blue-500' :
                                        'bg-yellow-500'
                                      }`}
                                      style={{ width: `${subtask.progressPercentage || 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded view with detailed info */}
                            {selectedSubtask === subtask._id && (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500">Created:</span>
                                    <span className="font-bold ml-2">{formatDateTime(subtask.createdAt)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Last Updated:</span>
                                    <span className="font-bold ml-2">{formatDateTime(subtask.updatedAt)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {hasManySubtasks && !expandedSubtasks && task.subtasks.length > 3 && (
                          <div className="text-center py-3">
                            <div className="text-xs text-slate-500">
                              ...and {task.subtasks.length - 3} more subtasks
                            </div>
                            <button
                              onClick={() => setExpandedSubtasks(true)}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-1 mx-auto"
                            >
                              <ChevronDown size={12} />
                              Click to view all {task.subtasks.length} subtasks
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Overall Subtask Progress Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-slate-700">Overall Subtask Progress</div>
                        <div className="text-sm font-bold text-slate-800">{subtaskStats.overallProgress}%</div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            subtaskStats.overallProgress === 100 ? 'bg-green-500' :
                            subtaskStats.overallProgress >= 50 ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${subtaskStats.overallProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Based on {subtaskStats.total} subtasks</span>
                        <span>
                          {subtaskStats.done} done • {subtaskStats.inProgress} in progress • {subtaskStats.todo} todo
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Labels */}
                {task.labels && task.labels.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Tag size={16} />
                      Labels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {task.labels.map((label, index) => (
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

                {/* Assignees and Reporters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <User size={16} />
                      Assignees
                    </h4>
                    <div className="space-y-2">
                      {getTaskAssigneeDisplay(task).map((name, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{name}</div>
                            <div className="text-xs text-slate-500">
                              {task.assigneeEmails?.[index] || "No email"}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getTaskAssigneeDisplay(task).length === 0 && (
                        <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-500">No assignees</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <User size={16} />
                      Reporters
                    </h4>
                    <div className="space-y-2">
                      {getTaskReporterDisplay(task).map((name, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{name}</div>
                            <div className="text-xs text-slate-500">
                              {task.reporterEmails?.[index] || "No email"}
                            </div>
                          </div>
                        </div>
                      ))}
                      {getTaskReporterDisplay(task).length === 0 && (
                        <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-500">No reporters</p>
                        </div>
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
                        onChange={onFileSelect}
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
                                onClick={() => onRemoveFile(index)}
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
                      onClick={onSubmitComment}
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
                                onClick={() => onDeleteComment(comment._id)}
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
                                  onClick={() => onToggleCommentExpansion(comment._id)}
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
                                            onClick={() => onViewAttachment(attachment)}
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
                                          onClick={() => onDownloadAttachment(attachment)}
                                          className="p-1 hover:bg-green-100 rounded text-green-500"
                                          title="Download"
                                        >
                                          <Download size={12} />
                                        </button>
                                        <button
                                          onClick={() => onDeleteAttachment(attachment._id || attachment.id || '', comment._id)}
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
                                    onClick={() => onViewAttachment(attachment)}
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
                                  onClick={() => onDownloadAttachment(attachment)}
                                  className="p-1.5 hover:bg-green-100 rounded-lg text-green-500"
                                  title="Download"
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  onClick={() => onDeleteAttachment(attachment._id || attachment.id || '', attachment.commentId)}
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
              Created by: {task.createdBy || "Unknown"} • Last updated: {formatDateTime(task.updatedAt)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={onCloseAttachmentViewer}>
          <div 
            className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={onCloseAttachmentViewer}
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
                  onClick={() => onDownloadAttachment(viewingAttachment)}
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
                        onClick={() => onDownloadAttachment(viewingAttachment)}
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
                onClick={onCloseAttachmentViewer}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}