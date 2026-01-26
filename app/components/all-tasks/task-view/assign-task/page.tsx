"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Target, GitBranch, ClipboardCheck, Users,
  Calendar, Clock, CheckCircle, AlertCircle, ChevronDown, 
  ChevronRight, ArrowUpRight, BarChart3, PieChart, 
  TrendingUp, Hash, Tag, Flag, User, MessageSquare,
  Paperclip, ExternalLink, CalendarDays, Clock as ClockIcon,
  CheckSquare, Square, BookOpen, Bug, Download,
  Filter, FileSpreadsheet, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight as ChevronRightIcon, Search,
  X, UserCheck, Users as UsersIcon, Filter as FilterIcon,
  Loader2, Sparkles, AlertTriangle, List, ListTree, FilePieChart
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Employee, SavedProject, Epic } from "@/app/types/project";

// Add PDF generation imports
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";

interface Subtask {
  _id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: "Todo" | "In Progress" | "Done" | "Blocked";
  progressPercentage: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

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

type DateRangeType = 'custom' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'allTime';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  type: DateRangeType;
}

interface AssigneeFilter {
  id: string;
  name: string;
  selected: boolean;
}

// TaskCardProps Interface
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
  getAssigneeNames: (task: TaskWithSubtasks) => string[];
  getReporterNames: (task: TaskWithSubtasks) => string[];
  formatDate: (date: string) => string;
}

// TaskCard Component
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
  const assigneeNames = getAssigneeNames(task);
  const reporterNames = getReporterNames(task);
  
  // Get subtask status icon
  const getSubtaskStatusIcon = (status: Subtask["status"]) => {
    switch(status) {
      case "Done": return <CheckSquare size={14} className="text-green-500" />;
      case "In Progress": return <ClockIcon size={14} className="text-blue-500" />;
      case "Blocked": return <AlertTriangle size={14} className="text-red-500" />;
      case "Todo": return <Square size={14} className="text-gray-400" />;
      default: return <Square size={14} className="text-gray-400" />;
    }
  };
  
  return (
    <div className="border-2 border-gray-200 rounded-2xl">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getIssueTypeColor(task.issueType)}`}>
              {getIssueTypeIcon(task.issueType)}
              <span className="text-black">{task.issueType}</span>
            </div>
            <div className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-blue-50 border border-blue-200">
              <List size={10} className="text-blue-600" />
              <span className="text-black">Main Task</span>
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getStatusColor(task.status)}`}>
              <span className="text-black">{task.status}</span>
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
              <Flag size={10} />
              <span className="text-black">{task.priority}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-gray-500">Progress</div>
              <div className="text-sm font-bold text-black">{progress}%</div>
            </div>
            {isExpanded ? (
              <ChevronDown size={20} className="text-gray-500" />
            ) : (
              <ChevronRight size={20} className="text-gray-500" />
            )}
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-bold text-black mb-1">{task.summary}</h4>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-mono font-bold bg-gray-100 px-2 py-0.5 rounded text-black">
                {task.issueKey}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(task.createdAt)}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  <span className="text-black">Due: {formatDate(task.dueDate)}</span>
                </span>
              )}
            </div>
          </div>
          
          {task.storyPoints > 0 && (
            <div className="px-3 py-1 bg-gray-100 text-black text-xs font-bold rounded-full border border-gray-200">
              {task.storyPoints} SP
            </div>
          )}
        </div>
        
        {/* Assignees and Reporters */}
        {(assigneeNames.length > 0 || reporterNames.length > 0) && (
          <div className="flex items-start gap-6 text-xs text-gray-600 mt-3">
            {assigneeNames.length > 0 && (
              <div>
                <div className="text-gray-500 mb-1">Assignees:</div>
                <div className="flex flex-wrap gap-1">
                  {assigneeNames.map((name: string, index: number) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                      <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-[8px] font-bold text-black">
                        {name.charAt(0)}
                      </div>
                      <span className="font-medium text-[11px] text-black">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reporterNames.length > 0 && (
              <div>
                <div className="text-gray-500 mb-1">Reporters:</div>
                <div className="flex flex-wrap gap-1">
                  {reporterNames.map((name: string, index: number) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                      <User size={10} className="text-gray-400" />
                      <span className="font-medium text-[11px] text-black">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Task Progress</span>
            <span className="text-xs font-bold text-black">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' :
                progress >= 50 ? 'bg-blue-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Subtasks (if expanded) */}
      {isExpanded && task.subtasks && task.subtasks.length > 0 && (
        <div className="p-4 pt-0">
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h5 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
              <ListTree size={16} />
              Subtasks ({task.subtasks.length})
            </h5>
            
            <div className="space-y-3">
              {task.subtasks.map((subtask: Subtask) => (
                <div key={subtask._id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {getSubtaskStatusIcon(subtask.status)}
                        <span className="font-medium text-black">{subtask.title}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-purple-50 border border-purple-200">
                        <ListTree size={8} className="text-purple-600" />
                        <span className="text-black">Subtask</span>
                      </div>
                      <div className={`px-2 py-0.5 text-xs font-bold rounded-full ${getSubtaskStatusColor(subtask.status)}`}>
                        <span className="text-black">{subtask.status}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-black">{subtask.progressPercentage}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-gray-400" />
                      <span className="text-black">{subtask.assigneeName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays size={12} className="text-gray-400" />
                      <span className="text-black">Updated: {formatDate(subtask.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {/* Subtask Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full ${
                        subtask.status === 'Done' ? 'bg-green-500' :
                        subtask.status === 'In Progress' ? 'bg-blue-500' :
                        subtask.status === 'Blocked' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(subtask.progressPercentage || 0, 100)}%` }}
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

export default function ProjectViewPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [assigneeFilters, setAssigneeFilters] = useState<AssigneeFilter[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  // Report states
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    type: 'allTime'
  });
  const [reportIncludeSubtasks, setReportIncludeSubtasks] = useState(true);
  const [reportExporting, setReportExporting] = useState(false);
  const [reportExportingPDF, setReportExportingPDF] = useState(false);
  const [reportAssigneeFilters, setReportAssigneeFilters] = useState<AssigneeFilter[]>([]);
  const [reportAssigneeSearch, setReportAssigneeSearch] = useState("");
  const [reportProjectFilter, setReportProjectFilter] = useState<string>("all");
  const [reportIncludeEpicTasks, setReportIncludeEpicTasks] = useState(true);
  const [reportType, setReportType] = useState<'excel' | 'pdf'>('excel');

  // Progress statistics
  const [projectStats, setProjectStats] = useState({
    totalProjects: 0,
    totalEpics: 0,
    totalTasks: 0,
    totalSubtasks: 0,
    overallProgress: 0,
  });

  // Initialize assignee filters
  useEffect(() => {
    if (employees.length > 0) {
      const assigneeList = employees.map(emp => ({
        id: emp._id,
        name: emp.name,
        selected: false
      }));
      setAssigneeFilters(assigneeList);
      setReportAssigneeFilters(assigneeList);
    }
  }, [employees]);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch employees first
      const employeesRes = await fetch('/api/employees');
      const employeesData = await employeesRes.json();
      const employeesList = Array.isArray(employeesData) ? employeesData : 
                          employeesData.data || employeesData.employees || [];
      setEmployees(employeesList);

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
        subtasks: (task.subtasks || []).map((subtask: any) => ({
          ...subtask,
          status: subtask.status || "Todo",
          progressPercentage: subtask.progressPercentage || 0
        })),
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

      const totalSubtasks = transformedTasks.reduce((acc: number, task: TaskWithSubtasks) => {
        return acc + (task.subtasks?.length || 0);
      }, 0);
      setProjectStats(prev => ({ ...prev, totalSubtasks }));

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

  // Get assignee names for a task
  const getAssigneeNames = (task: TaskWithSubtasks) => {
    if (task.assigneeNames && task.assigneeNames.length > 0) {
      return task.assigneeNames;
    }
    return employees
      .filter(emp => task.assigneeIds?.includes(emp._id))
      .map(emp => emp.name);
  };

  // Get assignee IDs for a task
  const getAssigneeIds = (task: TaskWithSubtasks) => {
    if (task.assigneeIds && task.assigneeIds.length > 0) {
      return task.assigneeIds;
    }
    return employees
      .filter(emp => getAssigneeNames(task).includes(emp.name))
      .map(emp => emp._id);
  };

  // Get reporter names for a task
  const getReporterNames = (task: TaskWithSubtasks) => {
    if (task.reporterNames && task.reporterNames.length > 0) {
      return task.reporterNames;
    }
    return employees
      .filter(emp => task.reporterIds?.includes(emp._id))
      .map(emp => emp.name);
  };

  // Get filtered tasks based on current filters
  const getFilteredTasks = useMemo(() => {
    const taskList = selectedEpic ? getEpicTasks : getProjectTasks;
    
    return taskList.filter(task => {
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
      
      // Filter by assignee
      let matchesAssignee = true;
      if (assigneeFilter) {
        const assigneeIds = getAssigneeIds(task);
        matchesAssignee = assigneeIds.includes(assigneeFilter);
      }
      
      return matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [selectedEpic, getEpicTasks, getProjectTasks, statusFilter, priorityFilter, assigneeFilter]);

  // Get all tasks for report (across all projects if not selected)
  const getReportTasks = useMemo(() => {
    let allTasks = tasks;
    
    // Filter by project
    if (reportProjectFilter !== "all" && reportProjectFilter !== "") {
      allTasks = allTasks.filter(task => task.projectId === reportProjectFilter);
    }
    
    // Filter by date range
    if (reportDateRange.startDate && reportDateRange.endDate && reportDateRange.type !== 'allTime') {
      const start = new Date(reportDateRange.startDate);
      const end = new Date(reportDateRange.endDate);
      end.setHours(23, 59, 59, 999);
      
      allTasks = allTasks.filter(task => {
        const taskDate = new Date(task.updatedAt || task.createdAt);
        return taskDate >= start && taskDate <= end;
      });
    }
    
    // Filter by assignees
    const selectedAssignees = reportAssigneeFilters.filter(a => a.selected);
    if (selectedAssignees.length > 0) {
      allTasks = allTasks.filter(task => {
        const taskAssigneeIds = getAssigneeIds(task);
        return selectedAssignees.some(assignee => 
          taskAssigneeIds.includes(assignee.id)
        );
      });
    }
    
    return allTasks;
  }, [tasks, reportDateRange, reportAssigneeFilters, reportProjectFilter]);

  // Calculate task progress
  const calculateTaskProgress = (task: TaskWithSubtasks) => {
    // If task has subtasks, calculate based on subtask progress
    if (task.subtasks && task.subtasks.length > 0) {
      const totalSubtasks = task.subtasks.length;
      const doneSubtasks = task.subtasks.filter(s => s.status === "Done").length;
      const inProgressSubtasks = task.subtasks.filter(s => s.status === "In Progress").length;
      const blockedSubtasks = task.subtasks.filter(s => s.status === "Blocked").length;
      
      // If all subtasks are Done, return 100%
      if (doneSubtasks === totalSubtasks) {
        return 100;
      }
      
      // Calculate weighted progress
      let totalProgress = 0;
      task.subtasks.forEach(subtask => {
        let subtaskWeight = subtask.progressPercentage || 0;
        
        // Adjust weight based on status
        if (subtask.status === "Done") {
          subtaskWeight = 100;
        } else if (subtask.status === "In Progress") {
          subtaskWeight = Math.max(50, subtask.progressPercentage || 50);
        } else if (subtask.status === "Blocked") {
          subtaskWeight = Math.min(10, subtask.progressPercentage || 0);
        } else if (subtask.status === "Todo") {
          subtaskWeight = Math.min(15, subtask.progressPercentage || 0);
        }
        totalProgress += subtaskWeight;
      });
      
      const averageProgress = Math.round(totalProgress / totalSubtasks);
      return Math.min(100, averageProgress);
    }
    
    // If no subtasks, calculate based on task status
    switch (task.status) {
      case "Done": 
        return 100;
      case "In Progress": 
        return 65;
      case "Review": 
        return 85;
      case "Todo": 
        return 15;
      case "Backlog": 
        return 5;
      case "Blocked": 
        return 10;
      default: 
        return 0;
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

  // Handle date range preset selection
  const handleDateRangePreset = (type: DateRangeType) => {
    const today = new Date();
    let startDate: Date | null = null; 
    let endDate: Date | null = null;  

    switch (type) {
      case 'thisWeek':
        const firstDayOfWeek = today.getDate() - today.getDay();
        startDate = new Date(today.setDate(firstDayOfWeek));
        endDate = new Date(today.setDate(firstDayOfWeek + 6));
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor((today.getMonth() - 3) / 3);
        startDate = new Date(today.getFullYear(), lastQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'allTime':
        startDate = null;
        endDate = null;
        break;
      case 'custom':
        return;
    }

    setReportDateRange({
      startDate,
      endDate,
      type
    });
  };

  // Toggle report assignee selection
  const toggleReportAssigneeSelection = (id: string) => {
    setReportAssigneeFilters(prev => 
      prev.map(assignee => 
        assignee.id === id 
          ? { ...assignee, selected: !assignee.selected } 
          : assignee
      )
    );
  };

  // Select/Deselect all report assignees
  const toggleAllReportAssignees = (selectAll: boolean) => {
    setReportAssigneeFilters(prev => 
      prev.map(assignee => ({ ...assignee, selected: selectAll }))
    );
  };

  // Filtered report assignees based on search
  const filteredReportAssignees = useMemo(() => {
    return reportAssigneeFilters.filter(assignee =>
      assignee.name.toLowerCase().includes(reportAssigneeSearch.toLowerCase())
    );
  }, [reportAssigneeFilters, reportAssigneeSearch]);

  // Generate report data for Excel export
  const generateReportData = () => {
    const reportTasks = getReportTasks;
    
    // Main tasks data with "Main Task" indicator
    const tasksData = reportTasks.map(task => {
      const project = projects.find(p => p._id === task.projectId);
      const epic = epics.find(e => e._id === task.epicId);
      const taskProgress = calculateTaskProgress(task);
      
      return {
        'Task Type': 'Main Task',
        'Issue Key': task.issueKey,
        'Issue Type': task.issueType,
        'Summary': task.summary,
        'Description': task.description || '',
        'Status': task.status,
        'Priority': task.priority,
        'Story Points': task.storyPoints,
        'Progress %': taskProgress,
        'Assignees': getAssigneeNames(task).join(', '),
        'Assignee IDs': getAssigneeIds(task).join(', '),
        'Reporters': getReporterNames(task).join(', '),
        'Project': project?.name || task.projectName || 'Unknown',
        'Project Key': project?.key || 'N/A',
        'Epic': epic?.name || task.epicName || 'No Epic',
        'Epic ID': epic?.epicId || 'N/A',
        'Created Date': formatDateForExcel(task.createdAt),
        'Updated Date': formatDateForExcel(task.updatedAt),
        'Due Date': task.dueDate ? formatDateForExcel(task.dueDate) : '',
        'Subtask Count': task.subtasks?.length || 0,
        'Completion Status': taskProgress === 100 ? 'Complete' : taskProgress >= 50 ? 'In Progress' : 'Not Started',
        'Is Blocked': task.status === 'Blocked' ? 'Yes' : 'No',
        'Health Status': getTaskHealthStatus(task.status, taskProgress)
      };
    });

    // Subtasks data with "Subtask" indicator
    const subtasksData: any[] = [];
    
    if (reportIncludeSubtasks) {
      reportTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            const project = projects.find(p => p._id === task.projectId);
            const epic = epics.find(e => e._id === task.epicId);
            
            subtasksData.push({
              'Task Type': 'Subtask',
              'Parent Issue Key': task.issueKey,
              'Parent Task Summary': task.summary,
              'Parent Status': task.status,
              'Parent Progress': calculateTaskProgress(task),
              'Subtask ID': subtask._id.substring(0, 8),
              'Subtask Title': subtask.title,
              'Assignee': subtask.assigneeName,
              'Assignee ID': subtask.assigneeId,
              'Status': subtask.status,
              'Progress %': subtask.progressPercentage,
              'Created Date': formatDateForExcel(subtask.createdAt),
              'Updated Date': formatDateForExcel(subtask.updatedAt),
              'Is Blocked': subtask.status === 'Blocked' ? 'Yes' : 'No',
              'Project': project?.name || 'Unknown',
              'Project Key': project?.key || 'N/A',
              'Epic': epic?.name || 'No Epic',
              'Health Status': getSubtaskHealthStatus(subtask.status, subtask.progressPercentage)
            });
          });
        }
      });
    }

    // Combined tasks and subtasks for comprehensive view
    const combinedTaskData: any[] = [];
    
    // Add main tasks
    reportTasks.forEach(task => {
      const project = projects.find(p => p._id === task.projectId);
      const epic = epics.find(e => e._id === task.epicId);
      const taskProgress = calculateTaskProgress(task);
      
      combinedTaskData.push({
        'Task Type': 'Main Task',
        'Task/Subtask ID': task.issueKey,
        'Title': task.summary,
        'Description': task.description || '',
        'Status': task.status,
        'Priority': task.priority,
        'Progress %': taskProgress,
        'Story Points': task.storyPoints,
        'Assignees': getAssigneeNames(task).join(', '),
        'Reporters': getReporterNames(task).join(', '),
        'Project': project?.name || 'Unknown',
        'Project Key': project?.key || 'N/A',
        'Epic': epic?.name || 'No Epic',
        'Epic ID': epic?.epicId || 'N/A',
        'Created Date': formatDateForExcel(task.createdAt),
        'Updated Date': formatDateForExcel(task.updatedAt),
        'Due Date': task.dueDate ? formatDateForExcel(task.dueDate) : '',
        'Has Subtasks': task.subtasks && task.subtasks.length > 0 ? 'Yes' : 'No',
        'Completion Status': taskProgress === 100 ? 'Complete' : taskProgress >= 50 ? 'In Progress' : 'Not Started',
        'Is Blocked': task.status === 'Blocked' ? 'Yes' : 'No',
        'Health Status': getTaskHealthStatus(task.status, taskProgress)
      });
    });
    
    // Add subtasks if included
    if (reportIncludeSubtasks) {
      reportTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            const project = projects.find(p => p._id === task.projectId);
            const epic = epics.find(e => e._id === task.epicId);
            
            combinedTaskData.push({
              'Task Type': 'Subtask',
              'Task/Subtask ID': `SUB-${subtask._id.substring(0, 8)}`,
              'Parent Task ID': task.issueKey,
              'Title': subtask.title,
              'Description': `Subtask of: ${task.summary}`,
              'Status': subtask.status,
              'Priority': task.priority, // Inherit from parent
              'Progress %': subtask.progressPercentage,
              'Story Points': 0, // Subtasks typically don't have story points
              'Assignees': subtask.assigneeName,
              'Reporters': getReporterNames(task).join(', '),
              'Project': project?.name || 'Unknown',
              'Project Key': project?.key || 'N/A',
              'Epic': epic?.name || 'No Epic',
              'Epic ID': epic?.epicId || 'N/A',
              'Created Date': formatDateForExcel(subtask.createdAt),
              'Updated Date': formatDateForExcel(subtask.updatedAt),
              'Due Date': '', // Subtasks typically don't have due dates
              'Has Subtasks': 'No',
              'Completion Status': subtask.status === 'Done' ? 'Complete' : 
                                  subtask.status === 'In Progress' ? 'In Progress' : 'Not Started',
              'Is Blocked': subtask.status === 'Blocked' ? 'Yes' : 'No',
              'Health Status': getSubtaskHealthStatus(subtask.status, subtask.progressPercentage)
            });
          });
        }
      });
    }

    // Assignee summary data
    const assigneeSummaryData: any[] = [];
    const selectedAssigneeIds = reportAssigneeFilters
      .filter(a => a.selected)
      .map(a => a.id);

    if (selectedAssigneeIds.length > 0) {
      selectedAssigneeIds.forEach(assigneeId => {
        const assignee = employees.find(e => e._id === assigneeId);
        if (!assignee) return;

        const assigneeTasks = reportTasks.filter(task => 
          getAssigneeIds(task).includes(assigneeId)
        );
        const assigneeSubtasks = reportIncludeSubtasks 
          ? reportTasks.flatMap(task => 
              task.subtasks?.filter(s => s.assigneeId === assigneeId) || []
            )
          : [];

        const completedTasks = assigneeTasks.filter(t => t.status === "Done").length;
        const inProgressTasks = assigneeTasks.filter(t => t.status === "In Progress").length;
        const blockedTasks = assigneeTasks.filter(t => t.status === "Blocked").length;
        const totalStoryPoints = assigneeTasks.reduce((sum, t) => sum + t.storyPoints, 0);
        const averageProgress = assigneeTasks.length > 0
          ? Math.round(assigneeTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / assigneeTasks.length)
          : 0;

        assigneeSummaryData.push({
          'Assignee Name': assignee.name,
          'Assignee Email': assignee.email || '',
          'Main Tasks Assigned': assigneeTasks.length,
          'Subtasks Assigned': assigneeSubtasks.length,
          'Total Tasks': assigneeTasks.length + assigneeSubtasks.length,
          'Completed Main Tasks': completedTasks,
          'Completed Subtasks': assigneeSubtasks.filter(s => s.status === "Done").length,
          'In Progress Main Tasks': inProgressTasks,
          'Blocked Main Tasks': blockedTasks,
          'Blocked Subtasks': assigneeSubtasks.filter(s => s.status === "Blocked").length,
          'Main Task Completion Rate': assigneeTasks.length > 0 
            ? Math.round((completedTasks / assigneeTasks.length) * 100) + '%'
            : '0%',
          'Subtask Completion Rate': assigneeSubtasks.length > 0
            ? Math.round((assigneeSubtasks.filter(s => s.status === "Done").length / assigneeSubtasks.length) * 100) + '%'
            : 'N/A',
          'Total Story Points': totalStoryPoints,
          'Average Main Task Progress': averageProgress + '%',
          'Average Subtask Progress': assigneeSubtasks.length > 0
            ? Math.round(assigneeSubtasks.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / assigneeSubtasks.length) + '%'
            : 'N/A',
          'Efficiency Score': calculateEfficiencyScore(assigneeTasks, assigneeSubtasks) + '/10'
        });
      });
    }

    // Project summary data
    const projectSummaryData: any[] = [];
    const projectTasksMap = new Map<string, TaskWithSubtasks[]>();
    
    reportTasks.forEach(task => {
      const projectId = task.projectId;
      if (!projectTasksMap.has(projectId)) {
        projectTasksMap.set(projectId, []);
      }
      projectTasksMap.get(projectId)?.push(task);
    });

    projectTasksMap.forEach((projectTasks, projectId) => {
      const project = projects.find(p => p._id === projectId);
      if (!project) return;

      const completedTasks = projectTasks.filter(t => t.status === "Done").length;
      const inProgressTasks = projectTasks.filter(t => t.status === "In Progress").length;
      const blockedTasks = projectTasks.filter(t => t.status === "Blocked").length;
      const totalStoryPoints = projectTasks.reduce((sum, t) => sum + t.storyPoints, 0);
      const averageProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / projectTasks.length)
        : 0;

      // Count subtasks
      let totalSubtasks = 0;
      let completedSubtasks = 0;
      let blockedSubtasks = 0;
      
      if (reportIncludeSubtasks) {
        projectTasks.forEach(task => {
          if (task.subtasks) {
            totalSubtasks += task.subtasks.length;
            completedSubtasks += task.subtasks.filter(s => s.status === "Done").length;
            blockedSubtasks += task.subtasks.filter(s => s.status === "Blocked").length;
          }
        });
      }

      projectSummaryData.push({
        'Project Name': project.name,
        'Project Key': project.key,
        'Total Main Tasks': projectTasks.length,
        'Total Subtasks': totalSubtasks,
        'Combined Total': projectTasks.length + totalSubtasks,
        'Completed Main Tasks': completedTasks,
        'Completed Subtasks': completedSubtasks,
        'In Progress Main Tasks': inProgressTasks,
        'Blocked Main Tasks': blockedTasks,
        'Blocked Subtasks': blockedSubtasks,
        'Main Task Completion Rate': projectTasks.length > 0 
          ? Math.round((completedTasks / projectTasks.length) * 100) + '%'
          : '0%',
        'Subtask Completion Rate': totalSubtasks > 0
          ? Math.round((completedSubtasks / totalSubtasks) * 100) + '%'
          : 'N/A',
        'Total Story Points': totalStoryPoints,
        'Average Main Task Progress': averageProgress + '%',
        'Project Start Date': formatDateForExcel(project.createdAt),
        'Description': project.description || '',
        'Health Status': averageProgress >= 80 ? 'Excellent' : 
                         averageProgress >= 60 ? 'Good' : 
                         averageProgress >= 40 ? 'Fair' : 
                         averageProgress >= 20 ? 'Poor' : 'Critical'
      });
    });

    return { 
      tasks: tasksData, 
      subtasks: subtasksData, 
      combinedTasks: combinedTaskData,
      assigneeSummary: assigneeSummaryData,
      projectSummary: projectSummaryData
    };
  };

  // Helper function to calculate efficiency score
  const calculateEfficiencyScore = (tasks: TaskWithSubtasks[], subtasks: Subtask[]) => {
    const completedTasks = tasks.filter(t => t.status === "Done").length;
    const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
    const blockedTasks = tasks.filter(t => t.status === "Blocked").length;
    
    const completedSubtasks = subtasks.filter(s => s.status === "Done").length;
    const blockedSubtasks = subtasks.filter(s => s.status === "Blocked").length;
    
    const totalTasks = tasks.length + subtasks.length;
    if (totalTasks === 0) return 0;
    
    const taskProgress = tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / tasks.length)
      : 0;
    
    const subtaskProgress = subtasks.length > 0
      ? Math.round(subtasks.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / subtasks.length)
      : 0;
    
    // Calculate score based on multiple factors
    let score = 0;
    score += (completedTasks * 1.5);
    score += (completedSubtasks * 1);
    score += (inProgressTasks * 0.8);
    score += (taskProgress / 10);
    score += (subtaskProgress / 15);
    score -= (blockedTasks * 0.5);
    score -= (blockedSubtasks * 0.3);
    
    // Normalize to 10-point scale
    const normalizedScore = Math.round((score / Math.max(1, totalTasks)) * 2);
    return Math.min(10, Math.max(0, normalizedScore));
  };

  // Helper function to get task health status
  const getTaskHealthStatus = (status: string, progress: number) => {
    if (status === 'Done') return 'Excellent';
    if (status === 'Blocked') return 'Critical';
    if (progress >= 80) return 'Good';
    if (progress >= 50) return 'Fair';
    if (progress >= 20) return 'Poor';
    return 'Critical';
  };

  // Helper function to get subtask health status
  const getSubtaskHealthStatus = (status: string, progress: number) => {
    if (status === 'Done') return 'Excellent';
    if (status === 'Blocked') return 'Critical';
    if (status === 'In Progress' && progress >= 70) return 'Good';
    if (status === 'In Progress' && progress >= 40) return 'Fair';
    if (status === 'In Progress') return 'Poor';
    if (status === 'Todo' && progress > 0) return 'Fair';
    return 'Poor';
  };

  // Format date for Excel/PDF
  const formatDateForExcel = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    setReportExporting(true);
    try {
      const { 
        tasks: tasksData, 
        subtasks: subtasksData, 
        combinedTasks: combinedTaskData,
        assigneeSummary: assigneeSummaryData, 
        projectSummary: projectSummaryData 
      } = generateReportData();
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create Combined Tasks Sheet (Main Tasks + Subtasks)
      if (combinedTaskData.length > 0) {
        const wsCombined = XLSX.utils.json_to_sheet(combinedTaskData);
        XLSX.utils.book_append_sheet(wb, wsCombined, 'All Tasks');
        
        // Auto-size columns for Combined sheet
        wsCombined['!cols'] = [
          { wch: 10 }, // Task Type
          { wch: 15 }, // Task/Subtask ID
          { wch: 12 }, // Parent Task ID
          { wch: 40 }, // Title
          { wch: 50 }, // Description
          { wch: 12 }, // Status
          { wch: 10 }, // Priority
          { wch: 12 }, // Progress %
          { wch: 12 }, // Story Points
          { wch: 25 }, // Assignees
          { wch: 25 }, // Reporters
          { wch: 25 }, // Project
          { wch: 15 }, // Project Key
          { wch: 25 }, // Epic
          { wch: 15 }, // Epic ID
          { wch: 15 }, // Created Date
          { wch: 15 }, // Updated Date
          { wch: 15 }, // Due Date
          { wch: 12 }, // Has Subtasks
          { wch: 15 }, // Completion Status
          { wch: 10 }, // Is Blocked
          { wch: 12 }  // Health Status
        ];
      }
      
      // Create Project Summary sheet
      if (projectSummaryData.length > 0) {
        const wsProjectSummary = XLSX.utils.json_to_sheet(projectSummaryData);
        XLSX.utils.book_append_sheet(wb, wsProjectSummary, 'Project Summary');
        
        // Auto-size columns for Project Summary sheet
        wsProjectSummary['!cols'] = [
          { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
          { wch: 40 }, { wch: 15 }
        ];
      }
      
      // Create Main Tasks sheet (separate)
      if (tasksData.length > 0) {
        const wsTasks = XLSX.utils.json_to_sheet(tasksData);
        XLSX.utils.book_append_sheet(wb, wsTasks, 'Main Tasks Only');
        
        // Auto-size columns for Tasks sheet
        wsTasks['!cols'] = [
          { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 40 },
          { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
          { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 25 },
          { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
          { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
          { wch: 12 }, { wch: 10 }, { wch: 12 }
        ];
      }
      
      // Create Subtasks sheet if needed
      if (reportIncludeSubtasks && subtasksData.length > 0) {
        const wsSubtasks = XLSX.utils.json_to_sheet(subtasksData);
        XLSX.utils.book_append_sheet(wb, wsSubtasks, 'Subtasks Only');
        
        // Auto-size columns for Subtasks sheet
        wsSubtasks['!cols'] = [
          { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 12 },
          { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
          { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
          { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
          { wch: 12 }
        ];
      }
      
      // Create Assignee Summary sheet if assignees selected
      if (assigneeSummaryData.length > 0) {
        const wsAssigneeSummary = XLSX.utils.json_to_sheet(assigneeSummaryData);
        XLSX.utils.book_append_sheet(wb, wsAssigneeSummary, 'Assignee Summary');
        
        // Auto-size columns for Assignee Summary sheet
        wsAssigneeSummary['!cols'] = [
          { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
      }
      
      // Generate filename
      const filename = generateFilename();
      
      // Export
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      // Close panel after export
      setShowReportPanel(false);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setReportExporting(false);
    }
  };

  // Generate PDF Report with proper alignment
  const generatePDFReport = async () => {
    setReportExportingPDF(true);
    try {
      const reportTasks = getReportTasks;
      const { 
        combinedTasks: combinedTaskData,
        assigneeSummary: assigneeSummaryData, 
        projectSummary: projectSummaryData 
      } = generateReportData();
      
      // Create new PDF document
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      
      // Helper function to add new page
      const addNewPage = () => {
        doc.addPage('landscape');
        yPos = margin;
      };
      
      // Helper function to check if we need new page
      const checkPageHeight = (additionalHeight: number) => {
        if (yPos + additionalHeight > pageHeight - margin) {
          addNewPage();
          return true;
        }
        return false;
      };
      
      // Add Report Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Project Progress Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      // Add Report Metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Report filters information
      let filtersText = 'Report Filters: ';
      const filterDetails: string[] = [];
      
      // Project filter
      if (reportProjectFilter === "all") {
        filterDetails.push(`All Projects (${projects.length})`);
      } else {
        const project = projects.find(p => p._id === reportProjectFilter);
        if (project) {
          filterDetails.push(`Project: ${project.name}`);
        }
      }
      
      // Date range filter
      if (reportDateRange.type !== 'allTime') {
        if (reportDateRange.startDate && reportDateRange.endDate) {
          filterDetails.push(`Date Range: ${formatDateForDisplay(reportDateRange.startDate.toString())} to ${formatDateForDisplay(reportDateRange.endDate.toString())}`);
        } else {
          filterDetails.push(`Date Range: ${reportDateRange.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`);
        }
      }
      
      // Assignee filter
      const selectedAssignees = reportAssigneeFilters.filter(a => a.selected);
      if (selectedAssignees.length > 0) {
        if (selectedAssignees.length <= 3) {
          filterDetails.push(`Assignees: ${selectedAssignees.map(a => a.name).join(', ')}`);
        } else {
          filterDetails.push(`Assignees: ${selectedAssignees.length} selected`);
        }
      }
      
      // Subtask filter
      if (!reportIncludeSubtasks) {
        filterDetails.push('Subtasks: Excluded');
      }
      
      filtersText += filterDetails.join(' | ');
      
      // Wrap text for filters
      const splitFilters = doc.splitTextToSize(filtersText, pageWidth - 2 * margin);
      doc.text(splitFilters, margin, yPos);
      yPos += splitFilters.length * 5 + 5;
      
      // Add generation date
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin, yPos);
      yPos += 10;
      
      // Add Statistics Summary
      checkPageHeight(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistics Summary', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Calculate statistics
      const totalTasks = reportStats.totalTasks;
      const completedTasks = reportStats.completedTasks;
      const inProgressTasks = reportStats.inProgressTasks;
      const blockedTasks = reportStats.blockedTasks;
      const averageProgress = reportStats.averageProgress;
      const totalSubtasks = reportStats.totalSubtasks;
      const completedSubtasks = reportStats.completedSubtasks;
      const blockedSubtasks = reportStats.blockedSubtasks;
      
      // Create statistics table
      const statsData = [
        ['Metric', 'Main Tasks', 'Subtasks', 'Total/Combined'],
        ['Total Items', totalTasks.toString(), totalSubtasks.toString(), (totalTasks + totalSubtasks).toString()],
        ['Completed', completedTasks.toString(), completedSubtasks.toString(), (completedTasks + completedSubtasks).toString()],
        ['In Progress', inProgressTasks.toString(), reportStats.inProgressSubtasks.toString(), (inProgressTasks + reportStats.inProgressSubtasks).toString()],
        ['Blocked', blockedTasks.toString(), blockedSubtasks.toString(), (blockedTasks + blockedSubtasks).toString()],
        ['Completion Rate', `${reportStats.completionRate}%`, totalSubtasks > 0 ? `${Math.round((completedSubtasks / totalSubtasks) * 100)}%` : 'N/A', 'N/A'],
        ['Average Progress', `${averageProgress}%`, totalSubtasks > 0 ? `${Math.round(reportStats.inProgressSubtasks > 0 ? 65 : 0)}%` : 'N/A', 'N/A'],
        ['Total Story Points', reportStats.totalStoryPoints.toString(), 'N/A', reportStats.totalStoryPoints.toString()]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [statsData[0]],
        body: statsData.slice(1),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [63, 168, 125], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 60 },
          3: { cellWidth: 70 }
        }
      });
      
      // Update yPos safely
      const autoTableApi = doc as any;
      if (autoTableApi.lastAutoTable && autoTableApi.lastAutoTable.finalY) {
        yPos = autoTableApi.lastAutoTable.finalY + 10;
      } else {
        yPos += 50; // Default fallback
      }
      
      // Add Project Summary
      if (projectSummaryData.length > 0) {
        checkPageHeight(50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Summary', margin, yPos);
        yPos += 10;
        
        // Prepare project summary data for table
        const projectTableData = projectSummaryData.map(project => [
          project['Project Name'],
          project['Project Key'],
          project['Total Main Tasks'],
          project['Total Subtasks'],
          project['Completed Main Tasks'],
          project['Blocked Main Tasks'],
          project['Average Main Task Progress']
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Project', 'Key', 'Main Tasks', 'Subtasks', 'Completed', 'Blocked', 'Progress']],
          body: projectTableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 30 }
          },
          didDrawPage: function (data: any) {
            // Add null check for cursor
            if (data.cursor && data.cursor.y) {
              yPos = data.cursor.y + 10;
            }
          }
        });
        
        // Update yPos safely
        if (autoTableApi.lastAutoTable && autoTableApi.lastAutoTable.finalY) {
          yPos = autoTableApi.lastAutoTable.finalY + 10;
        } else {
          yPos += 50; // Default fallback
        }
      }
      
      // Add Assignee Summary
      if (assigneeSummaryData.length > 0) {
        checkPageHeight(50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Assignee Performance', margin, yPos);
        yPos += 10;
        
        // Prepare assignee data for table
        const assigneeTableData = assigneeSummaryData.map(assignee => [
          assignee['Assignee Name'],
          assignee['Main Tasks Assigned'],
          assignee['Subtasks Assigned'],
          assignee['Completed Main Tasks'],
          assignee['Blocked Main Tasks'],
          assignee['Average Main Task Progress'],
          assignee['Efficiency Score']
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Assignee', 'Main Tasks', 'Subtasks', 'Completed', 'Blocked', 'Progress', 'Efficiency']],
          body: assigneeTableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [155, 89, 182], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 25 }
          }
        });
        
        // Update yPos safely
        if (autoTableApi.lastAutoTable && autoTableApi.lastAutoTable.finalY) {
          yPos = autoTableApi.lastAutoTable.finalY + 10;
        } else {
          yPos += 50; // Default fallback
        }
      }
      
      // Add Tasks and Subtasks Details
      if (combinedTaskData.length > 0) {
        checkPageHeight(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Tasks and Subtasks Details', margin, yPos);
        yPos += 10;
        
        // Group tasks by type for better organization
        const mainTasks = combinedTaskData.filter(item => item['Task Type'] === 'Main Task');
        const subtasks = combinedTaskData.filter(item => item['Task Type'] === 'Subtask');
        
        // Add Main Tasks section
        if (mainTasks.length > 0) {
          checkPageHeight(20);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Main Tasks', margin, yPos);
          yPos += 7;
          
          // Prepare main tasks data for table (simplified for PDF)
          const mainTasksTableData = mainTasks.map(task => [
            task['Task/Subtask ID'],
            task['Title'].substring(0, 40) + (task['Title'].length > 40 ? '...' : ''),
            task['Status'],
            task['Priority'],
            task['Progress %'] + '%',
            task['Assignees'],
            task['Project']
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['ID', 'Title', 'Status', 'Priority', 'Progress', 'Assignees', 'Project']],
            body: mainTasksTableData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
              0: { cellWidth: 25 },
              1: { cellWidth: 50 },
              2: { cellWidth: 20 },
              3: { cellWidth: 20 },
              4: { cellWidth: 20 },
              5: { cellWidth: 35 },
              6: { cellWidth: 30 }
            },
            pageBreak: 'auto',
            didDrawPage: function (data: any) {
              // Add null check for cursor
              if (data.cursor && data.cursor.y) {
                yPos = data.cursor.y + 10;
              }
            }
          });
          
          // Update yPos safely
          if (autoTableApi.lastAutoTable && autoTableApi.lastAutoTable.finalY) {
            yPos = autoTableApi.lastAutoTable.finalY + 10;
          } else {
            yPos += 50; // Default fallback
          }
        }
        
        // Add Subtasks section if included
        if (reportIncludeSubtasks && subtasks.length > 0) {
          checkPageHeight(20);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Subtasks', margin, yPos);
          yPos += 7;
          
          // Prepare subtasks data for table (simplified for PDF)
          const subtasksTableData = subtasks.map(subtask => [
            subtask['Parent Task ID'],
            subtask['Title'].substring(0, 40) + (subtask['Title'].length > 40 ? '...' : ''),
            subtask['Status'],
            subtask['Progress %'] + '%',
            subtask['Assignees'],
            subtask['Project']
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['Parent Task', 'Title', 'Status', 'Progress', 'Assignee', 'Project']],
            body: subtasksTableData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [155, 89, 182], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
              0: { cellWidth: 30 },
              1: { cellWidth: 50 },
              2: { cellWidth: 25 },
              3: { cellWidth: 20 },
              4: { cellWidth: 30 },
              5: { cellWidth: 30 }
            }
          });
        }
      }
      
      // Add footer with page numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10);
        doc.text('Project Management System Report', margin, pageHeight - 10);
      }
      
      // Generate filename and save
      const filename = generateFilename();
      doc.save(`${filename}.pdf`);
      
      // Close panel after export
      setShowReportPanel(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setReportExportingPDF(false);
    }
  };

  // Generate filename based on filters
  const generateFilename = () => {
    const selectedProjectsCount = reportProjectFilter === "all" ? projects.length : 1;
    const selectedAssignees = reportAssigneeFilters.filter(a => a.selected);
    
    let filename = 'project_report';
    
    if (reportProjectFilter !== "all" && reportProjectFilter !== "") {
      const project = projects.find(p => p._id === reportProjectFilter);
      if (project) {
        filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report`;
      }
    } else if (selectedProjectsCount === 1 && projects.length > 0) {
      filename = `${projects[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report`;
    } else {
      filename = `${selectedProjectsCount}_projects_report`;
    }
    
    // Add assignee info to filename if selected
    if (selectedAssignees.length > 0) {
      if (selectedAssignees.length <= 3) {
        filename += `_${selectedAssignees.map(a => a.name.split(' ')[0]).join('_')}`;
      } else {
        filename += `_${selectedAssignees.length}_assignees`;
      }
    }
    
    // Add task type info
    if (reportIncludeSubtasks) {
      filename += '_with_subtasks';
    } else {
      filename += '_main_tasks_only';
    }
    
    // Add date range to filename
    if (reportDateRange.type !== 'allTime') {
      const dateRange = reportDateRange.type === 'custom' 
        ? `${formatDateForExcel(reportDateRange.startDate?.toString() || '')}_to_${formatDateForExcel(reportDateRange.endDate?.toString() || '')}`
        : reportDateRange.type;
      filename += `_${dateRange}`;
    } else {
      filename += '_all_time';
    }
    
    filename += `_${new Date().toISOString().split('T')[0]}`;
    
    return filename;
  };

  // Handle export based on report type
  const handleExport = async () => {
    if (reportType === 'excel') {
      await exportToExcel();
    } else {
      await generatePDFReport();
    }
  };

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

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 border border-green-200";
      case "In Progress": return "bg-blue-100 border border-blue-200";
      case "Review": return "bg-purple-100 border border-purple-200";
      case "Todo": return "bg-yellow-100 border border-yellow-200";
      case "Backlog": return "bg-gray-100 border border-gray-200";
      case "Blocked": return "bg-red-100 border border-red-200";
      default: return "bg-gray-100 border border-gray-200";
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "Highest": return "bg-red-100 border border-red-200";
      case "High": return "bg-orange-100 border border-orange-200";
      case "Medium": return "bg-yellow-100 border border-yellow-200";
      case "Low": return "bg-green-100 border border-green-200";
      case "Lowest": return "bg-blue-100 border border-blue-200";
      default: return "bg-gray-100 border border-gray-200";
    }
  };

  // Get subtask status color
  const getSubtaskStatusColor = (status: string) => {
    switch(status) {
      case "Done": return "bg-green-100 border border-green-200";
      case "In Progress": return "bg-blue-100 border border-blue-200";
      case "Blocked": return "bg-red-100 border border-red-200";
      case "Todo": return "bg-yellow-100 border border-yellow-200";
      default: return "bg-gray-100 border border-gray-200";
    }
  };

  // Get issue type color
  const getIssueTypeColor = (issueType: string) => {
    switch(issueType) {
      case "Story": return "bg-blue-100 border border-blue-200";
      case "Task": return "bg-green-100 border border-green-200";
      case "Bug": return "bg-red-100 border border-red-200";
      default: return "bg-gray-100 border border-gray-200";
    }
  };

  // Get issue type icon
  const getIssueTypeIcon = (issueType: string) => {
    switch(issueType) {
      case "Story": return <BookOpen size={12} className="text-blue-600" />;
      case "Task": return <ClipboardCheck size={12} className="text-green-600" />;
      case "Bug": return <Bug size={12} className="text-red-600" />;
      default: return <ClipboardCheck size={12} className="text-gray-600" />;
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

  // Filtered projects based on search
  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      project.key.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  // Report statistics
  const reportStats = useMemo(() => {
    const reportTasks = getReportTasks;
    const totalTasks = reportTasks.length;
    const completedTasks = reportTasks.filter(task => task.status === "Done").length;
    const inProgressTasks = reportTasks.filter(task => task.status === "In Progress").length;
    const blockedTasks = reportTasks.filter(task => task.status === "Blocked").length;
    const totalStoryPoints = reportTasks.reduce((sum, task) => sum + task.storyPoints, 0);
    const averageProgress = reportTasks.length > 0 
      ? Math.round(reportTasks.reduce((sum, task) => sum + calculateTaskProgress(task), 0) / reportTasks.length)
      : 0;
    
    // Count subtasks
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let inProgressSubtasks = 0;
    let blockedSubtasks = 0;
    let todoSubtasks = 0;
    
    if (reportIncludeSubtasks) {
      reportTasks.forEach(task => {
        if (task.subtasks) {
          totalSubtasks += task.subtasks.length;
          completedSubtasks += task.subtasks.filter(s => s.status === "Done").length;
          inProgressSubtasks += task.subtasks.filter(s => s.status === "In Progress").length;
          blockedSubtasks += task.subtasks.filter(s => s.status === "Blocked").length;
          todoSubtasks += task.subtasks.filter(s => s.status === "Todo").length;
        }
      });
    }

    // Assignee statistics
    const selectedAssignees = reportAssigneeFilters.filter(a => a.selected);
    const assigneeStats = selectedAssignees.map(assignee => {
      const assigneeTasks = reportTasks.filter(task => 
        getAssigneeIds(task).includes(assignee.id)
      );
      const assigneeSubtasks = reportIncludeSubtasks 
        ? reportTasks.flatMap(task => 
            task.subtasks?.filter(s => s.assigneeId === assignee.id) || []
          )
        : [];
      
      const assigneeProgress = assigneeTasks.length > 0
        ? Math.round(assigneeTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / assigneeTasks.length)
        : 0;
        
      const subtaskProgress = assigneeSubtasks.length > 0
        ? Math.round(assigneeSubtasks.reduce((sum, s) => sum + (s.progressPercentage || 0), 0) / assigneeSubtasks.length)
        : 0;
        
      return {
        name: assignee.name,
        mainTaskCount: assigneeTasks.length,
        subtaskCount: assigneeSubtasks.length,
        completedMainTasks: assigneeTasks.filter(t => t.status === "Done").length,
        completedSubtasks: assigneeSubtasks.filter(s => s.status === "Done").length,
        blockedMainTasks: assigneeTasks.filter(t => t.status === "Blocked").length,
        blockedSubtasks: assigneeSubtasks.filter(s => s.status === "Blocked").length,
        mainTaskProgress: assigneeProgress,
        subtaskProgress: subtaskProgress
      };
    });

    // Project statistics
    const projectTasksMap = new Map<string, TaskWithSubtasks[]>();
    reportTasks.forEach(task => {
      const projectId = task.projectId;
      if (!projectTasksMap.has(projectId)) {
        projectTasksMap.set(projectId, []);
      }
      projectTasksMap.get(projectId)?.push(task);
    });

    const projectStats = Array.from(projectTasksMap.entries()).map(([projectId, projectTasks]) => {
      const project = projects.find(p => p._id === projectId);
      const projectProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / projectTasks.length)
        : 0;
        
      // Count subtasks for this project
      let projectSubtasks = 0;
      let projectCompletedSubtasks = 0;
      let projectBlockedSubtasks = 0;
      
      if (reportIncludeSubtasks) {
        projectTasks.forEach(task => {
          if (task.subtasks) {
            projectSubtasks += task.subtasks.length;
            projectCompletedSubtasks += task.subtasks.filter(s => s.status === "Done").length;
            projectBlockedSubtasks += task.subtasks.filter(s => s.status === "Blocked").length;
          }
        });
      }
        
      return {
        name: project?.name || 'Unknown',
        mainTaskCount: projectTasks.length,
        subtaskCount: projectSubtasks,
        completedMainTasks: projectTasks.filter(t => t.status === "Done").length,
        completedSubtasks: projectCompletedSubtasks,
        blockedMainTasks: projectTasks.filter(t => t.status === "Blocked").length,
        blockedSubtasks: projectBlockedSubtasks,
        progress: projectProgress
      };
    });

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      averageProgress,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalStoryPoints,
      totalSubtasks,
      completedSubtasks,
      inProgressSubtasks,
      blockedSubtasks,
      todoSubtasks,
      assigneeStats,
      projectStats,
      selectedAssigneeCount: selectedAssignees.length,
      selectedProjectsCount: projectStats.length
    };
  }, [getReportTasks, reportIncludeSubtasks, reportAssigneeFilters, projects]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3fa87d] mx-auto mb-4"></div>
          <p className="text-black font-bold">Loading projects data...</p>
          <p className="text-gray-600 mt-2">Please wait while we fetch your projects</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center mt-15 justify-center p-4 bg-gray-50">
      <div className="h-[80vh] w-full max-w-[85%] flex flex-col bg-white rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black">Projects Overview</h1>
              <p className="text-gray-600 mt-1">View all projects, epics, tasks, and subtasks</p>
            </div>
            
            {/* Stats Summary */}
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-gray-100 rounded-xl">
                <div className="text-2xl font-bold text-black">{projectStats.totalProjects}</div>
                <div className="text-xs text-gray-600">Projects</div>
              </div>
              <div className="text-center px-4 py-2 bg-gray-100 rounded-xl">
                <div className="text-2xl font-bold text-black">{projectStats.totalTasks}</div>
                <div className="text-xs text-gray-600">Tasks</div>
              </div>
              <div className="text-center px-4 py-2 bg-gray-100 rounded-xl">
                <div className="text-2xl font-bold text-black">{projectStats.totalSubtasks}</div>
                <div className="text-xs text-gray-600">Subtasks</div>
              </div>
              <div className="text-center px-4 py-2 bg-[#3fa87d]/10 rounded-xl">
                <div className="text-2xl font-bold text-[#3fa87d]">{projectStats.overallProgress}%</div>
                <div className="text-xs text-[#3fa87d]">Overall Progress</div>
              </div>
              
              {/* Report Button */}
              <button
                onClick={() => setShowReportPanel(!showReportPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-[#3fa87d] text-white rounded-xl hover:bg-[#3fa87d]/90 transition-colors"
              >
                <FileSpreadsheet size={18} />
                <span className="font-bold">Generate Report</span>
              </button>
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
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#3fa87d] placeholder:text-gray-500 text-black"
              />
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#3fa87d] text-black"
              >
                <option value="" className="text-gray-500">All Status</option>
                <option value="Backlog" className="text-black">Backlog</option>
                <option value="Todo" className="text-black">Todo</option>
                <option value="In Progress" className="text-black">In Progress</option>
                <option value="Review" className="text-black">Review</option>
                <option value="Done" className="text-black">Done</option>
                <option value="Blocked" className="text-black">Blocked</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#3fa87d] text-black"
              >
                <option value="" className="text-gray-500">All Priority</option>
                <option value="Lowest" className="text-black">Lowest</option>
                <option value="Low" className="text-black">Low</option>
                <option value="Medium" className="text-black">Medium</option>
                <option value="High" className="text-black">High</option>
                <option value="Highest" className="text-black">Highest</option>
              </select>
              
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#3fa87d] min-w-[150px] text-black"
              >
                <option value="" className="text-gray-500">All Assignees</option>
                {employees.map(employee => (
                  <option key={employee._id} value={employee._id} className="text-black">
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Left Sidebar - Projects List */}
            <div className="w-80 border-r border-gray-100 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-sm font-bold text-black mb-4">Projects</h2>
                <div className="space-y-2">
                  {filteredProjects.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                      <FileText className="mx-auto text-gray-300 mb-2" size={24} />
                      <p className="text-gray-500 font-medium">No projects found</p>
                      <p className="text-gray-400 text-sm">Try a different search term</p>
                    </div>
                  ) : (
                    filteredProjects.map(project => {
                      const projectProgress = calculateProjectProgress(project);
                      return (
                        <div
                          key={project._id}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${
                            selectedProject?._id === project._id
                              ? 'bg-[#3fa87d]/10 border-2 border-[#3fa87d]'
                              : 'bg-gray-100 border-2 border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedProject(project);
                            setSelectedEpic(null);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                <FileText size={16} className="text-gray-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-black">{project.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="font-mono font-bold text-black">{project.key}</span>
                                  <span>•</span>
                                  <span className="text-black">{formatDate(project.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <ArrowUpRight size={16} className="text-gray-400" />
                          </div>
                          
                          {/* Project Progress */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Progress</span>
                              <span className="text-xs font-bold text-black">
                                {projectProgress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  projectProgress === 100 ? 'bg-green-500' :
                                  projectProgress >= 70 ? 'bg-blue-500' :
                                  projectProgress >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(projectProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Main Area - Epics, Tasks, Subtasks */}
            <div className="flex-1 overflow-y-auto">
              {/* Report Panel Overlay */}
              {showReportPanel && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6 top-0 bg-white py-2">
                      <div>
                        <h2 className="text-xl font-bold text-black">Generate Report</h2>
                        <p className="text-gray-600 mt-1">Export project data with proper alignment</p>
                      </div>
                      <button
                        onClick={() => setShowReportPanel(false)}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Report Type Selection */}
                      <div>
                        <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                          <FilePieChart size={16} />
                          Report Format
                        </h3>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="reportType"
                              value="excel"
                              checked={reportType === 'excel'}
                              onChange={(e) => setReportType(e.target.value as 'excel' | 'pdf')}
                              className="w-4 h-4"
                            />
                            <div className="p-3 border-2 border-gray-200 rounded-xl hover:border-[#3fa87d] transition-colors">
                              <FileSpreadsheet size={24} className="text-green-600 mb-2" />
                              <div className="text-black font-bold">Excel Report</div>
                              <div className="text-xs text-gray-600">Spreadsheet format with multiple sheets</div>
                            </div>
                          </label>
                          
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="reportType"
                              value="pdf"
                              checked={reportType === 'pdf'}
                              onChange={(e) => setReportType(e.target.value as 'excel' | 'pdf')}
                              className="w-4 h-4"
                            />
                            <div className="p-3 border-2 border-gray-200 rounded-xl hover:border-[#3fa87d] transition-colors">
                              <FileText size={24} className="text-red-600 mb-2" />
                              <div className="text-black font-bold">PDF Report</div>
                              <div className="text-xs text-gray-600">Formatted document with proper alignment</div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {/* Project Selection */}
                      <div>
                        <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                          <FileText size={16} />
                          Project Selection
                        </h3>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="projectFilter"
                              checked={reportProjectFilter === "all"}
                              onChange={() => setReportProjectFilter("all")}
                              className="w-4 h-4"
                            />
                            <span className="text-black">All Projects ({projects.length})</span>
                          </label>
                          
                          {projects.map(project => (
                            <label key={project._id} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="projectFilter"
                                checked={reportProjectFilter === project._id}
                                onChange={() => setReportProjectFilter(project._id)}
                                className="w-4 h-4"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <FileText size={12} className="text-gray-600" />
                                </div>
                                <div>
                                  <span className="text-black">{project.name}</span>
                                  <div className="text-xs text-gray-500">{project.key}</div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Date Range Selection */}
                      <div>
                        <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                          <CalendarIcon size={16} />
                          Date Range
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {(['allTime', 'thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter', 'thisYear', 'lastYear'] as DateRangeType[]).map((type) => (
                            <button
                              key={type}
                              onClick={() => handleDateRangePreset(type)}
                              className={`px-3 py-2 text-sm rounded-lg border ${
                                reportDateRange.type === type
                                  ? 'bg-[#3fa87d] text-white border-[#3fa87d]'
                                  : 'bg-gray-100 border-gray-200 text-black hover:bg-gray-200'
                              }`}
                            >
                              {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </button>
                          ))}
                        </div>
                        
                        {reportDateRange.type === 'custom' && (
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">From</label>
                              <input
                                type="date"
                                value={reportDateRange.startDate ? reportDateRange.startDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setReportDateRange(prev => ({
                                  ...prev,
                                  startDate: e.target.value ? new Date(e.target.value) : null,
                                  type: 'custom'
                                }))}
                                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
                              <input
                                type="date"
                                value={reportDateRange.endDate ? reportDateRange.endDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setReportDateRange(prev => ({
                                  ...prev,
                                  endDate: e.target.value ? new Date(e.target.value) : null,
                                  type: 'custom'
                                }))}
                                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Assignee Filter */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-black flex items-center gap-2">
                            <UsersIcon size={16} />
                            Filter by Assignees (Optional)
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleAllReportAssignees(true)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-black"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => toggleAllReportAssignees(false)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-black"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search assignees..."
                              value={reportAssigneeSearch}
                              onChange={(e) => setReportAssigneeSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg placeholder:text-gray-500 text-black"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                          </div>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                          {filteredReportAssignees.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No assignees found
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 p-3">
                              {filteredReportAssignees.map(assignee => (
                                <label
                                  key={assignee.id}
                                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignee.selected}
                                    onChange={() => toggleReportAssigneeSelection(assignee.id)}
                                    className="w-4 h-4 rounded border-gray-300"
                                  />
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-black">
                                      {assignee.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-black">{assignee.name}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {reportStats.selectedAssigneeCount > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-700">
                              Selected {reportStats.selectedAssigneeCount} assignee{reportStats.selectedAssigneeCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Options */}
                      <div>
                        <h3 className="text-sm font-bold text-black mb-3">Options</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={reportIncludeSubtasks}
                              onChange={(e) => setReportIncludeSubtasks(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-black">Include subtasks in report</span>
                            <span className="text-xs text-gray-500">(Will show as "Subtask" type)</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={reportIncludeEpicTasks}
                              onChange={(e) => setReportIncludeEpicTasks(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <span className="text-black">Include epic information</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Report Statistics */}
                      <div className="p-4 bg-gray-100 rounded-xl border border-gray-200">
                        <h3 className="text-sm font-bold text-black mb-3">Report Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-gray-600">Main Tasks</div>
                            <div className="text-xl font-bold text-black">{reportStats.totalTasks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Avg Main Task Progress</div>
                            <div className="text-xl font-bold text-[#3fa87d]">{reportStats.averageProgress}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Blocked Main Tasks</div>
                            <div className="text-xl font-bold text-red-600">{reportStats.blockedTasks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Total Story Points</div>
                            <div className="text-xl font-bold text-black">{reportStats.totalStoryPoints}</div>
                          </div>
                        </div>
                        
                        {reportIncludeSubtasks && reportStats.totalSubtasks > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-black mb-3">Subtasks Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-xs text-gray-600">Total Subtasks</div>
                                <div className="text-lg font-bold text-black">{reportStats.totalSubtasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">Completed Subtasks</div>
                                <div className="text-lg font-bold text-green-600">{reportStats.completedSubtasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">In Progress Subtasks</div>
                                <div className="text-lg font-bold text-blue-600">{reportStats.inProgressSubtasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">Blocked Subtasks</div>
                                <div className="text-lg font-bold text-red-600">{reportStats.blockedSubtasks}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-600">Projects</div>
                            <div className="text-lg font-bold text-black">{reportStats.projectStats.length}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Assignees</div>
                            <div className="text-lg font-bold text-black">{reportStats.selectedAssigneeCount > 0 ? reportStats.selectedAssigneeCount : 'All'}</div>
                          </div>
                        </div>
                        
                        {reportStats.projectStats.length > 0 && reportStats.projectStats.length <= 5 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-black mb-3">Projects Summary</h4>
                            <div className="space-y-2">
                              {reportStats.projectStats.map((stat, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <FileText size={12} className="text-gray-600" />
                                    </div>
                                    <span className="text-sm text-black">{stat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Main Tasks</div>
                                      <div className="text-sm font-bold text-black">{stat.mainTaskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Subtasks</div>
                                      <div className="text-sm font-bold text-purple-600">{stat.subtaskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Progress</div>
                                      <div className="text-sm font-bold text-blue-600">{stat.progress}%</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {reportStats.assigneeStats.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-black mb-3">Assignee Summary</h4>
                            <div className="space-y-2">
                              {reportStats.assigneeStats.map((stat, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-black">
                                      {stat.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-black">{stat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Main Tasks</div>
                                      <div className="text-sm font-bold text-black">{stat.mainTaskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Subtasks</div>
                                      <div className="text-sm font-bold text-purple-600">{stat.subtaskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Progress</div>
                                      <div className="text-sm font-bold text-blue-600">{stat.mainTaskProgress}%</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => setShowReportPanel(false)}
                          className="px-4 py-2 text-black hover:bg-gray-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleExport}
                          disabled={reportExporting || reportExportingPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3fa87d] text-white rounded-xl hover:bg-[#3fa87d]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reportExporting || reportExportingPDF ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>
                                {reportExporting ? 'Exporting Excel...' : 'Generating PDF...'}
                              </span>
                            </>
                          ) : (
                            <>
                              {reportType === 'excel' ? <Download size={18} /> : <FileText size={18} />}
                              <span>
                                {reportType === 'excel' ? 'Export to Excel' : 'Generate PDF Report'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-6">
                {!selectedProject ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <Target className="text-gray-300 mb-4" size={48} />
                    <p className="text-gray-400 font-bold mb-2">Select a project to view details</p>
                    <p className="text-gray-400 text-sm">Or generate a report for all projects using the button above</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Project Header */}
                    <div className="pb-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-black">{selectedProject.name}</h2>
                            <span className="px-2 py-1 bg-gray-100 text-black text-xs font-bold rounded-full">
                              {selectedProject.key}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-1">{selectedProject.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Overall Progress</div>
                          <div className="text-3xl font-bold text-[#3fa87d]">
                            {calculateProjectProgress(selectedProject)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Epics Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-black flex items-center gap-2">
                          <Target size={20} />
                          Epics ({getProjectEpics.length})
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {getProjectEpics.length === 0 ? (
                          <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                            <Target className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-500 font-medium">No epics in this project</p>
                            <p className="text-gray-400 text-sm">Tasks will be shown directly below</p>
                          </div>
                        ) : (
                          getProjectEpics.map(epic => {
                            const isExpanded = expandedEpics.has(epic._id);
                            const epicTasks = tasks.filter(task => task.epicId === epic._id);
                            const epicProgress = calculateEpicProgress(epic);
                            
                            return (
                              <div key={epic._id} className="border-2 border-gray-200 rounded-2xl">
                                {/* Epic Header */}
                                <div 
                                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => toggleEpicExpand(epic._id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isExpanded ? (
                                        <ChevronDown size={20} className="text-gray-500" />
                                      ) : (
                                        <ChevronRight size={20} className="text-gray-500" />
                                      )}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200">
                                            {epic.epicId}
                                          </span>
                                          <h4 className="font-bold text-black">{epic.name}</h4>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{epic.description}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <div className="text-xs text-gray-600">Progress</div>
                                        <div className="text-lg font-bold text-black">
                                          {epicProgress}%
                                        </div>
                                      </div>
                                      
                                      <div className="text-right">
                                        <div className="text-xs text-gray-600">Tasks</div>
                                        <div className="text-lg font-bold text-black">
                                          {epicTasks.length}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Epic Progress Bar */}
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gray-600">Epic Progress</span>
                                      <span className="text-xs font-bold text-black">{epicProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          epicProgress === 100 ? 'bg-green-500' :
                                          epicProgress >= 70 ? 'bg-blue-500' :
                                          epicProgress >= 40 ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(epicProgress, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Tasks List (if expanded) */}
                                {isExpanded && (
                                  <div className="p-4 pt-0">
                                    <div className="space-y-3 mt-3">
                                      {epicTasks.length === 0 ? (
                                        <div className="p-4 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                          <ClipboardCheck className="mx-auto text-gray-300 mb-2" size={24} />
                                          <p className="text-gray-400">No tasks in this epic</p>
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
                                            getAssigneeNames={getAssigneeNames}
                                            getReporterNames={getReporterNames}
                                            formatDate={formatDate}
                                          />
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* If no epics, show tasks directly */}
                        {getProjectEpics.length === 0 && (
                          <div className="space-y-3">
                            {getFilteredTasks.length === 0 ? (
                              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                <ClipboardCheck className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-500 font-medium">No tasks in this project</p>
                                <p className="text-gray-400 text-sm">Try changing your filters</p>
                              </div>
                            ) : (
                              getFilteredTasks.map(task => (
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
                                  getAssigneeNames={getAssigneeNames}
                                  getReporterNames={getReporterNames}
                                  formatDate={formatDate}
                                />
                              ))
                            )}
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
    </div>
  );
}