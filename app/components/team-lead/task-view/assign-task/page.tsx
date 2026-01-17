"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Target, GitBranch, ClipboardCheck, Users,
  Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, 
  ChevronRight, ArrowUpRight, BarChart3, PieChart, 
  TrendingUp, Hash, Tag, Flag, User, MessageSquare,
  Paperclip, ExternalLink, CalendarDays, Clock as ClockIcon,
  CheckSquare, Square, BookOpen, Bug
} from "lucide-react";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

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

// Independent interface definition to avoid TypeScript conflicts
interface TaskWithSubtasks {
  _id: string;
  title: string;
  description?: string;
  projectId: string;
  epicId?: string;
  assigneeIds: string[];
  reporterIds: string[];
  assigneeNames?: string[];
  reporterNames?: string[];
  epicName?: string;
  projectName?: string;
  subtasks?: Subtask[];
  summary: string;
  issueKey: string;
  issueType: "Story" | "Task" | "Bug";
  storyPoints: number;
  status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
  priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectViewProps {
  employees: Employee[];
}

export default function ProjectView({ employees }: ProjectViewProps) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasks, setTasks] = useState<TaskWithSubtasks[]>([]);
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Filter states
  const [projectSearch, setProjectSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  // Progress statistics
  const [projectStats, setProjectStats] = useState({
    totalProjects: 0,
    totalEpics: 0,
    totalTasks: 0,
    totalSubtasks: 0,
    overallProgress: 0,
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      const projectsList = Array.isArray(projectsData) ? projectsData : 
                          projectsData.data || projectsData.projects || [];
      setProjects(projectsList);
      setProjectStats(prev => ({ ...prev, totalProjects: projectsList.length }));

      // Fetch epics
      const epicsRes = await fetch('/api/epics');
      const epicsData = await epicsRes.json();
      const epicsList = Array.isArray(epicsData) ? epicsData : 
                       epicsData.data || epicsData.epics || [];
      setEpics(epicsList);
      setProjectStats(prev => ({ ...prev, totalEpics: epicsList.length }));

      // Fetch tasks
      const tasksRes = await fetch('/api/tasks');
      const tasksData = await tasksRes.json();
      let tasksList: any[] = [];
      
      if (Array.isArray(tasksData)) {
        tasksList = tasksData;
      } else if (tasksData && Array.isArray(tasksData.data)) {
        tasksList = tasksData.data;
      } else if (tasksData && Array.isArray(tasksData.tasks)) {
        tasksList = tasksData.tasks;
      }
      
      // Transform task data to ensure proper typing
      const transformedTasks = tasksList.map(task => ({
        _id: task._id || '',
        title: task.title || '',
        description: task.description || '',
        projectId: task.projectId || '',
        epicId: task.epicId || '',
        assigneeIds: task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []),
        reporterIds: task.reporterIds || (task.reporterId ? [task.reporterId] : []),
        assigneeNames: task.assigneeNames || [],
        reporterNames: task.reporterNames || [],
        epicName: task.epicName || '',
        projectName: task.projectName || '',
        subtasks: task.subtasks || [],
        summary: task.summary || '',
        issueKey: task.issueKey || task.taskId || `TASK-${task._id?.substring(0, 8) || 'N/A'}`,
        issueType: task.issueType || "Task",
        storyPoints: task.storyPoints || 0,
        status: task.status || "Backlog",
        priority: task.priority || "Medium",
        dueDate: task.dueDate || '',
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString()
      } as TaskWithSubtasks));
      
      setTasks(transformedTasks);
      setProjectStats(prev => ({ ...prev, totalTasks: transformedTasks.length }));

      // Calculate subtask total
      const totalSubtasks = transformedTasks.reduce((acc: number, task: TaskWithSubtasks) => {
        return acc + (task.subtasks?.length || 0);
      }, 0);
      setProjectStats(prev => ({ ...prev, totalSubtasks }));

      // Calculate overall progress
      if (transformedTasks.length > 0) {
        const totalTasks = transformedTasks.length;
        const completedTasks = transformedTasks.filter((task: TaskWithSubtasks) => 
          task.status === "Done"
        ).length;
        const overallProgress = Math.round((completedTasks / totalTasks) * 100);
        setProjectStats(prev => ({ ...prev, overallProgress }));
      }

    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get epics for selected project
  const getProjectEpics = useMemo(() => {
    if (!selectedProject) return [];
    return epics.filter(epic => epic.projectId === selectedProject._id);
  }, [selectedProject, epics]);

  // Get tasks for selected epic
  const getEpicTasks = useMemo(() => {
    if (!selectedEpic) return [];
    return tasks.filter(task => task.epicId === selectedEpic._id);
  }, [selectedEpic, tasks]);

  // Get tasks for selected project (when no epic selected)
  const getProjectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks.filter(task => task.projectId === selectedProject._id);
  }, [selectedProject, tasks]);

  // Get filtered tasks based on current filters
  const getFilteredTasks = useMemo(() => {
    const taskList = selectedEpic ? getEpicTasks : getProjectTasks;
    
    return taskList.filter(task => {
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
      return matchesStatus && matchesPriority;
    });
  }, [selectedEpic, getEpicTasks, getProjectTasks, statusFilter, priorityFilter]);

  // Toggle epic expansion
  const toggleEpicExpand = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  // Toggle task expansion
  const toggleTaskExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Calculate task progress
  const calculateTaskProgress = (task: TaskWithSubtasks) => {
    if (task.subtasks && task.subtasks.length > 0) {
      const doneSubtasks = task.subtasks.filter(s => s.status === "Done").length;
      return Math.round((doneSubtasks / task.subtasks.length) * 100);
    }
    
    // If no subtasks, use task status
    switch (task.status) {
      case "Done": return 100;
      case "In Progress": return 50;
      case "Review": return 75;
      case "Todo": return 10;
      case "Backlog": return 0;
      case "Blocked": return 0;
      default: return 0;
    }
  };

  // Calculate epic progress
  const calculateEpicProgress = (epic: Epic) => {
    const epicTasks = tasks.filter(task => task.epicId === epic._id);
    if (epicTasks.length === 0) return 0;
    
    const totalProgress = epicTasks.reduce((acc, task) => {
      return acc + calculateTaskProgress(task);
    }, 0);
    
    return Math.round(totalProgress / epicTasks.length);
  };

  // Calculate project progress
  const calculateProjectProgress = (project: SavedProject) => {
    const projectTasks = tasks.filter(task => task.projectId === project._id);
    if (projectTasks.length === 0) return 0;
    
    const totalProgress = projectTasks.reduce((acc, task) => {
      return acc + calculateTaskProgress(task);
    }, 0);
    
    return Math.round(totalProgress / projectTasks.length);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Review": return "bg-purple-100 text-purple-800";
      case "Todo": return "bg-yellow-100 text-yellow-800";
      case "Backlog": return "bg-gray-100 text-gray-800";
      case "Blocked": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Highest": return "bg-red-100 text-red-800";
      case "High": return "bg-orange-100 text-orange-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      case "Lowest": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get subtask status color - fixed
  const getSubtaskStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Todo": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get issue type color
  const getIssueTypeColor = (issueType: string) => {
    switch(issueType) {
      case "Story": return "bg-blue-100 text-blue-800";
      case "Task": return "bg-green-100 text-green-800";
      case "Bug": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get issue type icon
  const getIssueTypeIcon = (issueType: string) => {
    switch(issueType) {
      case "Story": return <BookOpen size={12} />;
      case "Task": return <ClipboardCheck size={12} />;
      case "Bug": return <Bug size={12} />;
      default: return <ClipboardCheck size={12} />;
    }
  };

  // Format date
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

  // Get assignee names
  const getAssigneeNames = (task: TaskWithSubtasks) => {
    if (task.assigneeNames && task.assigneeNames.length > 0) {
      return task.assigneeNames;
    }
    return employees
      .filter(emp => task.assigneeIds?.includes(emp._id))
      .map(emp => emp.name);
  };

  // Get reporter names
  const getReporterNames = (task: TaskWithSubtasks) => {
    if (task.reporterNames && task.reporterNames.length > 0) {
      return task.reporterNames;
    }
    return employees
      .filter(emp => task.reporterIds?.includes(emp._id))
      .map(emp => emp.name);
  };

  // Filtered projects based on search
  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      project.key.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3fa87d]"></div>
        <p className="mt-4 text-slate-600">Loading projects data...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center mt-15 justify-center p-4 bg-slate-50">
      <div className="h-[80vh] w-full max-w-[85%] flex flex-col bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Projects Overview</h1>
              <p className="text-slate-600 mt-1">View all projects, epics, tasks, and subtasks</p>
            </div>
            
            {/* Stats Summary */}
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-800">{projectStats.totalProjects}</div>
                <div className="text-xs text-slate-600">Projects</div>
              </div>
              <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-800">{projectStats.totalTasks}</div>
                <div className="text-xs text-slate-600">Tasks</div>
              </div>
              <div className="text-center px-4 py-2 bg-[#3fa87d]/10 rounded-xl">
                <div className="text-2xl font-bold text-[#3fa87d]">{projectStats.overallProgress}%</div>
                <div className="text-xs text-[#3fa87d]">Progress</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-[#3fa87d]"
              />
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-[#3fa87d]"
              >
                <option value="">All Status</option>
                <option value="Backlog">Backlog</option>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-[#3fa87d]"
              >
                <option value="">All Priority</option>
                <option value="Lowest">Lowest</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Highest">Highest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Left Sidebar - Projects List */}
            <div className="w-80 border-r border-slate-100 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-sm font-bold text-slate-800 mb-4">Projects</h2>
                <div className="space-y-2">
                  {filteredProjects.map(project => (
                    <div
                      key={project._id}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedProject?._id === project._id
                          ? 'bg-[#3fa87d]/10 border-2 border-[#3fa87d]'
                          : 'bg-slate-50 border-2 border-slate-100 hover:border-slate-200'
                      }`}
                      onClick={() => {
                        setSelectedProject(project);
                        setSelectedEpic(null);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                            <FileText size={16} className="text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{project.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono font-bold">{project.key}</span>
                              <span>•</span>
                              <span>{formatDate(project.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowUpRight size={16} className="text-slate-400" />
                      </div>
                      
                      {/* Project Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600">Progress</span>
                          <span className="text-xs font-bold text-slate-800">
                            {calculateProjectProgress(project)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-[#3fa87d] h-2 rounded-full transition-all"
                            style={{ width: `${calculateProjectProgress(project)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Area - Epics, Tasks, Subtasks */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedProject ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Target className="text-slate-300 mb-4" size={48} />
                  <p className="text-slate-400 font-bold mb-2">Select a project to view details</p>
                  <p className="text-slate-400 text-sm">Projects, epics, tasks, and subtasks will appear here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Project Header */}
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-800">{selectedProject.name}</h2>
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                            {selectedProject.key}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{selectedProject.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500">Overall Progress</div>
                        <div className="text-3xl font-bold text-[#3fa87d]">
                          {calculateProjectProgress(selectedProject)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Epics Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Target size={20} />
                        Epics ({getProjectEpics.length})
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {getProjectEpics.map(epic => {
                        const isExpanded = expandedEpics.has(epic._id);
                        const epicTasks = tasks.filter(task => task.epicId === epic._id);
                        
                        return (
                          <div key={epic._id} className="border-2 border-slate-200 rounded-2xl">
                            {/* Epic Header */}
                            <div 
                              className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => toggleEpicExpand(epic._id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown size={20} className="text-slate-500" />
                                  ) : (
                                    <ChevronRight size={20} className="text-slate-500" />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                                        {epic.epicId}
                                      </span>
                                      <h4 className="font-bold text-slate-800">{epic.name}</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{epic.description}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  {/* Epic Progress */}
                                  <div className="text-right">
                                    <div className="text-xs text-slate-500">Progress</div>
                                    <div className="text-lg font-bold text-slate-800">
                                      {calculateEpicProgress(epic)}%
                                    </div>
                                  </div>
                                  
                                  {/* Tasks Count */}
                                  <div className="text-right">
                                    <div className="text-xs text-slate-500">Tasks</div>
                                    <div className="text-lg font-bold text-slate-800">
                                      {epicTasks.length}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tasks List (if expanded) */}
                            {isExpanded && (
                              <div className="p-4 pt-0">
                                <div className="space-y-3 mt-3">
                                  {epicTasks.length === 0 ? (
                                    <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                      <ClipboardCheck className="mx-auto text-slate-300 mb-2" size={24} />
                                      <p className="text-slate-400">No tasks in this epic</p>
                                    </div>
                                  ) : (
                                    epicTasks.map(task => (
                                      <TaskCard
                                        key={task._id}
                                        task={task}
                                        isExpanded={expandedTasks.has(task._id)}
                                        onToggle={() => toggleTaskExpand(task._id)}
                                        calculateProgress={calculateTaskProgress}
                                        getStatusColor={getStatusColor}
                                        getPriorityColor={getPriorityColor}
                                        getSubtaskStatusColor={getSubtaskStatusColor}
                                        getIssueTypeColor={getIssueTypeColor}
                                        getIssueTypeIcon={getIssueTypeIcon}
                                        getAssigneeNames={() => getAssigneeNames(task)}
                                        getReporterNames={() => getReporterNames(task)}
                                        formatDate={formatDate}
                                      />
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* If no epics, show tasks directly */}
                      {getProjectEpics.length === 0 && (
                        <div className="space-y-3">
                          {getFilteredTasks.map(task => (
                            <TaskCard
                              key={task._id}
                              task={task}
                              isExpanded={expandedTasks.has(task._id)}
                              onToggle={() => toggleTaskExpand(task._id)}
                              calculateProgress={calculateTaskProgress}
                              getStatusColor={getStatusColor}
                              getPriorityColor={getPriorityColor}
                              getSubtaskStatusColor={getSubtaskStatusColor}
                              getIssueTypeColor={getIssueTypeColor}
                              getIssueTypeIcon={getIssueTypeIcon}
                              getAssigneeNames={() => getAssigneeNames(task)}
                              getReporterNames={() => getReporterNames(task)}
                              formatDate={formatDate}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Card Component
interface TaskCardProps {
  task: TaskWithSubtasks;
  isExpanded: boolean;
  onToggle: () => void;
  calculateProgress: (task: TaskWithSubtasks) => number;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getSubtaskStatusColor: (status: string) => string;
  getIssueTypeColor: (issueType: string) => string;
  getIssueTypeIcon: (issueType: string) => React.ReactNode;
  getAssigneeNames: () => string[];
  getReporterNames: () => string[];
  formatDate: (date: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isExpanded,
  onToggle,
  calculateProgress,
  getStatusColor,
  getPriorityColor,
  getSubtaskStatusColor,
  getIssueTypeColor,
  getIssueTypeIcon,
  getAssigneeNames,
  getReporterNames,
  formatDate
}) => {
  const progress = calculateProgress(task);
  const assigneeNames = getAssigneeNames();
  const reporterNames = getReporterNames();
  
  return (
    <div className="border-2 border-slate-200 rounded-2xl">
      {/* Task Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getIssueTypeColor(task.issueType)}`}>
              {getIssueTypeIcon(task.issueType)}
              <span>{task.issueType}</span>
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getStatusColor(task.status)}`}>
              {task.status}
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
              <Flag size={10} />
              {task.priority}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-slate-500">Progress</div>
              <div className="text-sm font-bold text-slate-800">{progress}%</div>
            </div>
            {isExpanded ? (
              <ChevronDown size={20} className="text-slate-500" />
            ) : (
              <ChevronRight size={20} className="text-slate-500" />
            )}
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 mb-1">{task.summary}</h4>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                {task.issueKey}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(task.createdAt)}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Due: {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          
          {task.storyPoints > 0 && (
            <div className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              {task.storyPoints} SP
            </div>
          )}
        </div>
        
        {/* Assignees and Reporters */}
        {(assigneeNames.length > 0 || reporterNames.length > 0) && (
          <div className="flex items-start gap-6 text-xs text-slate-600 mt-3">
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
        )}
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' :
                progress >= 50 ? 'bg-blue-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Subtasks (if expanded) */}
      {isExpanded && task.subtasks && task.subtasks.length > 0 && (
        <div className="p-4 pt-0">
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <CheckSquare size={16} />
              Subtasks ({task.subtasks.length})
            </h5>
            
            <div className="space-y-3">
              {task.subtasks.map(subtask => (
                <div key={subtask._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {subtask.status === "Done" ? (
                          <CheckSquare size={14} className="text-green-500" />
                        ) : (
                          <Square size={14} className="text-slate-400" />
                        )}
                        <span className="font-medium text-slate-800">{subtask.title}</span>
                      </div>
                      <div className={`px-2 py-0.5 text-xs font-bold rounded-full ${getSubtaskStatusColor(subtask.status)}`}>
                        {subtask.status}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-800">{subtask.progressPercentage}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {subtask.assigneeName}
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays size={12} className="text-slate-400" />
                      Updated: {formatDate(subtask.updatedAt)}
                    </div>
                  </div>
                  
                  {/* Subtask Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full ${
                        subtask.status === 'Done' ? 'bg-green-500' :
                        subtask.status === 'In Progress' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: `${subtask.progressPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};