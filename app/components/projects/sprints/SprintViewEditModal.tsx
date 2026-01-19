"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Edit2, Save, Trash2, Calendar, Users, Clock, 
  TrendingUp, Target, FileText, CheckCircle, AlertCircle,
  PlayCircle, CheckSquare, Square, ListTree, User,
  Mail, Briefcase, Tag, ExternalLink, GitBranch,
  BarChart3, Eye, EyeOff, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, Rocket, Zap, ClipboardCheck,
  BookOpen, Bug, Flag, Archive, Bookmark,
  MessageSquare, Paperclip, Layers, PieChart,
  ArrowLeft, ArrowRight, RefreshCw, Download, Plus,
  Search, Filter, ChevronUp, Copy, MoveRight, GitPullRequest
} from "lucide-react";
import type { Sprint, Employee, SavedProject } from "@/app/types/project";

interface Task {
  _id: string;
  summary: string;
  description?: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  reporterIds: string[];
  storyPoints?: number;
  issueType: string;
  issueKey: string;
  assigneeDetails?: Employee[];
  reporterDetails?: Employee[];
  assigneeNames?: string[];
  reporterNames?: string[];
  labels?: string[];
  dueDate?: string;
  duration?: number;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
}

interface SprintViewEditModalProps {
  show: boolean;
  onClose: () => void;
  sprint: Sprint;
  editing: boolean;
  project: SavedProject;
  employees: Employee[];
  onSprintUpdated: (updatedSprint: Sprint) => void;
  onSprintDeleted: (sprintId: string) => void;
}

export default function SprintViewEditModal({
  show,
  onClose,
  sprint,
  editing,
  project,
  employees,
  onSprintUpdated,
  onSprintDeleted
}: SprintViewEditModalProps) {
  const [isEditing, setIsEditing] = useState(editing);
  const [formData, setFormData] = useState<any>(sprint);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'metrics' | 'settings'>('overview');
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [selectedBacklogTasks, setSelectedBacklogTasks] = useState<string[]>([]);
  const [searchBacklog, setSearchBacklog] = useState("");
  const [showBacklogPanel, setShowBacklogPanel] = useState(false);
  const [loadingBacklog, setLoadingBacklog] = useState(false);

  useEffect(() => {
    setFormData(sprint);
    setIsEditing(editing);
  }, [sprint, editing]);

  // Fetch backlog tasks when in editing mode
  useEffect(() => {
    if (isEditing && show) {
      fetchBacklogTasks();
    }
  }, [isEditing, show]);

  const fetchBacklogTasks = async () => {
    setLoadingBacklog(true);
    try {
      // Try multiple query formats to get backlog tasks
      let response;
      
      // First try: Get tasks without sprint assignment
      response = await fetch(`/api/tasks?projectId=${project._id}&sprintId=none`);
      if (!response.ok) {
        // Second try: Get all tasks and filter client-side
        response = await fetch(`/api/tasks?projectId=${project._id}`);
      }
      
      const data = await response.json();
      if (response.ok) {
        // Filter tasks that are not in the current sprint
        const allTasks = data.data || [];
        const sprintTaskIds = sprint.tasks?.map((task: any) => task._id) || [];
        
        const backlogTasks = allTasks.filter((task: Task) => {
          // Tasks without sprintId or with empty sprintId
          const hasNoSprint = !task.sprintId || task.sprintId === '' || task.sprintId === 'none';
          
          // Tasks not in current sprint
          const notInCurrentSprint = !sprintTaskIds.includes(task._id);
          
          return hasNoSprint && notInCurrentSprint;
        });
        
        setBacklogTasks(backlogTasks);
      }
    } catch (error) {
      console.error("Error fetching backlog tasks:", error);
      setMessage("❌ Failed to load backlog tasks");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoadingBacklog(false);
    }
  };

  if (!show) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (status: string) => {
    setFormData((prev: any) => ({
      ...prev,
      status
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Sprint updated successfully!");
        onSprintUpdated(data.data);
        setIsEditing(false);
        setShowBacklogPanel(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || "Failed to update sprint"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error updating sprint:", err);
      setMessage("❌ Network error. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this sprint? All tasks will be moved to backlog.")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprint._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Sprint deleted successfully!");
        onSprintDeleted(sprint._id);
        setTimeout(() => onClose(), 1000);
      } else {
        setMessage(`❌ ${data.error || "Failed to delete sprint"}`);
      }
    } catch (err) {
      console.error("Error deleting sprint:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAddTasksToSprint = async () => {
    if (selectedBacklogTasks.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprint._id}/add-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds: selectedBacklogTasks }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Tasks added to sprint successfully!");
        // Refresh sprint data
        const sprintResponse = await fetch(`/api/sprints/${sprint._id}`);
        const sprintData = await sprintResponse.json();
        if (sprintResponse.ok) {
          onSprintUpdated(sprintData.data);
        }
        setSelectedBacklogTasks([]);
        fetchBacklogTasks();
        setShowBacklogPanel(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || "Failed to add tasks"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error adding tasks to sprint:", err);
      setMessage("❌ Network error. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTaskFromSprint = async (taskId: string) => {
    if (!confirm("Remove this task from sprint? It will be moved back to backlog.")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sprintId: null, status: 'Backlog' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Task removed from sprint!");
        // Refresh sprint data
        const sprintResponse = await fetch(`/api/sprints/${sprint._id}`);
        const sprintData = await sprintResponse.json();
        if (sprintResponse.ok) {
          onSprintUpdated(sprintData.data);
        }
        fetchBacklogTasks();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || "Failed to remove task"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error removing task from sprint:", err);
      setMessage("❌ Network error. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAddTasks = async () => {
    if (!confirm("Automatically add all backlog tasks to this sprint?")) return;
    
    setLoading(true);
    try {
      // Get all backlog task IDs
      const taskIds = backlogTasks.map(task => task._id);
      
      if (taskIds.length === 0) {
        setMessage("ℹ️ No backlog tasks to add");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      
      const response = await fetch(`/api/sprints/${sprint._id}/add-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${taskIds.length} tasks added to sprint successfully!`);
        // Refresh sprint data
        const sprintResponse = await fetch(`/api/sprints/${sprint._id}`);
        const sprintData = await sprintResponse.json();
        if (sprintResponse.ok) {
          onSprintUpdated(sprintData.data);
        }
        setSelectedBacklogTasks([]);
        setBacklogTasks([]);
        setShowBacklogPanel(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || "Failed to add tasks"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error adding tasks to sprint:", err);
      setMessage("❌ Network error. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
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
      return "Invalid date";
    }
  };

  const calculateMetrics = () => {
    const tasks = sprint.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task: any) => task.status === 'Done').length;
    const inProgressTasks = tasks.filter((task: any) => task.status === 'In Progress').length;
    const todoTasks = tasks.filter((task: any) => task.status === 'To Do' || task.status === 'Todo').length;
    const reviewTasks = tasks.filter((task: any) => task.status === 'Review').length;
    
    const totalPoints = tasks.reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((task: any) => task.status === 'Done')
      .reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0);

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const pointsProgressPercentage = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      totalPoints,
      completedPoints,
      progressPercentage,
      pointsProgressPercentage
    };
  };

  const metrics = calculateMetrics();

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case "active": return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "planned": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case "active": return <PlayCircle className="text-purple-600" size={16} />;
      case "completed": return <CheckCircle className="text-green-600" size={16} />;
      case "planned": return <Calendar className="text-blue-600" size={16} />;
      default: return <FileText className="text-gray-600" size={16} />;
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    switch(issueType) {
      case "Story": return <BookOpen size={12} />;
      case "Task": return <ClipboardCheck size={12} />;
      case "Bug": return <Bug size={12} />;
      default: return <FileText size={12} />;
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

  const getAssigneeName = (assigneeIds: string[]) => {
    if (!assigneeIds || assigneeIds.length === 0) return "Unassigned";
    return assigneeIds.map(id => {
      const employee = employees.find(e => e._id === id);
      return employee ? employee.name : "Unknown";
    }).join(", ");
  };

  const filteredBacklogTasks = backlogTasks.filter(task => 
    task.summary.toLowerCase().includes(searchBacklog.toLowerCase()) ||
    task.issueKey.toLowerCase().includes(searchBacklog.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchBacklog.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-6xl max-h-[80vh] mt-20 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              title="Close"
            >
              <X size={20} className="text-slate-500" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(sprint.status)}
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditing ? "Edit Sprint" : "Sprint Details"}
                </h2>
                <span className={`px-2 py-0.5 text-xs font-black rounded-full border ${getStatusColor(sprint.status)}`}>
                  {sprint.status}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                {sprint.name} • {project.name}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && sprint.status === "Planned" && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'overview' 
                  ? 'border-purple-600 text-purple-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'tasks' 
                  ? 'border-purple-600 text-purple-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Tasks ({metrics.totalTasks})
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'metrics' 
                  ? 'border-purple-600 text-purple-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Metrics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'settings' 
                  ? 'border-purple-600 text-purple-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Sprint Goal */}
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Sprint Goal</label>
                    <textarea
                      name="goal"
                      value={formData.goal || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all min-h-[100px] resize-y text-slate-800 placeholder:text-slate-500"
                      placeholder="What is the main goal of this sprint?"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2">Sprint Goal</h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-700">{sprint.goal || "No goal set"}</p>
                    </div>
                  </div>
                )}

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Total Tasks</div>
                    <div className="text-2xl font-bold text-slate-800">{metrics.totalTasks}</div>
                    <div className="text-xs text-slate-500 mt-1">{metrics.completedTasks} completed</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Story Points</div>
                    <div className="text-2xl font-bold text-slate-800">{metrics.totalPoints}</div>
                    <div className="text-xs text-slate-500 mt-1">{metrics.completedPoints} completed</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Progress</div>
                    <div className="text-2xl font-bold text-slate-800">{metrics.progressPercentage}%</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${metrics.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Duration</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {sprint.startDate && sprint.endDate 
                        ? `${Math.ceil((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                        : "N/A"
                      }
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Timeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Start Date</label>
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleDateChange('startDate', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                            placeholder="Select start date"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">End Date</label>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleDateChange('endDate', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                            placeholder="Select end date"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">Start Date</div>
                          <div className="text-sm font-bold text-slate-800">{formatDate(sprint.startDate)}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">End Date</div>
                          <div className="text-sm font-bold text-slate-800">{formatDate(sprint.endDate)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Status</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2">
                      {["Planned", "Active", "Completed"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                            formData.status === status
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${getStatusColor(sprint.status)}`}>
                      {getStatusIcon(sprint.status)}
                      <span className="text-sm font-bold">{sprint.status}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                {/* Tasks Header with Add Button */}
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <div className="text-xs text-blue-600">To Do</div>
                      <div className="text-lg font-bold text-blue-800">{metrics.todoTasks}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                      <div className="text-xs text-yellow-600">In Progress</div>
                      <div className="text-lg font-bold text-yellow-800">{metrics.inProgressTasks}</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                      <div className="text-xs text-purple-600">Review</div>
                      <div className="text-lg font-bold text-purple-800">{metrics.reviewTasks}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                      <div className="text-xs text-green-600">Done</div>
                      <div className="text-lg font-bold text-green-800">{metrics.completedTasks}</div>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      {backlogTasks.length > 0 && (
                        <button
                          onClick={handleAutoAddTasks}
                          disabled={loading}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                          title="Add all backlog tasks to sprint"
                        >
                          <Rocket size={16} />
                          Add All ({backlogTasks.length})
                        </button>
                      )}
                      <button
                        onClick={() => setShowBacklogPanel(!showBacklogPanel)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        {showBacklogPanel ? 'Hide Backlog' : 'Add from Backlog'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Backlog Panel for Adding Tasks */}
                {isEditing && showBacklogPanel && (
                  <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-700">Add Tasks from Backlog</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {backlogTasks.length} available tasks
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (selectedBacklogTasks.length === backlogTasks.length) {
                              setSelectedBacklogTasks([]);
                            } else {
                              setSelectedBacklogTasks(backlogTasks.map(task => task._id));
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {selectedBacklogTasks.length === backlogTasks.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                          onClick={() => setShowBacklogPanel(false)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search backlog tasks..."
                        value={searchBacklog}
                        onChange={(e) => setSearchBacklog(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-500"
                      />
                    </div>

                    {/* Backlog Tasks List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {loadingBacklog ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                          <p className="text-slate-500 mt-2">Loading backlog tasks...</p>
                        </div>
                      ) : filteredBacklogTasks.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-slate-500">
                            {searchBacklog ? 'No matching tasks found' : 'No backlog tasks available'}
                          </p>
                        </div>
                      ) : (
                        filteredBacklogTasks.map(task => (
                          <div key={task._id} className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedBacklogTasks.includes(task._id)}
                                onChange={() => {
                                  setSelectedBacklogTasks(prev =>
                                    prev.includes(task._id)
                                      ? prev.filter(id => id !== task._id)
                                      : [...prev, task._id]
                                  );
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`px-2 py-1 rounded text-[10px] font-black ${getIssueTypeColor(task.issueType)}`}>
                                    {task.issueType}
                                  </div>
                                  <div className={`px-2 py-1 rounded text-[10px] font-black ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </div>
                                  <div className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                    {task.issueKey}
                                  </div>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800">{task.summary}</h4>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                  <div className="flex items-center gap-1">
                                    <User size={10} />
                                    <span>{getAssigneeName(task.assigneeIds)}</span>
                                  </div>
                                  {task.storyPoints && (
                                    <div className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                                      {task.storyPoints} SP
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-slate-600">
                        {selectedBacklogTasks.length} of {filteredBacklogTasks.length} selected
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBacklogTasks([])}
                          className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                          disabled={selectedBacklogTasks.length === 0}
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleAddTasksToSprint}
                          disabled={selectedBacklogTasks.length === 0 || loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MoveRight size={14} />
                          )}
                          Add {selectedBacklogTasks.length} Task{selectedBacklogTasks.length > 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Sprint Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">Sprint Tasks ({metrics.totalTasks})</h3>
                    {isEditing && backlogTasks.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {backlogTasks.length} backlog tasks available
                        </span>
                      </div>
                    )}
                  </div>

                  {sprint.tasks && sprint.tasks.length > 0 ? (
                    sprint.tasks.map((task: any) => (
                      <div key={task._id} className="border border-slate-200 rounded-xl bg-white">
                        <div 
                          className="p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getIssueTypeColor(task.issueType)}`}>
                                  {getIssueTypeIcon(task.issueType)}
                                  <span>{task.issueType}</span>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                  <Flag size={10} />
                                  <span>{task.priority}</span>
                                </div>
                                <div className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                  {task.issueKey}
                                </div>
                              </div>
                              <div className="flex items-start justify-between">
                                <h4 className="font-bold text-slate-800">{task.summary}</h4>
                                {isEditing && (
                                  <button
                                    onClick={() => handleRemoveTaskFromSprint(task._id)}
                                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 ml-2"
                                    title="Remove from sprint"
                                  >
                                    <X size={12} />
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.storyPoints && (
                                <div className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                  {task.storyPoints} SP
                                </div>
                              )}
                              <button
                                onClick={() => toggleTaskExpansion(task._id)}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                <ChevronRight 
                                  size={16} 
                                  className={`text-slate-400 transition-transform ${expandedTasks.includes(task._id) ? 'rotate-90' : ''}`}
                                />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>
                                {task.assigneeNames && task.assigneeNames.length > 0 
                                  ? task.assigneeNames.join(', ')
                                  : 'Unassigned'
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{formatDate(task.createdAt)}</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              task.status === 'Done' ? 'bg-green-100 text-green-800' :
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {task.status}
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Task Details */}
                        {expandedTasks.includes(task._id) && (
                          <div className="p-4 border-t border-slate-200 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                {task.description && (
                                  <div>
                                    <div className="text-xs font-bold text-slate-500 mb-1">Description</div>
                                    <p className="text-sm text-slate-700">{task.description}</p>
                                  </div>
                                )}
                                
                                <div>
                                  <div className="text-xs font-bold text-slate-500 mb-2">Assignees</div>
                                  <div className="flex flex-wrap gap-2">
                                    {task.assigneeDetails && task.assigneeDetails.length > 0 ? (
                                      task.assigneeDetails.map((assignee: Employee) => (
                                        <div key={assignee._id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                            {assignee.name.charAt(0)}
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-slate-800">{assignee.name}</div>
                                            <div className="text-[10px] text-slate-500">{assignee.role}</div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-sm text-slate-500 italic">No assignees</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                {task.labels && task.labels.length > 0 && (
                                  <div>
                                    <div className="text-xs font-bold text-slate-500 mb-2">Labels</div>
                                    <div className="flex flex-wrap gap-1">
                                      {task.labels.map((label: string, index: number) => (
                                        <span key={index} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded-full">
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3">
                                  {task.estimatedHours && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                      <div className="text-xs text-slate-500">Est. Hours</div>
                                      <div className="text-sm font-bold text-slate-800">{task.estimatedHours}h</div>
                                    </div>
                                  )}
                                  {task.actualHours && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                      <div className="text-xs text-slate-500">Actual Hours</div>
                                      <div className="text-sm font-bold text-slate-800">{task.actualHours}h</div>
                                    </div>
                                  )}
                                  {task.dueDate && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                      <div className="text-xs text-slate-500">Due Date</div>
                                      <div className="text-sm font-bold text-slate-800">{formatDate(task.dueDate)}</div>
                                    </div>
                                  )}
                                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500">Created</div>
                                    <div className="text-sm font-bold text-slate-800">{formatDate(task.createdAt)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                      <p className="text-slate-400 font-bold">No tasks in this sprint</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {isEditing ? "Add tasks from backlog using the button above" : "Add tasks to this sprint from the task management view"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-6">
                {/* Progress Chart */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Sprint Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                        <span>Task Completion</span>
                        <span>{metrics.progressPercentage}%</span>
                      </div>
                      <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${metrics.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                        <span>Story Points</span>
                        <span>{metrics.pointsProgressPercentage}%</span>
                      </div>
                      <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${metrics.pointsProgressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Task Distribution</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'To Do', count: metrics.todoTasks, color: 'bg-blue-500' },
                        { label: 'In Progress', count: metrics.inProgressTasks, color: 'bg-yellow-500' },
                        { label: 'Review', count: metrics.reviewTasks, color: 'bg-purple-500' },
                        { label: 'Done', count: metrics.completedTasks, color: 'bg-green-500' }
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                            <span className="text-sm text-slate-700">{item.label}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.count} ({metrics.totalTasks > 0 ? Math.round((item.count / metrics.totalTasks) * 100) : 0}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Story Point Distribution</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Completed</span>
                          <span className="font-bold text-slate-800">{metrics.completedPoints} pts</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${metrics.pointsProgressPercentage}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Remaining</span>
                          <span className="font-bold text-slate-800">{metrics.totalPoints - metrics.completedPoints} pts</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${100 - metrics.pointsProgressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sprint Velocity */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Sprint Velocity</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="text-xs text-blue-600">Planned Points</div>
                      <div className="text-lg font-bold text-blue-800">{metrics.totalPoints}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="text-xs text-green-600">Completed Points</div>
                      <div className="text-lg font-bold text-green-800">{metrics.completedPoints}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <div className="text-xs text-purple-600">Remaining Points</div>
                      <div className="text-lg font-bold text-purple-800">{metrics.totalPoints - metrics.completedPoints}</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                      <div className="text-xs text-yellow-600">Velocity</div>
                      <div className="text-lg font-bold text-yellow-800">
                        {Math.round((metrics.completedPoints / (metrics.totalTasks > 0 ? metrics.totalTasks : 1)) * 100) / 100}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Sprint Settings */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Sprint Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Sprint Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                        disabled={!isEditing}
                        placeholder="Enter sprint name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Sprint Goal</label>
                      <textarea
                        name="goal"
                        value={formData.goal || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all min-h-[80px] resize-y text-slate-800 placeholder:text-slate-500"
                        disabled={!isEditing}
                        placeholder="What is the main objective of this sprint?"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Start Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleDateChange('startDate', e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                          disabled={!isEditing}
                          placeholder="Select start date"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleDateChange('endDate', e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                          disabled={!isEditing}
                          placeholder="Select end date"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Velocity (Story Points)</label>
                      <input
                        type="number"
                        name="velocity"
                        value={formData.velocity || 20}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all text-slate-800 placeholder:text-slate-500"
                        disabled={!isEditing}
                        placeholder="Enter velocity"
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
                  <h3 className="text-sm font-bold text-red-700 mb-4">Danger Zone</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-red-600 mb-2">
                        Deleting this sprint will move all assigned tasks back to backlog.
                      </p>
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete Sprint
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-slate-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Project Info */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Project</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#3fa87d] rounded-lg flex items-center justify-center">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{project.name}</div>
                      <div className="text-xs text-slate-500">{project.key}</div>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3">{project.description}</p>
                  )}
                </div>
              </div>

              {/* Sprint Info */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Sprint Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-black rounded-full ${getStatusColor(sprint.status)}`}>
                      {sprint.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Created</span>
                    <span className="font-medium text-slate-800">{formatDate(sprint.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Last Updated</span>
                    <span className="font-medium text-slate-800">{formatDateTime(sprint.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-800">
                      {sprint.startDate && sprint.endDate 
                        ? `${Math.ceil((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                        : "N/A"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 size={14} />
                    {isEditing ? "Cancel Edit" : "Edit Sprint"}
                  </button>
                  {sprint.status === "Planned" && (
                    <button
                      onClick={() => {
                        if (confirm("Start this sprint? This will change tasks from 'Backlog' to 'To Do'.")) {
                          window.location.href = `/api/sprints/${sprint._id}/start`;
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
                    >
                      <PlayCircle size={14} />
                      Start Sprint
                    </button>
                  )}
                  {sprint.status === "Active" && (
                    <button
                      onClick={() => {
                        if (confirm("Complete this sprint?")) {
                          window.location.href = `/api/sprints/${sprint._id}/complete`;
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle size={14} />
                      Complete Sprint
                    </button>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tasks</span>
                    <div className="font-bold text-slate-800">
                      {metrics.completedTasks}/{metrics.totalTasks} ({metrics.progressPercentage}%)
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Story Points</span>
                    <div className="font-bold text-slate-800">
                      {metrics.completedPoints}/{metrics.totalPoints} ({metrics.pointsProgressPercentage}%)
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Avg Points per Task</span>
                    <div className="font-bold text-slate-800">
                      {metrics.totalTasks > 0 ? (metrics.totalPoints / metrics.totalTasks).toFixed(1) : 0}
                    </div>
                  </div>
                  {isEditing && backlogTasks.length > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Backlog Tasks</span>
                      <div className="font-bold text-slate-800">
                        {backlogTasks.length} available
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-bold animate-fade-in z-50 shadow-lg flex items-center gap-2 ${
            message.includes("✅") 
              ? "bg-green-100 text-green-800 border border-green-200" 
              : message.includes("❌")
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}>
            {message.includes("✅") ? <CheckCircle size={16} /> : 
             message.includes("❌") ? <AlertCircle size={16} /> :
             <AlertTriangle size={16} className="text-blue-600" />}
            {message.replace("✅", "").replace("❌", "").replace("ℹ️", "").trim()}
          </div>
        )}
      </div>
    </div>
  );
}