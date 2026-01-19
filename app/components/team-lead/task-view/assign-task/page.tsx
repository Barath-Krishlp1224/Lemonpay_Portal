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
  X, UserCheck, Users as UsersIcon, Filter as FilterIcon
} from "lucide-react";
import * as XLSX from "xlsx";
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
  
  return (
    <div className="border-2 border-slate-200 rounded-2xl">
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
                  {assigneeNames.map((name: string, index: number) => (
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
                  {reporterNames.map((name: string, index: number) => (
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
              {task.subtasks.map((subtask: Subtask) => (
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
  const [reportAssigneeFilters, setReportAssigneeFilters] = useState<AssigneeFilter[]>([]);
  const [reportAssigneeSearch, setReportAssigneeSearch] = useState("");
  const [reportProjectFilter, setReportProjectFilter] = useState<string>("all");
  const [reportIncludeEpicTasks, setReportIncludeEpicTasks] = useState(true);

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
    if (task.subtasks && task.subtasks.length > 0) {
      const doneSubtasks = task.subtasks.filter(s => s.status === "Done").length;
      return Math.round((doneSubtasks / task.subtasks.length) * 100);
    }
    
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

  // Handle date range preset selection
  const handleDateRangePreset = (type: DateRangeType) => {
 const today = new Date();
  let startDate: Date | null = null; 
  let endDate: Date | null = null;  

    switch (type) {
      case 'thisWeek':
        startDate = new Date(today.setDate(today.getDate() - today.getDay()));
        endDate = new Date(today.setDate(today.getDate() - today.getDay() + 6));
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
    
    // Tasks data
    const tasksData = reportTasks.map(task => {
      const project = projects.find(p => p._id === task.projectId);
      const epic = epics.find(e => e._id === task.epicId);
      
      return {
        'Issue Key': task.issueKey,
        'Issue Type': task.issueType,
        'Summary': task.summary,
        'Description': task.description || '',
        'Status': task.status,
        'Priority': task.priority,
        'Story Points': task.storyPoints,
        'Progress %': calculateTaskProgress(task),
        'Assignees': getAssigneeNames(task).join(', '),
        'Assignee IDs': getAssigneeIds(task).join(', '),
        'Reporters': getReporterNames(task).join(', '),
        'Project': project?.name || task.projectName || 'Unknown',
        'Project Key': project?.key || 'N/A',
        'Epic': epic?.name || task.epicName || 'No Epic',
        'Epic ID': epic?.epicId || 'N/A',
        'Created Date': formatDateForExcel(task.createdAt),
        'Updated Date': formatDateForExcel(task.updatedAt),
        'Due Date': task.dueDate ? formatDateForExcel(task.dueDate) : ''
      };
    });

    // Subtasks data
    const subtasksData: any[] = [];
    
    if (reportIncludeSubtasks) {
      reportTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            subtasksData.push({
              'Parent Issue Key': task.issueKey,
              'Subtask Title': subtask.title,
              'Assignee': subtask.assigneeName,
              'Assignee ID': subtask.assigneeId,
              'Status': subtask.status,
              'Progress %': subtask.progressPercentage,
              'Created Date': formatDateForExcel(subtask.createdAt),
              'Updated Date': formatDateForExcel(subtask.updatedAt)
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
        const totalStoryPoints = assigneeTasks.reduce((sum, t) => sum + t.storyPoints, 0);

        assigneeSummaryData.push({
          'Assignee Name': assignee.name,
          'Assignee Email': assignee.email || '',
          'Total Tasks Assigned': assigneeTasks.length,
          'Completed Tasks': completedTasks,
          'In Progress Tasks': inProgressTasks,
          'Completion Rate': assigneeTasks.length > 0 
            ? Math.round((completedTasks / assigneeTasks.length) * 100) + '%'
            : '0%',
          'Total Story Points': totalStoryPoints,
          'Average Progress': assigneeTasks.length > 0
            ? Math.round(assigneeTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / assigneeTasks.length) + '%'
            : '0%',
          'Subtasks Assigned': assigneeSubtasks.length,
          'Completed Subtasks': assigneeSubtasks.filter(s => s.status === "Done").length
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
      const totalStoryPoints = projectTasks.reduce((sum, t) => sum + t.storyPoints, 0);
      const averageProgress = projectTasks.length > 0
        ? Math.round(projectTasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0) / projectTasks.length)
        : 0;

      projectSummaryData.push({
        'Project Name': project.name,
        'Project Key': project.key,
        'Total Tasks': projectTasks.length,
        'Completed Tasks': completedTasks,
        'In Progress Tasks': inProgressTasks,
        'Completion Rate': projectTasks.length > 0 
          ? Math.round((completedTasks / projectTasks.length) * 100) + '%'
          : '0%',
        'Total Story Points': totalStoryPoints,
        'Average Progress': averageProgress + '%',
        'Project Start Date': formatDateForExcel(project.createdAt),
        'Description': project.description || ''
      });
    });

    return { 
      tasks: tasksData, 
      subtasks: subtasksData, 
      assigneeSummary: assigneeSummaryData,
      projectSummary: projectSummaryData
    };
  };

  // Format date for Excel
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

  // Export to Excel
  const exportToExcel = async () => {
    setReportExporting(true);
    try {
      const { tasks: tasksData, subtasks: subtasksData, assigneeSummary: assigneeSummaryData, projectSummary: projectSummaryData } = generateReportData();
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Create Project Summary sheet
      if (projectSummaryData.length > 0) {
        const wsProjectSummary = XLSX.utils.json_to_sheet(projectSummaryData);
        XLSX.utils.book_append_sheet(wb, wsProjectSummary, 'Project Summary');
        
        // Auto-size columns for Project Summary sheet
        wsProjectSummary['!cols'] = [
          { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 15 }, { wch: 40 }
        ];
      }
      
      // Create Tasks sheet
      if (tasksData.length > 0) {
        const wsTasks = XLSX.utils.json_to_sheet(tasksData);
        XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks');
        
        // Auto-size columns for Tasks sheet
        wsTasks['!cols'] = [
          { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 30 },
          { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
          { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
          { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
      }
      
      // Create Subtasks sheet if needed
      if (reportIncludeSubtasks && subtasksData.length > 0) {
        const wsSubtasks = XLSX.utils.json_to_sheet(subtasksData);
        XLSX.utils.book_append_sheet(wb, wsSubtasks, 'Subtasks');
        
        // Auto-size columns for Subtasks sheet
        wsSubtasks['!cols'] = [
          { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
          { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
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
          { wch: 15 }, { wch: 15 }
        ];
      }
      
      // Generate filename
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
      
      // Add date range to filename
      if (reportDateRange.type !== 'allTime') {
        const dateRange = reportDateRange.type === 'custom' 
          ? `${formatDateForExcel(reportDateRange.startDate?.toString() || '')}_to_${formatDateForExcel(reportDateRange.endDate?.toString() || '')}`
          : reportDateRange.type;
        filename += `_${dateRange}`;
      } else {
        filename += '_all_time';
      }
      
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Export
      XLSX.writeFile(wb, filename);
      
      // Close panel after export
      setShowReportPanel(false);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setReportExporting(false);
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

  // Get subtask status color
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
    const totalStoryPoints = reportTasks.reduce((sum, task) => sum + task.storyPoints, 0);
    
    // Count subtasks
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    if (reportIncludeSubtasks) {
      reportTasks.forEach(task => {
        if (task.subtasks) {
          totalSubtasks += task.subtasks.length;
          completedSubtasks += task.subtasks.filter(s => s.status === "Done").length;
        }
      });
    }

    // Assignee statistics
    const selectedAssignees = reportAssigneeFilters.filter(a => a.selected);
    const assigneeStats = selectedAssignees.map(assignee => {
      const assigneeTasks = reportTasks.filter(task => 
        getAssigneeIds(task).includes(assignee.id)
      );
      return {
        name: assignee.name,
        taskCount: assigneeTasks.length,
        completedCount: assigneeTasks.filter(t => t.status === "Done").length
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
      return {
        name: project?.name || 'Unknown',
        taskCount: projectTasks.length,
        completedCount: projectTasks.filter(t => t.status === "Done").length
      };
    });

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalStoryPoints,
      totalSubtasks,
      completedSubtasks,
      assigneeStats,
      projectStats,
      selectedAssigneeCount: selectedAssignees.length,
      selectedProjectsCount: projectStats.length
    };
  }, [getReportTasks, reportIncludeSubtasks, reportAssigneeFilters, projects]);

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
              
              {/* Report Button */}
              <button
                onClick={() => setShowReportPanel(!showReportPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-[#3fa87d] text-white rounded-xl hover:bg-[#3fa87d]/90 transition-colors"
              >
                <FileSpreadsheet size={18} />
                <span>Generate Report</span>
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
              
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-[#3fa87d] min-w-[150px]"
              >
                <option value="">All Assignees</option>
                {employees.map(employee => (
                  <option key={employee._id} value={employee._id}>
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
            <div className="flex-1 overflow-y-auto">
              {/* Report Panel Overlay */}
              {showReportPanel && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6 sticky top-0 bg-white py-2">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Generate Report</h2>
                        <p className="text-slate-600 mt-1">Export project data to Excel</p>
                      </div>
                      <button
                        onClick={() => setShowReportPanel(false)}
                        className="p-2 hover:bg-slate-100 rounded-xl"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Project Selection */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
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
                            <span className="text-slate-700">All Projects ({projects.length})</span>
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
                                <div className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center">
                                  <FileText size={12} className="text-slate-600" />
                                </div>
                                <div>
                                  <span className="text-slate-700">{project.name}</span>
                                  <div className="text-xs text-slate-500">{project.key}</div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Date Range Selection */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
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
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </button>
                          ))}
                        </div>
                        
                        {reportDateRange.type === 'custom' && (
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-slate-600 mb-1 block">From</label>
                              <input
                                type="date"
                                value={reportDateRange.startDate ? reportDateRange.startDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setReportDateRange(prev => ({
                                  ...prev,
                                  startDate: e.target.value ? new Date(e.target.value) : null,
                                  type: 'custom'
                                }))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-slate-600 mb-1 block">To</label>
                              <input
                                type="date"
                                value={reportDateRange.endDate ? reportDateRange.endDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setReportDateRange(prev => ({
                                  ...prev,
                                  endDate: e.target.value ? new Date(e.target.value) : null,
                                  type: 'custom'
                                }))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Assignee Filter */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <UsersIcon size={16} />
                            Filter by Assignees (Optional)
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleAllReportAssignees(true)}
                              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => toggleAllReportAssignees(false)}
                              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded"
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
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                          {filteredReportAssignees.length === 0 ? (
                            <div className="p-4 text-center text-slate-500">
                              No assignees found
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 p-3">
                              {filteredReportAssignees.map(assignee => (
                                <label
                                  key={assignee.id}
                                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignee.selected}
                                    onChange={() => toggleReportAssigneeSelection(assignee.id)}
                                    className="w-4 h-4 rounded border-slate-300"
                                  />
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                                      {assignee.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-slate-700">{assignee.name}</span>
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
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Options</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={reportIncludeSubtasks}
                              onChange={(e) => setReportIncludeSubtasks(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-slate-700">Include subtasks in report</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={reportIncludeEpicTasks}
                              onChange={(e) => setReportIncludeEpicTasks(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-slate-700">Include epic information</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Report Statistics */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Report Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-slate-500">Total Tasks</div>
                            <div className="text-xl font-bold text-slate-800">{reportStats.totalTasks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Completion Rate</div>
                            <div className="text-xl font-bold text-[#3fa87d]">{reportStats.completionRate}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">In Progress</div>
                            <div className="text-xl font-bold text-blue-600">{reportStats.inProgressTasks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Story Points</div>
                            <div className="text-xl font-bold text-slate-800">{reportStats.totalStoryPoints}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-slate-500">Projects</div>
                            <div className="text-lg font-bold text-slate-800">{reportStats.projectStats.length}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Assignees</div>
                            <div className="text-lg font-bold text-slate-800">{reportStats.selectedAssigneeCount > 0 ? reportStats.selectedAssigneeCount : 'All'}</div>
                          </div>
                        </div>
                        
                        {reportIncludeSubtasks && reportStats.totalSubtasks > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-slate-500">Total Subtasks</div>
                                <div className="text-lg font-bold text-slate-800">{reportStats.totalSubtasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Completed Subtasks</div>
                                <div className="text-lg font-bold text-green-600">{reportStats.completedSubtasks}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {reportStats.projectStats.length > 0 && reportStats.projectStats.length <= 5 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-3">Projects Summary</h4>
                            <div className="space-y-2">
                              {reportStats.projectStats.map((stat, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center">
                                      <FileText size={12} className="text-slate-600" />
                                    </div>
                                    <span className="text-sm text-slate-700">{stat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Tasks</div>
                                      <div className="text-sm font-bold text-slate-800">{stat.taskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Completed</div>
                                      <div className="text-sm font-bold text-green-600">{stat.completedCount}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {reportStats.assigneeStats.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-3">Assignee Summary</h4>
                            <div className="space-y-2">
                              {reportStats.assigneeStats.map((stat, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                                      {stat.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-slate-700">{stat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Tasks</div>
                                      <div className="text-sm font-bold text-slate-800">{stat.taskCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Completed</div>
                                      <div className="text-sm font-bold text-green-600">{stat.completedCount}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          onClick={() => setShowReportPanel(false)}
                          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={exportToExcel}
                          disabled={reportExporting}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3fa87d] text-white rounded-xl hover:bg-[#3fa87d]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reportExporting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <Download size={18} />
                              <span>Export to Excel</span>
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
                    <Target className="text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-bold mb-2">Select a project to view details</p>
                    <p className="text-slate-400 text-sm">Or generate a report for all projects using the button above</p>
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
                                    <div className="text-right">
                                      <div className="text-xs text-slate-500">Progress</div>
                                      <div className="text-lg font-bold text-slate-800">
                                        {calculateEpicProgress(epic)}%
                                      </div>
                                    </div>
                                    
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
                                getAssigneeNames={getAssigneeNames}
                                getReporterNames={getReporterNames}
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
    </div>
  );
}