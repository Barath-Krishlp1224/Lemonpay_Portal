"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
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
  ListTree
} from "lucide-react";
import {
  Task,
  Subtask,
  Employee,
  SubtaskChangeHandler,
  SubtaskPathHandler,
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

// --- Status Color Logic (Backgrounds only, Text is Black) ---
const getStatusBgColor = (status: string = "") => {
  switch (status.toLowerCase()) {
    case "completed":
    case "done":
      return "bg-emerald-200 border-emerald-300";
    case "in progress":
      return "bg-blue-200 border-blue-300";
    case "to do":
    case "todo":
      return "bg-slate-200 border-slate-300";
    case "paused":
      return "bg-amber-200 border-amber-300";
    case "backlog":
      return "bg-purple-200 border-purple-300";
    default:
      return "bg-slate-100 border-slate-200";
  }
};

// --- Get Subtask Progress with Fallback ---
const getSubtaskProgress = (subtask: Subtask): number => {
  // Check if progress property exists
  if ('progress' in subtask && subtask.progress !== undefined) {
    return Number(subtask.progress) || 0;
  }
  
  // Fallback: Calculate progress based on status
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
    // Employee can edit subtask if:
    // 1. They are assigned to it, OR
    // 2. Subtask has no assignee (unassigned)
    if (!subtask.assigneeName) return true; // Unassigned subtasks can be edited by any employee
    return subtask.assigneeName.toLowerCase() === currentUser.name.toLowerCase();
  }
  
  return false;
};

// --- Sub-Components ---
const DueDateReminder: React.FC<{ dueDate?: string | null; endDate?: string | null; status?: string }> = ({ dueDate, endDate, status }) => {
  const daysToDue = calculateDaysDiff(dueDate);
  const daysToEnd = calculateDaysDiff(endDate);
  if (status === "Completed" || (daysToDue === null && daysToEnd === null)) return null;
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
        // Safely get progress with fallback
        const progress = getSubtaskProgress(sub);
        const subStatus = sub.status || "To Do";
        const subTitle = sub.title || "Untitled Subtask";
        const subAssignee = sub.assigneeName || "";
        
        // Check if current user can edit this specific subtask
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
  allTaskStatuses: string[];
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
  isLoading?: boolean;
  currentUserRole?: string;
  currentUserId?: string;
  currentUserName?: string;
}

const TaskModal: React.FC<TaskModalProps> = (props) => {
  const {
    task, isOpen, onClose, isEditing, draftTask, subtasks, employees,
    currentProjectPrefix, allTaskStatuses, handleEdit, handleDelete,
    handleUpdate, cancelEdit, handleDraftChange, handleSubtaskChange,
    addSubtask, removeSubtask, onToggleEdit, onToggleExpansion,
    handleStartSprint, onTaskStatusChange, onSubtaskStatusChange, isLoading = false,
    currentUserRole = "Employee", currentUserId = "", currentUserName = ""
  } = props;

  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(null);
  
  // Get current user info from localStorage if not provided
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

  // Debug logging
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

  // Use subtasks from props if editing, otherwise from task
  const subtasksToDisplay = isEditing ? subtasks : (task.subtasks || []);
  
  const totalTime = useMemo(() => sumAllSubtasksTime(subtasksToDisplay), [subtasksToDisplay]);
  const totalPoints = useMemo(() => sumAllSubtasksStoryPoints(subtasksToDisplay), [subtasksToDisplay]);
  const current = isEditing ? draftTask : task;

  // Get task display name - using summary, title, name, or fallback to taskId
  const taskDisplayName = task.displayName || 
                         task.summary || 
                         task.title || 
                         task.name || 
                         `Task ${task.taskId || task._id?.substring(0, 8)}`;

  // Get epic name - prefer epicName, then fallback to project name
  const epicName = task.epicName || task.projectName || 'Epic not specified';

  // Check if current user can edit this task (Admin/Manager always can)
  const canEditTask = useMemo(() => {
    if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
    
    if (currentUser.role === "Employee") {
      // Employees can edit task if:
      // 1. Task is assigned to them, OR
      // 2. Task has no assignees (unassigned)
      if (!task.assigneeNames || task.assigneeNames.length === 0) return true;
      
      const isAssigned = task.assigneeNames?.some(
        name => name.toLowerCase() === currentUser.name.toLowerCase()
      );
      
      return isAssigned;
    }
    
    return false;
  }, [task, currentUser]);

  // Check if user can edit subtasks in general (for the "Edit Subtasks" button)
  const canEditSubtasks = useMemo(() => {
    if (currentUser.role === "Admin" || currentUser.role === "Manager") return true;
    
    if (currentUser.role === "Employee") {
      // Employees can edit subtasks if:
      // 1. They can edit the task itself, OR
      // 2. There are subtasks assigned to them
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

  if (!isOpen) return null;
  if (isLoading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl flex flex-col w-full max-w-7xl max-h-[80vh] mt-20 overflow-hidden" onClick={e => e.stopPropagation()}>
        
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
          {task.status === "Backlog" && !isEditing && canEditTask && (
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