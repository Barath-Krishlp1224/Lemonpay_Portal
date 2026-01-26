"use client";

import React, { useState, useMemo } from "react";
import { 
  FileText, ArrowLeft, Search, Filter, Flag, GitBranch, Calendar, Clock,
  CalendarDays, MessageSquare, Edit2, Trash2, User, Tag, ListTree,
  BookOpen, ClipboardCheck, Bug, CheckCircle, Clock as ClockIcon,
  Bookmark, Archive, AlertTriangle, BarChart3, Eye,
  PlusCircle, X, Target, File
} from "lucide-react";
import type { Employee, SavedProject, Epic, Task as TaskType } from "@/app/types/project";



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

interface TasksListProps {
  selectedProject: SavedProject | null;
  selectedEpic: Epic | null;
  employees: Employee[];
  tasks: Task[];
  loadingTasks: boolean;
  onBackToEpics: () => void;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewTask: (task: Task) => void;
  taskSearchQuery: string;
  setTaskSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  issueTypeFilter: string;
  setIssueTypeFilter: (type: string) => void;
  calculateTaskProgress: (task: Task) => number;
  calculateSubtaskStatistics: (subtasks: Subtask[] | undefined) => {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
    overallProgress: number;
  };
}

export default function TasksList({
  selectedProject,
  selectedEpic,
  employees,
  tasks,
  loadingTasks,
  onBackToEpics,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onViewTask,
  taskSearchQuery,
  setTaskSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  issueTypeFilter,
  setIssueTypeFilter,
  calculateTaskProgress,
  calculateSubtaskStatistics
}: TasksListProps) {
  
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

  return (
    <div className="flex-1 flex flex-col">
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
        <button
          onClick={onNewTask}
          className="px-4 py-2 bg-[#3fa87d] hover:bg-[#35946d] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          <PlusCircle size={14} /> New Task or Bug
        </button>
      </div>

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
              <X size={12} /> Clear all filters
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
                onClick={onNewTask}
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
              const subtaskStats = calculateSubtaskStatistics(task.subtasks);
              const taskProgress = calculateTaskProgress(task);
              
              return (
                <div 
                  key={task._id} 
                  className="border-2 border-slate-200 rounded-2xl hover:border-[#3fa87d]/50 transition-colors bg-white cursor-pointer hover:shadow-md"
                  onClick={() => onViewTask(task)}
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
                            onEditTask(task);
                          }}
                          className="p-1 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task._id);
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
                        <span className="text-xs font-bold text-slate-700">Overall Progress</span>
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
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Based on: {task.subtasks?.length || 0} subtasks</span>
                        <span>•</span>
                        <span>Auto-calculated from subtask status</span>
                      </div>
                    </div>

                    {/* Subtasks Summary */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ListTree size={14} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-700">Subtasks Breakdown</span>
                          </div>
                          <span className="text-xs font-bold text-slate-700">{subtaskStats.overallProgress}%</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-500">
                          <div className="text-center">
                            <div className="font-bold text-slate-700">{subtaskStats.total}</div>
                            <div>Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">{subtaskStats.done}</div>
                            <div>Done</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-600">{subtaskStats.inProgress}</div>
                            <div>In Progress</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-yellow-600">{subtaskStats.todo}</div>
                            <div>Todo</div>
                          </div>
                        </div>
                        {/* Progress bar for subtasks */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500">Subtask Progress</span>
                            <span className="text-[10px] font-bold text-slate-700">{subtaskStats.overallProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                subtaskStats.overallProgress === 100 ? 'bg-green-500' :
                                subtaskStats.overallProgress >= 50 ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}
                              style={{ width: `${subtaskStats.overallProgress}%` }}
                            />
                          </div>
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
  );
}