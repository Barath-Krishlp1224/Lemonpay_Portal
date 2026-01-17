"use client";

import React, { useState, useEffect } from "react";
import { 
  Target, Calendar, Users, Clock, PlayCircle, 
  CheckCircle, Archive, TrendingUp, AlertCircle,
  ChevronRight, X, Edit2, Trash2, Loader2, FolderOpen,
  FolderKanban, ChevronDown, Plus
} from "lucide-react";
import type { SavedProject, Sprint, Employee } from "@/app/types/project";
import SprintCreationModal from "./SprintCreationModal";

// Update the interface to include projects and onProjectSelect
interface SprintManagementProps {
  selectedProject: SavedProject | null;
  employees: Employee[];
  projects: SavedProject[];
  onProjectSelect: (project: SavedProject) => void;
}

export default function SprintManagement({ 
  selectedProject, 
  employees,
  projects,
  onProjectSelect
}: SprintManagementProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [message, setMessage] = useState<string>("");
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [previousSprints, setPreviousSprints] = useState<Sprint[]>([]);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);

  // Fetch sprints when project changes
  useEffect(() => {
    if (selectedProject?._id) {
      fetchSprints();
      fetchActiveSprint();
      fetchPreviousSprints();
    } else {
      setSprints([]);
      setActiveSprint(null);
      setPreviousSprints([]);
    }
  }, [selectedProject]);

  const fetchSprints = async () => {
    if (!selectedProject?._id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints?projectId=${selectedProject._id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sprints: ${response.status}`);
      }
      const data = await response.json();
      setSprints(data.data || data.sprints || []);
    } catch (err: any) {
      console.error("Failed to fetch sprints:", err);
      setMessage("❌ Failed to load sprints");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSprint = async () => {
    if (!selectedProject?._id) return;
    
    try {
      const response = await fetch(`/api/sprints?projectId=${selectedProject._id}&status=Active`);
      if (response.ok) {
        const data = await response.json();
        const activeSprints = data.data || data.sprints || [];
        setActiveSprint(activeSprints.length > 0 ? activeSprints[0] : null);
      }
    } catch (err) {
      console.error("Failed to fetch active sprint:", err);
    }
  };

  const fetchPreviousSprints = async () => {
    if (!selectedProject?._id) return;
    
    try {
      const response = await fetch(`/api/sprints?projectId=${selectedProject._id}&status=Completed`);
      if (response.ok) {
        const data = await response.json();
        const completedSprints = data.data || data.sprints || [];
        setPreviousSprints(completedSprints);
      }
    } catch (err) {
      console.error("Failed to fetch previous sprints:", err);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (!confirm("Start this sprint? This will change tasks from 'Backlog' to 'To Do'.")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/start`, {
        method: "POST",
      });

      const data = await response.json();
      
      if (response.ok) {
        setActiveSprint(data.sprint);
        setMessage(`✅ Sprint started! ${data.message || ""}`);
        fetchSprints();
        fetchPreviousSprints();
      } else {
        setMessage(`❌ ${data.error || "Failed to start sprint"}`);
      }
    } catch (err: any) {
      console.error("Failed to start sprint:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!confirm("Complete this sprint? This will move sprint to completed status.")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}/complete`, {
        method: "POST",
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Sprint completed! ${data.message || ""}`);
        fetchSprints();
        fetchActiveSprint();
        fetchPreviousSprints();
      } else {
        setMessage(`❌ ${data.error || "Failed to complete sprint"}`);
      }
    } catch (err: any) {
      console.error("Failed to complete sprint:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Delete this sprint? Tasks assigned to this sprint will be moved back to backlog.")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (response.ok) {
        setSprints(prev => prev.filter(s => s._id !== sprintId));
        if (activeSprint?._id === sprintId) {
          setActiveSprint(null);
        }
        setMessage(`✅ Sprint deleted! ${data.message || ""}`);
      } else {
        setMessage(`❌ ${data.error || "Failed to delete sprint"}`);
      }
    } catch (err: any) {
      console.error("Failed to delete sprint:", err);
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleSprintCreated = (newSprint: Sprint) => {
    setSprints(prev => [...prev, newSprint]);
    setShowCreateModal(false);
    setMessage("✅ Sprint created successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  // Calculate sprint metrics
  const calculateSprintMetrics = (sprint: Sprint) => {
    const tasksArray = Array.isArray(sprint.tasks) ? sprint.tasks : [];
    const tasksWithDetails = tasksArray.filter((task: any) => task && typeof task === 'object');
    
    const totalTasks = sprint.totalTasks || tasksArray.length || 0;
    const completedTasks = sprint.completedTasks || 
      tasksWithDetails.filter((task: any) => task.status === "Done").length || 0;
    
    const totalPoints = sprint.totalPoints || 
      tasksWithDetails.reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0) || 0;
    
    const completedPoints = sprint.completedPoints || 
      tasksWithDetails.filter((task: any) => task.status === "Done")
        .reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0) || 0;

    const carriedOverPoints = (sprint as any).carriedOverPoints || 0;
    const totalAdjustedPoints = totalPoints + carriedOverPoints;

    return {
      totalTasks,
      completedTasks,
      totalPoints,
      completedPoints,
      carriedOverPoints,
      totalAdjustedPoints,
      remainingPoints: totalAdjustedPoints - completedPoints,
      progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      pointsProgressPercentage: totalAdjustedPoints > 0 ? Math.round((completedPoints / totalAdjustedPoints) * 100) : 0,
    };
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "Not set";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getDaysRemaining = (endDate: string | Date) => {
    if (!endDate) return 0;
    try {
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
      const today = new Date();
      const diffTime = end.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    } catch {
      return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case "active": return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "planned": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case "active": return <PlayCircle className="text-purple-600" size={16} />;
      case "completed": return <CheckCircle className="text-green-600" size={16} />;
      case "planned": return <Calendar className="text-blue-600" size={16} />;
      default: return <FolderOpen className="text-gray-600" size={16} />;
    }
  };

  // Enable sprint creation even without project selection
  const handleCreateSprint = () => {
    if (!selectedProject) {
      // Show project selection if no project is selected
      setShowProjectsDropdown(true);
      setMessage("⚠️ Please select a project first");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setShowCreateModal(true);
    }
  };

  // Toggle sprint expansion
  const toggleSprintExpansion = (sprintId: string) => {
    setExpandedSprint(expandedSprint === sprintId ? null : sprintId);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 h-full flex flex-col">
      {/* Header with Project Selection */}
      <div className="mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Target size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Sprint Management</h2>
              <div className="relative">
                <button
                  onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
                  className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <span>
                    {selectedProject 
                      ? `Project: ${selectedProject.name} (${selectedProject.key})`
                      : "Select a project to manage sprints"
                    }
                  </span>
                  <ChevronDown size={12} className={showProjectsDropdown ? "rotate-180" : ""} />
                </button>
                
                {showProjectsDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 max-h-60 overflow-y-auto">
                    <div className="text-xs font-bold text-slate-500 uppercase px-4 py-2">Select Project</div>
                    {projects.map((project) => (
                      <button
                        key={project._id}
                        onClick={() => {
                          onProjectSelect(project);
                          setShowProjectsDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left ${
                          selectedProject?._id === project._id ? "bg-purple-50" : ""
                        }`}
                      >
                        <div className="w-6 h-6 bg-[#3fa87d] rounded flex items-center justify-center text-white text-xs font-bold">
                          {project.key.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{project.name}</div>
                          <div className="text-xs text-slate-500 truncate">ID: {project.key}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Only Create Sprint button remains */}
          <div className="flex items-center gap-2">
            {/* Create Sprint Button */}
            <button
              onClick={handleCreateSprint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
              title="Create new sprint"
            >
              <PlayCircle size={14} /> New Sprint
            </button>
          </div>
        </div>

        {/* Active Sprint Banner */}
        {activeSprint && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <PlayCircle size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                      ACTIVE SPRINT
                    </span>
                    <h3 className="font-bold text-slate-800">{activeSprint.name}</h3>
                  </div>
                  {activeSprint.goal && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{activeSprint.goal}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={12} />
                      <span>
                        {formatDate(activeSprint.startDate)} - {formatDate(activeSprint.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <TrendingUp size={12} />
                      <span>{calculateSprintMetrics(activeSprint).completedPoints}/{calculateSprintMetrics(activeSprint).totalAdjustedPoints} points</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} />
                      <span>{calculateSprintMetrics(activeSprint).completedTasks}/{calculateSprintMetrics(activeSprint).totalTasks} tasks</span>
                    </div>
                    {activeSprint.endDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>{getDaysRemaining(activeSprint.endDate)} days remaining</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCompleteSprint(activeSprint._id)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Complete Sprint
              </button>
            </div>
            
            {/* Active Sprint Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Progress</span>
                <span>{calculateSprintMetrics(activeSprint).progressPercentage}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${calculateSprintMetrics(activeSprint).progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sprints List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Target className="text-slate-300 mb-3" size={48} />
            <p className="text-slate-400 font-bold">Select a project to view sprints</p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => setShowProjectsDropdown(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Select Project
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : sprints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Target className="text-slate-300 mb-3" size={48} />
            <p className="text-slate-400 font-bold">No sprints created yet</p>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleCreateSprint}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Create Your First Sprint
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {sprints
              .filter(sprint => sprint._id !== activeSprint?._id)
              .sort((a, b) => {
                const statusOrder: Record<string, number> = { "Active": 0, "Planned": 1, "Completed": 2 };
                const statusA = statusOrder[a.status] || 3;
                const statusB = statusOrder[b.status] || 3;
                
                if (statusA !== statusB) return statusA - statusB;
                
                const dateA = new Date(a.startDate).getTime();
                const dateB = new Date(b.startDate).getTime();
                return dateB - dateA;
              })
              .map((sprint) => {
                const metrics = calculateSprintMetrics(sprint);
                
                return (
                  <div
                    key={sprint._id}
                    className={`p-4 border-2 rounded-2xl transition-all hover:shadow-md ${
                      sprint.status === "Active"
                        ? "border-purple-500 bg-purple-50"
                        : sprint.status === "Completed"
                        ? "border-green-200 bg-green-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(sprint.status)}
                            <h3 className="font-bold text-slate-800">{sprint.name}</h3>
                          </div>
                          <span className={`px-2 py-0.5 text-[8px] font-black rounded-full border ${getStatusColor(sprint.status)}`}>
                            {sprint.status}
                          </span>
                          <button
                            onClick={() => toggleSprintExpansion(sprint._id)}
                            className="ml-2 text-slate-400 hover:text-slate-600"
                          >
                            {expandedSprint === sprint._id ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        </div>
                        
                        {sprint.goal && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{sprint.goal}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs mb-3">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar size={12} />
                            <span>{formatDate(sprint.startDate)}</span>
                            <ChevronRight size={10} />
                            <span>{formatDate(sprint.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <TrendingUp size={12} />
                            <span>
                              {metrics.completedPoints}/{metrics.totalAdjustedPoints} points
                              {metrics.carriedOverPoints > 0 && (
                                <span className="text-orange-500 ml-1">
                                  (+{metrics.carriedOverPoints} carried over)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Users size={12} />
                            <span>{metrics.completedTasks}/{metrics.totalTasks} tasks</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                            <span>Progress</span>
                            <span>{metrics.progressPercentage}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                sprint.status === "Completed" ? "bg-green-500" :
                                sprint.status === "Active" ? "bg-gradient-to-r from-purple-500 to-blue-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${metrics.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        {sprint.status === "Planned" && (
                          <button
                            onClick={() => handleStartSprint(sprint._id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                          >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                            Start Sprint
                          </button>
                        )}
                        {sprint.status === "Active" && (
                          <button
                            onClick={() => handleCompleteSprint(sprint._id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Complete
                          </button>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteSprint(sprint._id)}
                            disabled={loading}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Sprint"
                          >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Sprint Details */}
                    {expandedSprint === sprint._id && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">Sprint Details</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Sprint Goal:</span>
                              <span className="text-xs font-medium text-slate-700">{sprint.goal || "No goal set"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Created:</span>
                              <span className="text-xs font-medium text-slate-700">{formatDate(sprint.createdAt || new Date())}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Duration:</span>
                              <span className="text-xs font-medium text-slate-700">
                                {getDaysRemaining(sprint.endDate) > 0 
                                  ? `${getDaysRemaining(sprint.endDate)} days remaining` 
                                  : "Completed"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Team Members:</span>
                              <span className="text-xs font-medium text-slate-700">
                                {(sprint as any).teamMembers?.length || 0} assigned
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Velocity:</span>
                              <span className="text-xs font-medium text-slate-700">
                                {metrics.completedPoints} points
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Burndown:</span>
                              <span className="text-xs font-medium text-slate-700">
                                {metrics.remainingPoints} points remaining
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Task Breakdown */}
                        {sprint.tasks && Array.isArray(sprint.tasks) && sprint.tasks.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-xs font-bold text-slate-600 mb-2">Task Breakdown</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs text-slate-500">To Do</div>
                                <div className="text-sm font-bold text-slate-800">
                                  {sprint.tasks.filter((t: any) => t.status === "To Do").length}
                                </div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs text-slate-500">In Progress</div>
                                <div className="text-sm font-bold text-slate-800">
                                  {sprint.tasks.filter((t: any) => t.status === "In Progress").length}
                                </div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs text-slate-500">Review</div>
                                <div className="text-sm font-bold text-slate-800">
                                  {sprint.tasks.filter((t: any) => t.status === "Review").length}
                                </div>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs text-slate-500">Done</div>
                                <div className="text-sm font-bold text-slate-800">
                                  {sprint.tasks.filter((t: any) => t.status === "Done").length}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Sprint statistics summary */}
                    {(metrics.totalTasks > 0 || metrics.totalAdjustedPoints > 0) && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span>Tasks</span>
                              <span className="font-bold">{metrics.completedTasks}/{metrics.totalTasks}</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all" 
                                style={{ width: `${metrics.completedTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span>Story Points</span>
                              <span className="font-bold">{metrics.completedPoints}/{metrics.totalAdjustedPoints}</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all" 
                                style={{ width: `${metrics.completedPoints > 0 ? (metrics.completedPoints / metrics.totalAdjustedPoints) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}
      </div>

      {/* Sprint Creation Modal */}
      {showCreateModal && selectedProject && (
        <SprintCreationModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          project={selectedProject}
          employees={employees}
          onSprintCreated={handleSprintCreated}
          existingSprints={sprints}
          previousSprints={previousSprints}
          allProjects={projects}
        />
      )}

      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-bold animate-fade-in z-50 shadow-lg flex items-center gap-2 ${
          message.includes("✅") 
            ? "bg-green-100 text-green-800 border border-green-200" 
            : message.includes("⚠️")
            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}>
          {message.includes("✅") ? <CheckCircle size={16} /> : 
           message.includes("⚠️") ? <AlertCircle size={16} /> : 
           <AlertCircle size={16} />}
          {message.replace("✅", "").replace("❌", "").replace("⚠️", "").trim()}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { 
          width: 6px; 
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: transparent; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #cbd5e1; 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: #94a3b8; 
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}