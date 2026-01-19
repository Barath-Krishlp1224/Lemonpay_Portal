"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Kanban,
  Layers,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Trello,
  Shield,
  Database,
  Play
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import TaskModal from "./components/TaskModal";
import TaskBoardView from "./components/TaskBoardView";

// Types & Utils
import { Task, Subtask, Employee } from "./components/types";
import { getAggregatedTaskData } from "./utils/aggregation";

type Role = "Admin" | "Manager" | "TeamLead" | "Employee";

// All task statuses matching the Mongoose model
const allTaskStatuses = [
  // Planning
  "Icebox",
  "Backlog",
  "Prioritized",
  
  // Ready
  "Todo",
  "Ready for Dev",
  
  // Development
  "In Progress",
  "Dev Review",
  "Code Review",
  
  // Testing
  "QA Ready",
  "QA In Progress",
  "QA Review",
  
  // Review & Approval
  "UAT",
  "Client Review",
  
  // Release
  "Ready for Release",
  "Staging",
  "Production",
  "Live",
  
  // Completion
  "Done",
  "Closed",
  
  // Issues
  "Blocked",
  "On Hold",
  "Rejected"
];

const TasksPage: React.FC = () => {
  // --- Data States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("Employee");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");

  // --- UI Navigation ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // --- Task Editing ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTask, setDraftTask] = useState<Partial<Task>>({});
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [currentProjectPrefix, setCurrentProjectPrefix] = useState<string>("");

  const getApiUrl = (path: string): string => {
    if (typeof window !== "undefined") return `${window.location.origin}${path}`;
    return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${path}`;
  };

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    return {
      "x-user-id": currentUserId,
      "x-user-name": currentUserName,
      "x-user-role": currentUserRole
    };
  };

  // Fetch tasks with employee filtering
  const fetchTasks = useCallback(async () => {
    try {
      console.log("Fetching tasks...");
      setDebugInfo("Fetching tasks from API...");
      
      const res = await fetch(getApiUrl("/api/tasks"), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      console.log("API Response status:", res.status);
      
      if (res.ok) {
        let taskData: Task[] = [];
        
        // Handle different response formats
        if (Array.isArray(data)) {
          taskData = data;
        } else if (data && Array.isArray(data.tasks)) {
          taskData = data.tasks;
        } else if (data && Array.isArray(data.data)) {
          taskData = data.data;
        } else if (data && data.success && Array.isArray(data.data)) {
          taskData = data.data;
        } else if (data && data.task) {
          taskData = [data.task];
        }
        
        console.log(`Parsed ${taskData.length} tasks from API`);
        
        // Process tasks to ensure proper task name display and subtasks
        taskData = taskData.map(task => {
          // Normalize task status
          const normalizedStatus = (() => {
            const status = task.status || 'Backlog';
            const statusMap: Record<string, string> = {
              'To Do': 'Todo',
              'To do': 'Todo',
              'todo': 'Todo',
              'Completed': 'Done',
              'completed': 'Done',
              'Paused': 'Blocked',
              'paused': 'Blocked',
            };
            return statusMap[status] || status;
          })();
          
          // Ensure subtasks is always an array and has proper structure
          let taskSubtasks: Subtask[] = [];
          if (task.subtasks && Array.isArray(task.subtasks)) {
            taskSubtasks = task.subtasks.map(sub => ({
              ...sub,
              id: sub.id || `sub-${Math.random().toString(36).substr(2, 9)}`,
              status: sub.status || "To Do",
              completion: sub.completion || 0,
              remarks: sub.remarks || "",
              timeSpent: sub.timeSpent || "0",
              storyPoints: sub.storyPoints || 0,
              assigneeName: sub.assigneeName || "",
              subtasks: sub.subtasks || []
            }));
          }
          
          return {
            ...task,
            status: normalizedStatus,
            subtasks: taskSubtasks,
            taskDisplayName: task.summary || task.title || task.name || `Task ${task.taskId || task._id?.substring(0, 8)}`,
            name: task.summary || task.title || task.name || `Task ${task.taskId || task._id?.substring(0, 8)}`
          };
        });
        
        console.log('Sample task subtasks count:', taskData[0]?.subtasks?.length || 0);
        if (taskData.length > 0 && taskData[0].subtasks) {
          console.log('First task subtasks sample:', taskData[0].subtasks.slice(0, 1));
        }
        
        setTasks(taskData);
        setDebugInfo(`Loaded ${taskData.length} total tasks`);
      } else {
        console.error("API Error:", data);
        toast.error(`Failed to load tasks: ${data.error || data.message || "Unknown error"}`);
      }
    } catch (err: any) { 
      console.error("Failed to fetch tasks:", err);
      toast.error("Database connection lost"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(getApiUrl("/api/employees"), {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  // --- Recursive Subtask Management ---
  const getNewSubtask = (prefix: string, pathStr: string): Subtask => ({
    id: `${prefix}-SUB-${pathStr}-${Math.floor(Math.random() * 1000)}`,
    title: "",
    assigneeName: currentUserName, // Default to current user for subtasks
    status: "To Do",
    completion: 0,
    remarks: "",
    subtasks: [],
    isEditing: true,
    isExpanded: true,
    date: new Date().toISOString().split('T')[0],
    timeSpent: "0", 
    storyPoints: 0,
  });

  const updateSubtaskState = (
    currentSubs: Subtask[], 
    path: number[], 
    updater: (sub: Subtask) => Subtask | null, 
    action: 'update' | 'remove' | 'add' = 'update'
  ): Subtask[] => {
    if (action === 'add' && path.length === 0) {
      return [...currentSubs, getNewSubtask(currentProjectPrefix, (currentSubs.length + 1).toString())];
    }

    const traverse = (list: Subtask[], targetPath: number[]): Subtask[] => {
      const [idx, ...rest] = targetPath;
      return list.map((item, i) => {
        if (i !== idx) return item;
        if (rest.length === 0) {
          if (action === 'add') {
            const newNestedSubs = [...(item.subtasks || [])];
            const newId = `${item.id}.${newNestedSubs.length + 1}`;
            newNestedSubs.push(getNewSubtask(currentProjectPrefix, newId));
            return { ...item, subtasks: newNestedSubs, isExpanded: true };
          }
          if (action === 'update') {
            const updated = updater(item);
            return updated ? { ...updated } : item;
          }
          return item;
        }
        return { ...item, subtasks: traverse(item.subtasks || [], rest) };
      }).filter((_, i) => !(action === 'remove' && targetPath.length === 1 && i === idx));
    };
    return traverse(currentSubs, path);
  };

  const openTaskModal = (task: Task) => {
    // Check if employee is assigned to this task
    if (currentUserRole === "Employee") {
      const isAssigned = task.assigneeNames?.some(
        name => name.toLowerCase() === currentUserName.toLowerCase()
      ) || task.assigneeIds?.some(id => id === currentUserId);
      
      if (!isAssigned) {
        toast.error("You are not assigned to this task");
        return;
      }
    }
    
    const aggregated = getAggregatedTaskData(task);
    
    console.log('Opening task modal for:', {
      taskId: task._id,
      originalSubtasks: task.subtasks,
      aggregatedSubtasks: aggregated.subtasks
    });
    
    // Ensure subtasks are properly formatted
    let taskSubtasks = task.subtasks || [];
    if (taskSubtasks && taskSubtasks.length > 0) {
      // Ensure each subtask has required fields
      taskSubtasks = taskSubtasks.map(sub => ({
        ...sub,
        id: sub.id || `sub-${Math.random().toString(36).substr(2, 9)}`,
        status: sub.status || "To Do",
        completion: sub.completion || 0,
        remarks: sub.remarks || "",
        timeSpent: sub.timeSpent || "0",
        storyPoints: sub.storyPoints || 0,
        assigneeName: sub.assigneeName || "",
        subtasks: sub.subtasks || []
      }));
    }
    
    // CRITICAL FIX: DO NOT FILTER SUBTASKS FOR EMPLOYEES
    // All users should see ALL subtasks, regardless of assignment
    // Only editing permissions will be restricted based on assignee
    const processedTask = {
      ...aggregated,
      name: aggregated.summary || aggregated.title || aggregated.name || `Task ${aggregated.taskId || aggregated._id?.substring(0, 8)}`,
      taskDisplayName: aggregated.summary || aggregated.title || aggregated.name || `Task ${aggregated.taskId || aggregated._id?.substring(0, 8)}`,
      // Always include all subtasks for all users
      subtasks: taskSubtasks
    };
    
    setSelectedTaskForModal(processedTask);
    setSubtasks(taskSubtasks); // Pass ALL subtasks
    setCurrentProjectPrefix(processedTask.taskId?.split('-')[0] || "TASK");
    setDraftTask(processedTask);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedTaskForModal(null);
  };

  const onTaskStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      // Check permission for employees
      if (currentUserRole === "Employee") {
        const isAssigned = task.assigneeNames?.some(
          name => name.toLowerCase() === currentUserName.toLowerCase()
        ) || task.assigneeIds?.some(id => id === currentUserId);
        
        if (!isAssigned) {
          toast.error("You are not authorized to change this task's status");
          return;
        }
      }

      // Normalize the status for API
      const normalizeStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
          'To Do': 'Todo',
          'To do': 'Todo',
          'todo': 'Todo',
          'Completed': 'Done',
          'completed': 'Done',
          'Paused': 'Blocked',
          'paused': 'Blocked',
        };
        return statusMap[status] || status;
      };

      const normalizedStatus = normalizeStatus(newStatus);

      const res = await fetch(getApiUrl(`/api/tasks/${taskId}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          status: normalizedStatus,
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole
        }),
      });
      
      if (res.ok) { 
        await fetchTasks();
        toast.info(`Status updated to: ${newStatus}`); 
      } else {
        const errorData = await res.json();
        console.error("Status update error:", errorData);
        
        if (errorData.code === 'PERMISSION_DENIED') {
          toast.error("Access denied. You don't have permission to update this task.");
        } else {
          toast.error(errorData.error || "Failed to update status");
        }
      }
    } catch (err) { 
      console.error("Failed to update task status:", err);
      toast.error("Update failed"); 
    }
  }, [tasks, currentUserRole, currentUserName, currentUserId, fetchTasks]);

  const onSubtaskStatusChange = useCallback(async (taskId: string, subtaskId: string | null, newStatus: string) => {
    if (!subtaskId) return;
    
    const targetTask = tasks.find(t => t._id === taskId);
    if (!targetTask) {
      toast.error("Task not found");
      return;
    }

    // Check permission for employees
    if (currentUserRole === "Employee") {
      const isAssigned = targetTask.assigneeNames?.some(
        name => name.toLowerCase() === currentUserName.toLowerCase()
      ) || targetTask.assigneeIds?.some(id => id === currentUserId);
      
      if (!isAssigned) {
        toast.error("You are not assigned to this task");
        return;
      }

      // Find the specific subtask
      const findSubtask = (subtasks: Subtask[]): Subtask | null => {
        for (const sub of subtasks) {
          if (sub.id === subtaskId) return sub;
          if (sub.subtasks) {
            const found = findSubtask(sub.subtasks);
            if (found) return found;
          }
        }
        return null;
      };

      const subtask = findSubtask(targetTask.subtasks || []);
      if (!subtask) {
        toast.error("Subtask not found");
        return;
      }

      // Check if subtask is assigned to current employee
      if (subtask.assigneeName?.toLowerCase() !== currentUserName.toLowerCase() && subtask.assigneeName) {
        toast.error("You are not assigned to this subtask");
        return;
      }
    }
    
    const updateRecursive = (subs: Subtask[]): Subtask[] => 
      subs.map(s => s.id === subtaskId ? { ...s, status: newStatus } : { ...s, subtasks: updateRecursive(s.subtasks || []) });
    
    try {
      const updatedSubtasks = updateRecursive(targetTask.subtasks || []);
      
      const res = await fetch(getApiUrl(`/api/tasks/${taskId}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          subtasks: updatedSubtasks,
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole
        }),
      });
      
      if (res.ok) {
        await fetchTasks();
        toast.success("Subtask status updated");
      } else {
        const errorData = await res.json();
        console.error("Subtask update error:", errorData);
        
        if (errorData.code === 'PERMISSION_DENIED') {
          toast.error("Access denied. You don't have permission to update this subtask.");
        } else if (errorData.unauthorizedFields) {
          toast.error(`You can only update: ${errorData.unauthorizedFields.join(', ')}`);
        } else {
          toast.error(errorData.error || "Failed to update subtask");
        }
      }
    } catch (err) {
      console.error("Failed to update subtask status:", err);
      toast.error("Update failed");
    }
  }, [tasks, currentUserRole, currentUserName, currentUserId, fetchTasks]);

  // Handle starting a sprint (move from Backlog/Icebox to Todo)
  const handleStartSprint = useCallback(async (taskId: string) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      // Check if task is in Icebox or Backlog
      if (task.status !== "Icebox" && task.status !== "Backlog") {
        toast.error("Only tasks in Icebox or Backlog can be started");
        return;
      }

      // Check permission
      if (currentUserRole === "Employee") {
        const isAssigned = task.assigneeNames?.some(
          name => name.toLowerCase() === currentUserName.toLowerCase()
        ) || task.assigneeIds?.some(id => id === currentUserId);
        
        if (!isAssigned) {
          toast.error("You are not authorized to start this task");
          return;
        }
      }

      const res = await fetch(getApiUrl(`/api/tasks/${taskId}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          status: "Todo", // Move to Todo when starting sprint
          userId: currentUserId,
          userName: currentUserName,
          userRole: currentUserRole
        }),
      });
      
      if (res.ok) { 
        await fetchTasks();
        toast.success("Task started! Moved to Todo"); 
      } else {
        const errorData = await res.json();
        console.error("Start sprint error:", errorData);
        toast.error(errorData.error || "Failed to start task");
      }
    } catch (err) { 
      console.error("Failed to start task:", err);
      toast.error("Failed to start task"); 
    }
  }, [tasks, currentUserRole, currentUserName, currentUserId, fetchTasks]);

  // Fixed handleUpdate function
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForModal?._id) return;
    
    try {
      // Check if user is authorized to edit this task
      if (currentUserRole === "Employee") {
        const isAssigned = selectedTaskForModal.assigneeNames?.some(
          name => name.toLowerCase() === currentUserName.toLowerCase()
        ) || selectedTaskForModal.assigneeIds?.some(id => id === currentUserId);
        
        if (!isAssigned) {
          toast.error("You are not authorized to edit this task");
          return;
        }
      }
      
      console.log('Current subtasks state:', subtasks);
      console.log('Current draftTask:', draftTask);
      
      // Prepare the request body
      const requestBody: any = {
        // Add user info to body for API verification
        userId: currentUserId,
        userName: currentUserName,
        userRole: currentUserRole,
        updatedAt: new Date().toISOString()
      };
      
      // Normalize status if it's being updated
      if (draftTask.status) {
        const normalizeStatus = (status: string): string => {
          const statusMap: Record<string, string> = {
            'To Do': 'Todo',
            'To do': 'Todo',
            'todo': 'Todo',
            'Completed': 'Done',
            'completed': 'Done',
            'Paused': 'Blocked',
            'paused': 'Blocked',
          };
          return statusMap[status] || status;
        };
        requestBody.status = normalizeStatus(draftTask.status);
      }
      
      // CRITICAL: Always include subtasks, even if empty array
      if (subtasks && Array.isArray(subtasks)) {
        console.log('Including subtasks in request:', subtasks.length);
        console.log('Subtasks structure:', JSON.stringify(subtasks, null, 2));
        requestBody.subtasks = subtasks;
      } else {
        console.log('No subtasks found, sending empty array');
        requestBody.subtasks = [];
      }
      
      // Include fields from draftTask
      const fieldsToInclude = ['completion', 'remarks', 'summary', 'assigneeNames', 'dueDate', 'description'];
      
      fieldsToInclude.forEach(field => {
        if (draftTask[field as keyof Task] !== undefined) {
          requestBody[field] = draftTask[field as keyof Task];
        }
      });
      
      // For non-employees, include all fields except system fields
      if (currentUserRole !== "Employee") {
        Object.keys(draftTask).forEach(key => {
          if (draftTask[key as keyof Task] !== undefined && !['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'taskDisplayName'].includes(key)) {
            requestBody[key] = draftTask[key as keyof Task];
          }
        });
      }
      
      console.log("Sending update request for task:", selectedTaskForModal._id);
      console.log("Request body keys:", Object.keys(requestBody));
      console.log("Subtasks being sent:", requestBody.subtasks?.length || 0);
      
      const res = await fetch(getApiUrl(`/api/tasks/${selectedTaskForModal._id}`), {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await res.json();
      
      if (res.ok) {
        toast.success("Task updated successfully");
        await fetchTasks();
        closeTaskModal();
      } else {
        console.error("Update error details:", responseData);
        
        if (responseData.code === 'PERMISSION_DENIED') {
          toast.error("Access denied. You don't have permission to update this task.");
        } else if (responseData.unauthorizedFields) {
          toast.error(`You can only update: ${responseData.unauthorizedFields.join(', ')}`);
        } else {
          toast.error(responseData.error || "Update failed");
        }
      }
    } catch (err: any) { 
      console.error("Failed to update task:", err);
      toast.error("Sync failed"); 
    }
  };

  const handleDelete = async (id: string) => {
    if (currentUserRole === "Employee") {
      toast.error("Employees cannot delete tasks");
      return;
    }
    
    if (!window.confirm("Permanent delete? This cannot be undone.")) return;
    
    try {
      const res = await fetch(getApiUrl(`/api/tasks/${id}`), { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        toast.success("Task removed");
        await fetchTasks();
        closeTaskModal();
      } else {
        const errorData = await res.json();
        console.error("Delete error:", errorData);
        
        if (errorData.code === 'PERMISSION_DENIED') {
          toast.error("Access denied. You don't have permission to delete tasks.");
        } else {
          toast.error(errorData.error || "Delete failed");
        }
      }
    } catch (err) { 
      console.error("Failed to delete task:", err);
      toast.error("Delete failed"); 
    }
  };

  // Initialize user data from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("userRole");
      const name = localStorage.getItem("userName");
      const id = localStorage.getItem("userId");
      
      setCurrentUserRole(role === "Admin" || role === "Manager" || role === "TeamLead" ? role : "Employee");
      setCurrentUserName(name || "");
      setCurrentUserId(id || "");
      
      setDebugInfo(`User: ${name} (${role}), ID: ${id}`);
    }
  }, []);

  // Fetch data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchEmployees()]);
    };
    init();
  }, [fetchTasks]);

  // Filter tasks based on role and search - with proper task name display
  const filteredTasks = useMemo(() => {
    console.log("Current user:", { currentUserRole, currentUserName, currentUserId });
    
    let base = tasks.map(task => ({
      ...task,
      name: task.summary || task.title || task.name || `Task ${task.taskId || task._id?.substring(0, 8)}`,
      taskDisplayName: task.summary || task.title || task.name || `Task ${task.taskId || task._id?.substring(0, 8)}`
    }));
    
    // Apply role-based filtering
    if (currentUserRole === "Employee" && currentUserName) {
      base = base.filter(t => {
        const assigneeMatches = t.assigneeNames?.some(
          name => name.toLowerCase() === currentUserName.toLowerCase()
        );
        const assigneeIdMatches = t.assigneeIds?.some(id => id === currentUserId);
        
        const isAssigned = assigneeMatches || assigneeIdMatches;
        
        return isAssigned;
      });
      
      console.log(`Employee view: ${base.length} tasks after filtering`);
    } else {
      console.log(`${currentUserRole} view: ${base.length} tasks`);
    }
    
    // Apply search filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      base = base.filter(t => 
        (t.remarks?.toLowerCase() || "").includes(s) || 
        (t.taskId?.toLowerCase() || "").includes(s) || 
        (t.project?.toLowerCase() || "").includes(s) ||
        (t.summary?.toLowerCase() || "").includes(s) ||
        (t.title?.toLowerCase() || "").includes(s) ||
        (t.name?.toLowerCase() || "").includes(s)
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      const normalizedStatusFilter = (() => {
        const statusMap: Record<string, string> = {
          'To Do': 'Todo',
          'To do': 'Todo',
          'todo': 'Todo',
          'Completed': 'Done',
          'completed': 'Done',
          'Paused': 'Blocked',
          'paused': 'Blocked',
        };
        return statusMap[statusFilter] || statusFilter;
      })();
      
      base = base.filter(t => t.status === normalizedStatusFilter);
    }
    
    return base;
  }, [tasks, currentUserRole, currentUserName, currentUserId, searchTerm, statusFilter]);

  // Stats for employee dashboard (only their assigned tasks)
  const taskStats = useMemo(() => {
    if (currentUserRole !== "Employee") {
      return { total: 0, completed: 0, inProgress: 0, todo: 0 };
    }
    
    const employeeTasks = filteredTasks.filter(t => {
      const assigneeMatches = t.assigneeNames?.some(
        name => name.toLowerCase() === currentUserName.toLowerCase()
      );
      const assigneeIdMatches = t.assigneeIds?.some(id => id === currentUserId);
      return assigneeMatches || assigneeIdMatches;
    });
    
    // Updated to include all completion statuses
    const completionStatuses = ["Done", "Completed", "Closed", "Live"];
    const todoStatuses = ["Todo", "Backlog", "Icebox", "Prioritized", "Ready for Dev"];
    const inProgressStatuses = ["In Progress", "Dev Review", "Code Review", "QA Ready", "QA In Progress", "QA Review", "UAT", "Client Review", "Ready for Release", "Staging"];
    
    return {
      total: employeeTasks.length,
      completed: employeeTasks.filter(t => completionStatuses.includes(t.status)).length,
      inProgress: employeeTasks.filter(t => inProgressStatuses.includes(t.status)).length,
      todo: employeeTasks.filter(t => todoStatuses.includes(t.status)).length,
    };
  }, [filteredTasks, currentUserRole, currentUserName, currentUserId]);

  // Add a manual refresh button for debugging
  const handleRefresh = async () => {
    setLoading(true);
    await fetchTasks();
    toast.info("Tasks refreshed");
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Loading Workspace</span>
      {debugInfo && (
        <div className="mt-4 text-xs text-slate-500 max-w-md text-center">
          {debugInfo}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" /> 
      
     

      <main className="flex-1 min-h-screen pb-20 px-4 sm:px-6 lg:px-8 pt-44 w-full">
        <div className="mx-auto w-full max-w-none px-4">
          <div className="space-y-12">
            {/* Header with User Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 px-2">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-blue-600">
                  <Layers size={22} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                    {currentUserRole === "Employee" ? "My Work Dashboard" : "Operational Flow"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                    {currentUserRole === "Employee" ? "My Tasks" : "Task Board"}
                  </h1>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full">
                    <User size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-700">{currentUserName}</span>
                  </div>
                </div>
                <p className="text-slate-500 font-medium text-xl">
                  {currentUserRole === "Employee" 
                    ? `Active Tasks Assigned to You (${taskStats.total})`
                    : `Active Task Management (${filteredTasks.length})`
                  }
                </p>
              </div>
              
              {currentUserRole === "Employee" && taskStats.total > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-xs font-bold text-slate-500">Completed</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">{taskStats.completed}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-500" />
                      <span className="text-xs font-bold text-slate-500">In Progress</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">{taskStats.inProgress}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-orange-500" />
                      <span className="text-xs font-bold text-slate-500">To Do</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">{taskStats.todo}</p>
                  </div>
                </div>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner text-center w-full">
                <Trello className="w-24 h-24 text-slate-100 mb-8" />
                <h3 className="text-3xl font-black text-slate-300 uppercase tracking-widest">
                  {currentUserRole === "Employee" ? "No Tasks Assigned" : "No Tasks Found"}
                </h3>
                <p className="text-slate-400 mt-2 font-medium max-w-sm">
                  {currentUserRole === "Employee" 
                    ? `You don't have any tasks assigned to you yet (${currentUserName}).`
                    : "No tasks were found matching your current filters."
                  }
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw size={16} />
                    Refresh Tasks
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Total tasks in system: {tasks.length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 w-full">
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="text-sm text-slate-500">
                    {currentUserRole === "Employee" 
                      ? `Showing ${filteredTasks.length} tasks assigned to you`
                      : `Showing ${filteredTasks.length} of ${tasks.length} tasks`
                    }
                  </div>
                  <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>
                
                {/* Task Board View with fixed height and scroll */}
                <div className="w-full">
                  <TaskBoardView 
                    tasks={filteredTasks} 
                    openTaskModal={openTaskModal} 
                    onTaskStatusChange={onTaskStatusChange} 
                    currentUserRole={currentUserRole}
                    currentUserName={currentUserName}
                    currentUserId={currentUserId}
                    containerHeight="70vh" // Fixed height for the entire board
                    columnMaxHeight="60vh" // Max height for individual columns
                    visibleRows={2} // Show only 2 tasks initially
                  />
                </div>
              </div>
            )}

                      {selectedTaskForModal && (
              <TaskModal 
                task={selectedTaskForModal} 
                isOpen={isModalOpen} 
                onClose={closeTaskModal} 
                isEditing={isEditing} 
                draftTask={draftTask} 
                subtasks={subtasks} 
                employees={employees} 
                currentProjectPrefix={currentProjectPrefix} 
                // REMOVED: allTaskStatuses={allTaskStatuses} // This prop no longer exists
                handleEdit={() => setIsEditing(true)} 
                handleDelete={handleDelete} 
                handleUpdate={handleUpdate} 
                handleStartSprint={handleStartSprint} 
                cancelEdit={() => setIsEditing(false)} 
                handleDraftChange={(e) => {
                  const { name, value } = e.target;
                  setDraftTask(prev => ({ ...prev, [name]: value }));
                }} 
                handleSubtaskChange={(path, field, val) => setSubtasks(prev => updateSubtaskState(prev, path, (s) => ({ ...s, [field]: val })))} 
                addSubtask={(path) => setSubtasks(prev => updateSubtaskState(prev, path, () => null, 'add'))} 
                removeSubtask={(path) => setSubtasks(prev => updateSubtaskState(prev, path, () => null, 'remove'))} 
                onToggleEdit={(path) => setSubtasks(prev => updateSubtaskState(prev, path, (s) => ({ ...s, isEditing: !s.isEditing })))} 
                onToggleExpansion={(path) => setSubtasks(prev => updateSubtaskState(prev, path, (s) => ({ ...s, isExpanded: !s.isExpanded })))} 
                onTaskStatusChange={onTaskStatusChange} 
                onSubtaskStatusChange={onSubtaskStatusChange} 
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TasksPage;