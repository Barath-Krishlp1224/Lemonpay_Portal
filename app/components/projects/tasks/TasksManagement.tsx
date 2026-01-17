"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, PlusCircle, Edit2, Trash2, ArrowLeft, Check,
  Tag, X, Search, Calendar, Filter, Clock, Flag, 
  CalendarDays, Hash, BarChart3, Target, Users,
  AlertCircle, CheckCircle, Clock as ClockIcon, BookOpen,
  GitBranch, MessageSquare, Paperclip, Eye, EyeOff,
  ChevronDown, ChevronUp, MoreVertical, ExternalLink,
  User, AlertTriangle, Bug, ClipboardCheck, Bookmark,
  Archive
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
  epicId: string;
  epicName: string;
  storyPoints: number;
  labels: string[];
  dueDate: string;
  duration: number;
  attachments: string[];
  comments: Comment[];
  subtasks?: Subtask[];
  projectId: string;
  projectName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
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
  });

  // --- Comment State ---
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});

  // --- View Mode State ---
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const fetchTasks = async (epicId: string) => {
    if (!epicId) return;
    
    setLoadingTasks(true);
    try {
      let response;
      let data;
      
      try {
        response = await fetch(`/api/tasks?epicId=${epicId}`);
        if (!response.ok) throw new Error(`Tasks endpoint failed: ${response.status}`);
        data = await response.json();
      } catch (err) {
        console.log('Tasks endpoint failed, trying projects endpoint...');
        if (selectedProject) {
          response = await fetch(`/api/projects/${selectedProject._id}/tasks`);
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
      
      console.log('Processed tasks:', tasksArray);
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
  }, [selectedEpic]);

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

  const handleAddComment = async (taskId: string) => {
    const comment = newComment[taskId];
    if (!comment?.trim()) return;

    try {
      let response;
      
      try {
        response = await fetch(`/api/tasks/${taskId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: comment }),
        });
      } catch (err) {
        const task = tasks.find(t => t._id === taskId);
        if (task) {
          response = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...task,
              comments: [...(task.comments || []), {
                userId: employees[0]?._id || "",
                userName: employees[0]?.name || "User",
                content: comment,
                createdAt: new Date().toISOString()
              }]
            }),
          });
        }
      }

      if (response && response.ok) {
        setNewComment(prev => ({ ...prev, [taskId]: "" }));
        await fetchTasks(selectedEpic!._id);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleAddLabel = () => {
    if (taskFormData.currentLabel.trim() && !taskFormData.labels.includes(taskFormData.currentLabel.trim())) {
      setTaskFormData(prev => ({
        ...prev,
        labels: [...prev.labels, prev.currentLabel.trim()],
        currentLabel: ""
      }));
    }
  };

  const handleRemoveLabel = (label: string) => {
    setTaskFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  const handleLabelKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  const handleAssigneeToggle = (employeeId: string) => {
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
  };

  const handleReporterToggle = (employeeId: string) => {
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

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const toggleComments = (taskId: string) => {
    setShowComments(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
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

  const getSelectedAssignees = () => {
    return employees.filter(emp => taskFormData.assigneeIds.includes(emp._id));
  };

  const getSelectedReporters = () => {
    return employees.filter(emp => taskFormData.reporterIds.includes(emp._id));
  };

  const getTaskAssignees = (task: Task) => {
    return employees.filter(emp => task.assigneeIds?.includes(emp._id));
  };

  const getTaskReporters = (task: Task) => {
    return employees.filter(emp => task.reporterIds?.includes(emp._id));
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
                });
              }}
              className="px-4 py-2 bg-[#3fa87d] hover:bg-[#35946d] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <PlusCircle size={14} /> New Task
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

                          {/* Subtasks Progress Bar (if any) */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-700">Subtasks Progress</span>
                                <span className="text-xs font-bold text-slate-700">{subtaskProgress.overallProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-[#3fa87d] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${subtaskProgress.overallProgress}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
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
                            <div className="flex items-center gap-1">
                              <MessageSquare size={12} className="text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {task.comments?.length || 0} comments
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

        {/* View Task Modal */}
        {isViewMode && viewTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsViewMode(false)}>
            <div 
              className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsViewMode(false);
                      setViewTaskId(null);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Close"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
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
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    {viewTask.issueKey || "No ID"}
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Task Summary */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-800">{viewTask.summary || "No title"}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Created: {formatDate(viewTask.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Updated: {formatDate(viewTask.updatedAt)}
                      </div>
                      {viewTask.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          Due: {formatDate(viewTask.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority and Duration */}
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
                      <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl text-sm font-bold">
                        {viewTask.storyPoints || 0} SP
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Duration</label>
                      <div className="px-4 py-3 bg-slate-100 text-slate-800 rounded-xl text-sm font-bold flex items-center gap-2">
                        <CalendarDays size={16} className="text-slate-500" />
                        {viewTask.duration || 0} days
                      </div>
                    </div>
                  </div>

                  {/* Subtasks Section */}
                  {viewTask.subtasks && viewTask.subtasks.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ClipboardCheck size={16} />
                        Subtasks ({viewTask.subtasks.length})
                      </h4>
                      
                      {/* Overall Progress Bar */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-bold text-slate-800">Overall Progress</div>
                            <div className="text-xs text-slate-600">
                              {calculateSubtaskProgress(viewTask.subtasks).done} of {viewTask.subtasks.length} completed
                            </div>
                          </div>
                          <div className="text-lg font-bold text-slate-800">
                            {calculateSubtaskProgress(viewTask.subtasks).overallProgress}%
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                          <div 
                            className="bg-[#3fa87d] h-3 rounded-full transition-all duration-300"
                            style={{ width: `${calculateSubtaskProgress(viewTask.subtasks).overallProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Done: {calculateSubtaskProgress(viewTask.subtasks).done}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>In Progress: {calculateSubtaskProgress(viewTask.subtasks).inProgress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span>Todo: {calculateSubtaskProgress(viewTask.subtasks).todo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Subtasks List */}
                      <div className="space-y-3">
                        {viewTask.subtasks.map((subtask) => (
                          <div key={subtask._id} className="p-4 bg-white rounded-xl border border-slate-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="font-bold text-slate-800 mb-1">{subtask.title}</div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <User size={12} className="text-slate-400" />
                                    <span className="text-xs text-slate-600">{subtask.assigneeName}</span>
                                  </div>
                                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${getSubtaskStatusColor(subtask.status)}`}>
                                    {getSubtaskStatusIcon(subtask.status)}
                                    <span>{subtask.status}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-800">{subtask.progressPercentage}%</div>
                                <div className="text-xs text-slate-500">Progress</div>
                              </div>
                            </div>
                            
                            {/* Individual Subtask Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  subtask.status === 'Done' ? 'bg-green-500' :
                                  subtask.status === 'In Progress' ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${subtask.progressPercentage}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Created: {formatDate(subtask.createdAt)}</span>
                              <span>Updated: {formatDate(subtask.updatedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {viewTask.description && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText size={16} />
                        Description
                      </h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-slate-700 whitespace-pre-wrap">{viewTask.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Assignees and Reporters */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users size={16} />
                        Assignees
                      </h4>
                      {getTaskAssigneeDisplay(viewTask).length > 0 ? (
                        <div className="space-y-2">
                          {getTaskAssigneeDisplay(viewTask).map((name, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-sm font-bold">
                                {name.charAt(0)}
                              </div>
                              <span className="font-bold">{name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-slate-500">No assignees</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <User size={16} />
                        Reporters
                      </h4>
                      {getTaskReporterDisplay(viewTask).length > 0 ? (
                        <div className="space-y-2">
                          {getTaskReporterDisplay(viewTask).map((name, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-sm font-bold">
                                {name.charAt(0)}
                              </div>
                              <span className="font-bold">{name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-slate-500">No reporters</p>
                        </div>
                      )}
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

                  {/* Epic Link */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Target size={16} />
                      Epic
                    </h4>
                    <div className="p-4 bg-[#3fa87d]/10 rounded-xl border border-[#3fa87d]/20">
                      <div className="flex items-center gap-3">
                        <Target size={20} className="text-[#3fa87d]" />
                        <div>
                          <div className="font-bold text-slate-800">{selectedEpic.name}</div>
                          <div className="text-sm text-slate-600">{selectedEpic.epicId}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FileText size={16} />
                      Project
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{selectedProject.name}</div>
                          <div className="text-sm text-slate-600">{selectedProject.key}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MessageSquare size={16} />
                        Comments ({viewTask.comments?.length || 0})
                      </h4>
                    </div>

                    {/* Comments List */}
                    {viewTask.comments && viewTask.comments.length > 0 ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {viewTask.comments.map((comment) => {
                          const commentUser = employees.find(e => e._id === comment.userId);
                          return (
                            <div key={comment._id} className="p-4 bg-white rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-sm font-bold">
                                    {commentUser?.name.charAt(0) || "U"}
                                  </div>
                                  <div>
                                    <div className="font-bold">{comment.userName}</div>
                                    <div className="text-xs text-slate-500">
                                      {formatDate(comment.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-slate-700">{comment.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <MessageSquare size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">No comments yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Created by: {viewTask.createdBy || "Unknown"}
                </div>
                <button
                  onClick={() => {
                    setIsViewMode(false);
                    setViewTaskId(null);
                  }}
                  className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
                >
                  Close
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
              : "bg-red-100 text-red-800 border border-red-200"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}