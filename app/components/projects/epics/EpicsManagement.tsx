"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, PlusCircle, Edit2, Trash2, ArrowLeft, Check,
  Tag, X, Search, Calendar, Filter, Clock, Flag, 
  CalendarDays, Hash, BarChart3, Target, ChevronRight,
  MoreVertical, CheckCircle, PlayCircle, Eye, Circle
} from "lucide-react";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

// Extend Epic type locally to include task count properties
interface EpicWithTasks extends Epic {
  taskCount?: number;
  totalTasks?: number;
  completedTasks?: number;
}

interface EpicsManagementProps {
  selectedProject: SavedProject | null;
  employees: Employee[];
  onEpicClick: (epic: Epic) => void;
}

export default function EpicsManagement({ 
  selectedProject, 
  employees, 
  onEpicClick
}: EpicsManagementProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [epics, setEpics] = useState<EpicWithTasks[]>([]);
  const [showEpicForm, setShowEpicForm] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  
  // --- Search and Filter State for Epics ---
  const [epicSearchQuery, setEpicSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // --- Epic Form State ---
  const [epicFormData, setEpicFormData] = useState({
    name: "",
    summary: "",
    description: "",
    status: "Not Started" as "Not Started" | "Todo" | "In Progress" | "Review" | "Done",
    priority: "Medium" as "Low" | "Medium" | "High" | "Critical",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    ownerId: employees.length > 0 ? employees[0]._id : "",
    labels: [] as string[],
    currentLabel: "",
  });

  // Update the ownerId when employees array changes
  useEffect(() => {
    if (employees.length > 0 && !epicFormData.ownerId) {
      setEpicFormData(prev => ({
        ...prev,
        ownerId: employees[0]._id
      }));
    }
  }, [employees]);

  // Helper to get owner name from epic
  const getOwnerName = (epic: Epic): string => {
    if (epic.owner && typeof epic.owner === 'object' && epic.owner.name) {
      return epic.owner.name;
    }
    if (epic.ownerId) {
      const employee = employees.find(emp => emp._id === epic.ownerId);
      return employee?.name || `User ${epic.ownerId?.substring(0, 4) || ""}`;
    }
    return "Unknown Owner";
  };

  // Simple Task Count Badge Component - Minimal version
  const TaskCountBadge = ({ epic }: { epic: EpicWithTasks }) => {
    const taskCount = epic.taskCount || 0;
    const totalTasks = epic.totalTasks || 0;
    
    // Debug log to see what data we're getting
    console.log(`Epic ${epic.name} - taskCount: ${taskCount}, totalTasks: ${totalTasks}`);
    
    // Don't show anything if no tasks
    if (taskCount === 0 && totalTasks === 0) {
      return null;
    }
    
    // Simple badge - just show the count
    return (
      <div className="flex items-center gap-1 mb-2">
        <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1">
          <FileText size={10} className="text-slate-600" />
          <span className="text-xs font-bold text-slate-700">
            {taskCount > 0 ? taskCount : totalTasks} task{(taskCount > 0 ? taskCount : totalTasks) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  };

  // Alternative: Fetch task counts separately
  const fetchTaskCountsForEpics = async (epicIds: string[]) => {
    try {
      const counts = await Promise.all(
        epicIds.map(async (epicId) => {
          try {
            const response = await fetch(`/api/tasks/count?epicId=${epicId}`);
            if (response.ok) {
              return await response.json();
            }
          } catch (err) {
            console.error(`Failed to fetch task count for epic ${epicId}:`, err);
          }
          return { epicId, count: 0 };
        })
      );
      
      return counts;
    } catch (err) {
      console.error("Failed to fetch task counts:", err);
      return [];
    }
  };

  const fetchEpics = async (projectId: string) => {
    if (!projectId) return;
    
    setLoadingEpics(true);
    try {
      // First, fetch epics
      const response = await fetch(`/api/epics?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const epicsData = await response.json();
      
      console.log("Fetched epics:", epicsData);
      
      // Option 1: If your backend doesn't include task counts, fetch them separately
      const epicIds = epicsData.map((epic: Epic) => epic._id);
      const taskCounts = await fetchTaskCountsForEpics(epicIds);
      
      // Add task counts to epics
      const epicsWithCounts = epicsData.map((epic: Epic) => {
        const taskCount = taskCounts.find((tc: any) => tc.epicId === epic._id);
        return {
          ...epic,
          taskCount: taskCount?.count || 0
        };
      });
      
      setEpics(epicsWithCounts);
      
    } catch (err) {
      console.error("Failed to fetch epics:", err);
      setMessage("❌ Failed to load epics. Please try again.");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoadingEpics(false);
    }
  };

  // Alternative: Use a simpler approach - check if tasks exist for each epic
  const checkEpicHasTasks = async (epicId: string) => {
    try {
      const response = await fetch(`/api/tasks?epicId=${epicId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        return data.length > 0;
      }
      return false;
    } catch (err) {
      console.error(`Failed to check tasks for epic ${epicId}:`, err);
      return false;
    }
  };

  // Load epics and check for tasks
  useEffect(() => {
    if (selectedProject) {
      const loadEpicsWithTasks = async () => {
        setLoadingEpics(true);
        try {
          // Fetch epics
          const response = await fetch(`/api/epics?projectId=${selectedProject._id}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const epicsData = await response.json();
          console.log("Epics data received:", epicsData);
          
          // Check each epic for tasks
          const epicsWithTaskInfo = await Promise.all(
            epicsData.map(async (epic: Epic) => {
              try {
                // Check if tasks exist for this epic
                const tasksResponse = await fetch(`/api/tasks?epicId=${epic._id}&countOnly=true`);
                let taskCount = 0;
                
                if (tasksResponse.ok) {
                  const tasksData = await tasksResponse.json();
                  taskCount = tasksData.count || 0;
                }
                
                return {
                  ...epic,
                  taskCount: taskCount
                };
              } catch (err) {
                console.error(`Error checking tasks for epic ${epic._id}:`, err);
                return {
                  ...epic,
                  taskCount: 0
                };
              }
            })
          );
          
          setEpics(epicsWithTaskInfo);
          console.log("Epics with task counts:", epicsWithTaskInfo);
          
        } catch (err) {
          console.error("Failed to load epics:", err);
          setMessage("❌ Failed to load epics");
          setTimeout(() => setMessage(""), 3000);
        } finally {
          setLoadingEpics(false);
        }
      };
      
      loadEpicsWithTasks();
    } else {
      setEpics([]);
    }
  }, [selectedProject]);

  // Simple debugging component to show epic data
  const EpicDebugInfo = ({ epic }: { epic: EpicWithTasks }) => {
    return (
      <div className="text-sm font-bold tracking-wide text-gray-400 mt-2 ">
       Tasks Count: {epic.taskCount || 0}
      </div>
    );
  };

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setStatusDropdownOpen(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStatusChange = async (epicId: string, newStatus: Epic["status"]) => {
    const epic = epics.find(e => e._id === epicId);
    if (!epic || epic.status === newStatus) {
      setStatusDropdownOpen(null);
      return;
    }

    try {
      const updateData = {
        status: newStatus,
      };

      const response = await fetch(`/api/epics/${epicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedEpic = await response.json();
        setEpics(prev => prev.map(e => 
          e._id === epicId ? { ...e, status: updatedEpic.status } : e
        ));
        setMessage(`✅ Epic status updated to ${newStatus}`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }
    } catch (err: any) {
      console.error("Failed to update epic status:", err);
      setMessage(`❌ ${err.message}`);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setStatusDropdownOpen(null);
    }
  };

  const handleEpicSubmit = async () => {
    if (!selectedProject || !epicFormData.name.trim() || !epicFormData.summary.trim()) {
      setMessage("❌ Please fill in required fields (Name and Summary)");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Validate ownerId is not empty
    if (!epicFormData.ownerId || epicFormData.ownerId.trim() === "") {
      setMessage("❌ Please select an epic owner");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setLoading(true);
    try {
      const epicData = {
        name: epicFormData.name.trim(),
        summary: epicFormData.summary.trim(),
        description: epicFormData.description.trim(),
        status: epicFormData.status,
        priority: epicFormData.priority,
        startDate: epicFormData.startDate,
        endDate: epicFormData.endDate || null,
        ownerId: epicFormData.ownerId,
        labels: epicFormData.labels,
        projectId: selectedProject._id,
        projectName: selectedProject.name,
        projectKey: selectedProject.key,
        createdBy: "user",
      };

      let url = "/api/epics";
      let method = "POST";

      if (editingEpicId) {
        url = `/api/epics/${editingEpicId}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(epicData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(editingEpicId ? "✅ Epic updated successfully!" : "✅ Epic created successfully!");
        
        // Reset form
        setEpicFormData({
          name: "",
          summary: "",
          description: "",
          status: "Not Started",
          priority: "Medium",
          startDate: new Date().toISOString().split('T')[0],
          endDate: "",
          ownerId: employees.length > 0 ? employees[0]._id : "",
          labels: [],
          currentLabel: "",
        });
        
        // Refresh the list
        if (selectedProject) {
          const loadEpics = async () => {
            const response = await fetch(`/api/epics?projectId=${selectedProject._id}`);
            if (response.ok) {
              const epicsData = await response.json();
              setEpics(epicsData);
            }
          };
          loadEpics();
        }
        
        setShowEpicForm(false);
        setEditingEpicId(null);
      } else {
        setMessage(`❌ ${result.error || "Failed to save epic"}`);
      }
    } catch (err: any) {
      console.error("Error saving epic:", err);
      setMessage(`❌ ${err.message || "Network error. Please try again."}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleEditEpic = (epic: Epic) => {
    // Try to get ownerId from different possible sources
    let ownerId = "";
    
    if (epic.ownerId) {
      ownerId = epic.ownerId;
    } else if (epic.owner && epic.owner._id) {
      ownerId = epic.owner._id;
    } else if (employees.length > 0) {
      // Fallback to first employee if no owner found
      ownerId = employees[0]._id;
    }

    setEpicFormData({
      name: epic.name,
      summary: epic.summary,
      description: epic.description || "",
      status: epic.status,
      priority: epic.priority,
      startDate: epic.startDate.split('T')[0],
      endDate: epic.endDate ? epic.endDate.split('T')[0] : "",
      ownerId: ownerId,
      labels: epic.labels || [],
      currentLabel: "",
    });
    setEditingEpicId(epic._id);
    setShowEpicForm(true);
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm("Are you sure you want to delete this epic?")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/epics/${epicId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("✅ Epic deleted successfully!");
        // Refresh the list
        if (selectedProject) {
          const loadEpics = async () => {
            const response = await fetch(`/api/epics?projectId=${selectedProject._id}`);
            if (response.ok) {
              const epicsData = await response.json();
              setEpics(epicsData);
            }
          };
          loadEpics();
        }
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error || "Failed to delete epic"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAddLabel = () => {
    if (epicFormData.currentLabel.trim() && !epicFormData.labels.includes(epicFormData.currentLabel.trim())) {
      setEpicFormData(prev => ({
        ...prev,
        labels: [...prev.labels, prev.currentLabel.trim()],
        currentLabel: ""
      }));
    }
  };

  const handleRemoveLabel = (label: string) => {
    setEpicFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  // Filter epics
  const filteredEpics = useMemo(() => {
    return epics.filter((epic) => {
      const matchesSearch = 
        epic.name.toLowerCase().includes(epicSearchQuery.toLowerCase()) ||
        epic.summary.toLowerCase().includes(epicSearchQuery.toLowerCase()) ||
        epic.epicId.toLowerCase().includes(epicSearchQuery.toLowerCase()) ||
        getOwnerName(epic).toLowerCase().includes(epicSearchQuery.toLowerCase());
      
      const matchesStatus = statusFilter ? epic.status === statusFilter : true;
      const matchesPriority = priorityFilter ? epic.priority === priorityFilter : true;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [epics, epicSearchQuery, statusFilter, priorityFilter, employees]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Critical": return "bg-red-100 text-red-800";
      case "High": return "bg-orange-100 text-orange-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Not Started": return "bg-gray-100 text-gray-800";
      case "Done": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Review": return "bg-purple-100 text-purple-800";
      case "Todo": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Not Started": return "⏳";
      case "Done": return "✅";
      case "In Progress": return "🔄";
      case "Review": return "👁️";
      case "Todo": return "📋";
      default: return "📋";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "Critical": return "🔥";
      case "High": return "⚠️";
      case "Medium": return "📊";
      case "Low": return "📈";
      default: return "📊";
    }
  };

  const StatusDropdown = ({ epic }: { epic: Epic }) => {
    const statusOptions: { value: Epic["status"]; label: string; icon: React.ReactNode }[] = [
      { value: "Not Started", label: "Not Started", icon: <Circle size={12} className="text-gray-500" /> },
      { value: "Todo", label: "Todo", icon: <Circle size={12} className="text-gray-500" /> },
      { value: "In Progress", label: "In Progress", icon: <PlayCircle size={12} className="text-blue-500" /> },
      { value: "Review", label: "Review", icon: <Eye size={12} className="text-purple-500" /> },
      { value: "Done", label: "Done", icon: <CheckCircle size={12} className="text-green-500" /> },
    ];

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownOpen(statusDropdownOpen === epic._id ? null : epic._id);
          }}
          className={`px-2 py-1 rounded text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${getStatusColor(epic.status)} hover:opacity-80`}
        >
          {getStatusIcon(epic.status)} {epic.status}
          <ChevronRight size={10} className={`transition-transform ${statusDropdownOpen === epic._id ? 'rotate-90' : ''}`} />
        </button>
        
        {statusDropdownOpen === epic._id && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-50">
            <div className="p-2 space-y-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(epic._id, option.value);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors ${
                    epic.status === option.value
                      ? "bg-slate-100 text-slate-800"
                      : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  {option.icon}
                  {option.label}
                  {epic.status === option.value && (
                    <Check size={12} className="ml-auto text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get current owner from employees for display
  const getCurrentOwner = () => {
    return employees.find(emp => emp._id === epicFormData.ownerId) || 
           { _id: "", name: "Select Owner", email: "" };
  };

  // Reset form when showEpicForm changes to false
  useEffect(() => {
    if (!showEpicForm) {
      setEpicFormData({
        name: "",
        summary: "",
        description: "",
        status: "Not Started",
        priority: "Medium",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        ownerId: employees.length > 0 ? employees[0]._id : "",
        labels: [],
        currentLabel: "",
      });
      setEditingEpicId(null);
    }
  }, [showEpicForm, employees]);

  // Debug: Log epic data when it changes
  useEffect(() => {
    console.log("Epics state updated:", epics);
    epics.forEach((epic, index) => {
      console.log(`Epic ${index}: ${epic.name}, Task Count: ${epic.taskCount}`);
    });
  }, [epics]);

  return (
    <div className="flex flex-col">
      {/* Message Toast */}
      {message && (
        <div className="mb-4 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl animate-in slide-in-from-top">
          {message}
        </div>
      )}
      
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Epics Management</h2>
          {selectedProject && !showEpicForm && (
            <button
              onClick={() => {
                setShowEpicForm(true);
                setEditingEpicId(null);
                setEpicFormData({
                  name: "",
                  summary: "",
                  description: "",
                  status: "Not Started",
                  priority: "Medium",
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: "",
                  ownerId: employees.length > 0 ? employees[0]._id : "",
                  labels: [],
                  currentLabel: "",
                });
              }}
              className="px-4 py-2 bg-[#3fa87d] hover:bg-[#35946d] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <PlusCircle size={14} /> New Epic
            </button>
          )}
        </div>

        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <FileText className="text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold mb-2">Select a project to manage epics</p>
            <p className="text-slate-400 text-sm text-center">Epics will appear here</p>
          </div>
        ) : !showEpicForm ? (
          <div className="flex-1 flex flex-col">
            {/* Epics Search & Filter Bar */}
            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search epics by name, summary, ID, or owner..."
                  value={epicSearchQuery}
                  onChange={(e) => setEpicSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#3fa87d] focus:bg-white transition-all appearance-none"
                  >
                    <option value="">All Status</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
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
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              {(statusFilter || priorityFilter || epicSearchQuery) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setPriorityFilter("");
                      setEpicSearchQuery("");
                    }}
                    className="text-xs font-bold text-[#3fa87d] flex items-center gap-1"
                  >
                    Clear filters
                  </button>
                  <span className="text-xs text-slate-500">
                    Showing {filteredEpics.length} of {epics.length} epics
                  </span>
                </div>
              )}
            </div>

            {/* Epics List - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {loadingEpics ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3fa87d]"></div>
                    <p className="text-sm text-slate-400 mt-2">Loading epics...</p>
                  </div>
                ) : filteredEpics.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-400 font-bold mb-2">
                      {epics.length === 0 ? "No epics yet" : "No matching epics found"}
                    </p>
                    <button
                      onClick={() => setShowEpicForm(true)}
                      className="text-[#3fa87d] text-xs font-bold underline"
                    >
                      Create your first epic
                    </button>
                  </div>
                ) : (
                  filteredEpics.map((epic) => (
                    <div 
                      key={epic._id} 
                      className="p-4 border-2 border-slate-200 rounded-2xl hover:border-[#3fa87d]/50 transition-colors group cursor-pointer relative"
                      onClick={() => onEpicClick(epic)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          {/* Status Dropdown */}
                          <StatusDropdown epic={epic} />
                          
                          {/* Priority Badge */}
                          <div className={`px-2 py-1 rounded text-[10px] font-black ${getPriorityColor(epic.priority)}`}>
                            {getPriorityIcon(epic.priority)} {epic.priority}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEpic(epic);
                            }}
                            className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                            title="Edit Epic"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEpic(epic._id);
                            }}
                            className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                            title="Delete Epic"
                          >
                            <Trash2 size={12} />
                          </button>
                          <ChevronRight size={14} className="text-slate-400 group-hover:text-[#3fa87d]" />
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 mb-1">{epic.name}</h4>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{epic.summary}</p>
                      
                      {/* Task Count Badge */}
                      <TaskCountBadge epic={epic} />
                      
                      {/* Owner Badge */}
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-bold text-slate-500">Owner:</span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                          <div className="w-4 h-4 bg-blue-300 rounded-full flex items-center justify-center text-[8px] font-bold">
                            {getOwnerName(epic).charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-blue-700">{getOwnerName(epic)}</span>
                        </div>
                      </div>
                      
                      {/* Labels */}
                      {epic.labels && epic.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {epic.labels.map((label, index) => (
                            <div key={index} className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                              {label}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Debug info - remove in production */}
                      <EpicDebugInfo epic={epic} />
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                        <span className="font-mono font-bold">{epic.epicId}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]">{new Date(epic.startDate).toLocaleDateString()}</span>
                          {epic.endDate && (
                            <>
                              <span className="text-[8px]">→</span>
                              <span className="text-[10px]">{new Date(epic.endDate).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Epic Creation/Edit Form - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-6">
                {/* Form Header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pt-2 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowEpicForm(false);
                        setEditingEpicId(null);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft size={16} className="text-slate-500" />
                    </button>
                    <h3 className="font-bold text-slate-800">
                      {editingEpicId ? "Edit Epic" : "Create New Epic"}
                    </h3>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    {selectedProject.key}
                  </div>
                </div>

                {/* Auto-generated fields display */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Project</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800">
                      {selectedProject.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Epic ID</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 font-mono">
                      {editingEpicId 
                        ? epics.find(e => e._id === editingEpicId)?.epicId 
                        : `${selectedProject.key.substring(0, 3)}-EPIC-${(epics.length + 1).toString().padStart(3, '0')}`
                      }
                    </div>
                  </div>
                </div>

                {/* Epic Form */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Epic Name *</label>
                    <input
                      type="text"
                      value={epicFormData.name}
                      onChange={(e) => setEpicFormData({...epicFormData, name: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      placeholder="Enter epic name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Summary *</label>
                    <input
                      type="text"
                      value={epicFormData.summary}
                      onChange={(e) => setEpicFormData({...epicFormData, summary: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      placeholder="Brief summary of the epic"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Description</label>
                    <textarea
                      value={epicFormData.description}
                      onChange={(e) => setEpicFormData({...epicFormData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all min-h-[80px]"
                      placeholder="Detailed description of the epic"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Status</label>
                      <select
                        value={epicFormData.status}
                        onChange={(e) => setEpicFormData({...epicFormData, status: e.target.value as any})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="Todo">Todo</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Priority</label>
                      <select
                        value={epicFormData.priority}
                        onChange={(e) => setEpicFormData({...epicFormData, priority: e.target.value as any})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Start Date</label>
                      <input
                        type="date"
                        value={epicFormData.startDate}
                        onChange={(e) => setEpicFormData({...epicFormData, startDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">End Date</label>
                      <input
                        type="date"
                        value={epicFormData.endDate}
                        onChange={(e) => setEpicFormData({...epicFormData, endDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Epic Owner</label>
                    <select
                      value={epicFormData.ownerId}
                      onChange={(e) => {
                        setEpicFormData({
                          ...epicFormData,
                          ownerId: e.target.value
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                    >
                      <option value="">Select Owner</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                    {epicFormData.ownerId && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-300 rounded-full flex items-center justify-center text-xs font-bold">
                          {getCurrentOwner().name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-blue-800">{getCurrentOwner().name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Labels</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={epicFormData.currentLabel}
                        onChange={(e) => setEpicFormData({...epicFormData, currentLabel: e.target.value})}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                        className="flex-1 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#3fa87d] transition-all"
                        placeholder="Add label and press Enter"
                      />
                      <button
                        type="button"
                        onClick={handleAddLabel}
                        className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-[#3fa87d] transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {epicFormData.labels.map((label, index) => (
                        <div key={index} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full flex items-center gap-1">
                          <Tag size={10} />
                          {label}
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(label)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={handleEpicSubmit}
                      disabled={loading || !epicFormData.name.trim() || !epicFormData.summary.trim()}
                      className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-[#3fa87d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading 
                        ? editingEpicId ? "Updating Epic..." : "Creating Epic..." 
                        : editingEpicId ? "Update Epic" : "Create Epic"
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}