"use client";

import React, { useState, useCallback } from "react";
import { 
  ArrowLeft, Check, Tag, X, ChevronDown, User, Calendar, Clock,
  FileText, Target, PlusCircle, Edit2, Trash2, BarChart, AlertCircle,
  BookOpen, ClipboardCheck, Bug, CheckCircle, Clock as ClockIcon,
  Bookmark, Archive, AlertTriangle, Flag, BarChart3, Hash, CalendarDays
} from "lucide-react";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

interface TaskFormData {
  summary: string;
  description: string;
  issueType: "Story" | "Task" | "Bug";
  status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
  priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
  assigneeIds: string[];
  reporterIds: string[];
  storyPoints: number;
  labels: string[];
  currentLabel: string;
  dueDate: string;
  duration: number;
  estimatedHours: number;
  actualHours: number;
  completion: number;
}

interface TaskFormProps {
  selectedProject: SavedProject;
  selectedEpic: Epic;
  employees: Employee[];
  editingTaskId: string | null;
  taskFormData: TaskFormData;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  onFormDataChange: (data: TaskFormData) => void;
  generateIssueKey: () => string;
}

export default function TaskForm({
  selectedProject,
  selectedEpic,
  employees,
  editingTaskId,
  taskFormData,
  loading,
  onBack,
  onSubmit,
  onFormDataChange,
  generateIssueKey
}: TaskFormProps) {
  
  const handleAddLabel = useCallback(() => {
    if (taskFormData.currentLabel.trim() && !taskFormData.labels.includes(taskFormData.currentLabel.trim())) {
      const newLabels = [...taskFormData.labels, taskFormData.currentLabel.trim()];
      onFormDataChange({ ...taskFormData, labels: newLabels, currentLabel: "" });
    }
  }, [taskFormData, onFormDataChange]);

  const handleRemoveLabel = useCallback((label: string) => {
    const newLabels = taskFormData.labels.filter(l => l !== label);
    onFormDataChange({ ...taskFormData, labels: newLabels });
  }, [taskFormData, onFormDataChange]);

  const handleLabelKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  }, [handleAddLabel]);

  const handleAssigneeToggle = useCallback((employeeId: string) => {
    const currentAssigneeIds = [...taskFormData.assigneeIds];
    let newAssigneeIds;
    
    if (currentAssigneeIds.includes(employeeId)) {
      newAssigneeIds = currentAssigneeIds.filter(id => id !== employeeId);
    } else {
      newAssigneeIds = [...currentAssigneeIds, employeeId];
    }
    
    onFormDataChange({ ...taskFormData, assigneeIds: newAssigneeIds });
  }, [taskFormData, onFormDataChange]);

  const handleReporterToggle = useCallback((employeeId: string) => {
    const currentReporterIds = [...taskFormData.reporterIds];
    let newReporterIds;
    
    if (currentReporterIds.includes(employeeId)) {
      newReporterIds = currentReporterIds.filter(id => id !== employeeId);
    } else {
      newReporterIds = [...currentReporterIds, employeeId];
    }
    
    onFormDataChange({ ...taskFormData, reporterIds: newReporterIds });
  }, [taskFormData, onFormDataChange]);

  const handleFormCompletionChange = (value: number) => {
    onFormDataChange({
      ...taskFormData,
      completion: Math.max(0, Math.min(100, value))
    });
  };

  const getSelectedAssignees = () => {
    return employees.filter(emp => taskFormData.assigneeIds.includes(emp._id));
  };

  const getSelectedReporters = () => {
    return employees.filter(emp => taskFormData.reporterIds.includes(emp._id));
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Form Header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pt-2 pb-4 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
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
            onChange={(e) => onFormDataChange({...taskFormData, summary: e.target.value})}
            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
            placeholder="Brief summary of the task"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
          <textarea
            value={taskFormData.description}
            onChange={(e) => onFormDataChange({...taskFormData, description: e.target.value})}
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
                onChange={(e) => onFormDataChange({...taskFormData, issueType: e.target.value as any})}
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
                onChange={(e) => onFormDataChange({...taskFormData, status: e.target.value as any})}
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
                onChange={(e) => onFormDataChange({...taskFormData, priority: e.target.value as any})}
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

        {/* Progress Field */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
            Overall Progress
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-700">Completion</span>
                  <span className="text-xs font-bold text-slate-700">{taskFormData.completion}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={taskFormData.completion}
                  onChange={(e) => handleFormCompletionChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3fa87d]"
                />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={taskFormData.completion}
                onChange={(e) => handleFormCompletionChange(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-[#3fa87d] transition-all"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Note: Progress will be auto-calculated from subtasks when they exist
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
              onChange={(e) => onFormDataChange({...taskFormData, storyPoints: Math.max(0, parseInt(e.target.value) || 0)})}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">Duration (days)</label>
            <input
              type="number"
              min="0"
              value={taskFormData.duration}
              onChange={(e) => onFormDataChange({...taskFormData, duration: Math.max(0, parseInt(e.target.value) || 0)})}
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
              onChange={(e) => onFormDataChange({...taskFormData, dueDate: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase">Labels</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={taskFormData.currentLabel}
                onChange={(e) => onFormDataChange({...taskFormData, currentLabel: e.target.value})}
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
              onChange={(e) => onFormDataChange({...taskFormData, estimatedHours: Math.max(0, parseInt(e.target.value) || 0)})}
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
              onChange={(e) => onFormDataChange({...taskFormData, actualHours: Math.max(0, parseInt(e.target.value) || 0)})}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
              placeholder="Hours spent so far"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={onSubmit}
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
  );
}