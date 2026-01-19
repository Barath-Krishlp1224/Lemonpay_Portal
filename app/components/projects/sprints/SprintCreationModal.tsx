"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, Calendar, Target, Users, Clock, AlertCircle, CheckCircle2, Archive, Folder, ExternalLink, ChevronDown, ChevronUp, Check, List } from "lucide-react";
import type { Employee, SavedProject, Epic, Sprint } from "@/app/types/project";

interface SprintCreationModalProps {
  show: boolean;
  onClose: () => void;
  project: SavedProject | null;
  employees: Employee[];
  onSprintCreated: (sprint: Sprint) => void;
  existingSprints?: Sprint[];
  previousSprints?: Sprint[];
  allProjects?: SavedProject[];
}

// Define interfaces
interface BacklogTask {
  _id: string;
  summary?: string;
  title?: string;
  name?: string;
  description?: string;
  storyPoints?: number;
  status: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
  priority?: string;
  issueType?: string;
  epicId?: string;
  epicName?: string;
  projectId?: string;
  sprintId?: string;
  taskId?: string;
  project?: SavedProject;
  projectName?: string;
  isCarriedOver?: boolean;
  previousSprintId?: string;
  usedInLastSprint?: boolean;
  wasInSprint?: boolean; // New field to track if task was ever in a sprint
  lastSprintStatus?: string; // Track what status it had in last sprint
}

interface BacklogEpic {
  _id: string;
  epicId?: string;
  name?: string;
  title?: string;
  description?: string;
  storyPoints?: number;
  status: string;
  priority?: string;
  project?: SavedProject;
  projectId?: string;
  projectName?: string;
  usedInLastSprint?: boolean;
}

// Helper function to generate unique sprint name
const generateUniqueSprintName = (projectKey: string, existingSprints: Sprint[]): string => {
  if (!projectKey || !existingSprints) return "Sprint 1";
  
  const usedNumbers = new Set<number>();
  
  existingSprints.forEach(sprint => {
    if (sprint.name && sprint.name.startsWith(`${projectKey} Sprint `)) {
      const match = sprint.name.match(/Sprint (\d+)$/);
      if (match) {
        usedNumbers.add(parseInt(match[1]));
      }
    }
  });
  
  let sprintNumber = 1;
  while (usedNumbers.has(sprintNumber)) {
    sprintNumber++;
  }
  
  return `${projectKey} Sprint ${sprintNumber}`;
};

export default function SprintCreationModal({
  show,
  onClose,
  project,
  employees,
  onSprintCreated,
  existingSprints = [],
  previousSprints = [],
  allProjects = []
}: SprintCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedEpics, setSelectedEpics] = useState<string[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<BacklogTask[]>([]);
  const [backlogEpics, setBacklogEpics] = useState<BacklogEpic[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [suggestedVelocity] = useState(20);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isNameDuplicate, setIsNameDuplicate] = useState(false);
  const [carriedOverTasks, setCarriedOverTasks] = useState<BacklogTask[]>([]);
  const [showCarriedOverTasks, setShowCarriedOverTasks] = useState(false);
  const [lastSprintTasks, setLastSprintTasks] = useState<BacklogTask[]>([]);
  const [showTaskDetails, setShowTaskDetails] = useState<boolean>(false);
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<BacklogTask[]>([]);
  const [recentlyMovedToBacklogTasks, setRecentlyMovedToBacklogTasks] = useState<BacklogTask[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (show && project) {
      setSprintName("");
      setSprintGoal("");
      setStartDate("");
      setEndDate("");
      setSelectedTasks([]);
      setSelectedEpics([]);
      setNameError("");
      setIsNameDuplicate(false);
      setCarriedOverTasks([]);
      setShowCarriedOverTasks(false);
      setLastSprintTasks([]);
      setShowTaskDetails(false);
      setRecentlyMovedToBacklogTasks([]);
      
      const initialName = generateUniqueSprintName(project.key, existingSprints);
      setSprintName(initialName);
    }
  }, [show, project, existingSprints]);

  // Fetch backlog items when project changes
  useEffect(() => {
    if (project?._id && show) {
      fetchBacklogItems();
    }
  }, [project, show, previousSprints]);

  const fetchBacklogItems = async () => {
    if (!project?._id) return;
    
    setLoadingBacklog(true);
    try {
      let tasksData: any[] = [];
      let epicsData: any[] = [];
      
      // Try different task endpoints
      const taskEndpoints = [
        `/api/tasks?status=Backlog`,
        `/api/tasks`,
        `/api/projects/tasks?status=Backlog`
      ];
      
      for (const endpoint of taskEndpoints) {
        try {
          const tasksRes = await fetch(endpoint);
          if (tasksRes.ok) {
            const tasksJson = await tasksRes.json();
            
            if (Array.isArray(tasksJson)) {
              tasksData = tasksJson;
            } else if (tasksJson.data && Array.isArray(tasksJson.data)) {
              tasksData = tasksJson.data;
            } else if (tasksJson.tasks && Array.isArray(tasksJson.tasks)) {
              tasksData = tasksJson.tasks;
            }
            
            if (tasksData.length > 0) break;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}:`, err);
        }
      }
      
      // Try different epic endpoints
      const epicEndpoints = [
        `/api/epics?status=Not%20Started`,
        `/api/epics`,
        `/api/projects/epics?status=Not%20Started`
      ];
      
      for (const endpoint of epicEndpoints) {
        try {
          const epicsRes = await fetch(endpoint);
          if (epicsRes.ok) {
            const epicsJson = await epicsRes.json();
            
            if (Array.isArray(epicsJson)) {
              epicsData = epicsJson;
            } else if (epicsJson.data && Array.isArray(epicsJson.data)) {
              epicsData = epicsJson.data;
            } else if (epicsJson.epics && Array.isArray(epicsJson.epics)) {
              epicsData = epicsJson.epics;
            }
            
            if (epicsData.length > 0) break;
          }
        } catch (err) {
          console.log(`Failed to fetch epics from ${endpoint}:`, err);
        }
      }
      
      // Create a map of epics for quick lookup
      const epicMap = new Map<string, string>();
      epicsData.forEach((epic: any) => {
        if (epic._id) {
          epicMap.set(epic._id, epic.name || epic.title || "Untitled Epic");
        }
      });
      
      // Filter for backlog tasks - include ALL tasks that are in Backlog status
      const filteredTasks = tasksData.filter((task: any) => {
        const isBacklogStatus = task.status === "Backlog" || task.status === "Todo" || task.status === "To Do";
        return isBacklogStatus;
      });
      
      // Filter for not started epics
      const filteredEpics = epicsData.filter((epic: any) => 
        epic.status === "Not Started" || !epic.status
      );
      
      // Enhance tasks with project and epic information
      const enhancedTasks = filteredTasks.map((task: any) => {
        const taskProject = allProjects.find(p => p._id === task.projectId);
        const epicName = task.epicId ? epicMap.get(task.epicId) : undefined;
        return {
          ...task,
          project: taskProject,
          projectName: taskProject?.name || "Unknown Project",
          epicName: epicName,
          wasInSprint: task.sprintId !== undefined && task.sprintId !== null // Track if was in sprint
        } as BacklogTask;
      });
      
      // Enhance epics with project information
      const enhancedEpics = filteredEpics.map((epic: any) => {
        const epicProject = allProjects.find(p => p._id === epic.projectId);
        return {
          ...epic,
          project: epicProject,
          projectName: epicProject?.name || "Unknown Project"
        } as BacklogEpic;
      });
      
      // Check for carried-over tasks from previous sprints
      let carriedOver: BacklogTask[] = [];
      let lastSprint: BacklogTask[] = [];
      
      if (previousSprints.length > 0) {
        // Get all completed sprints sorted by date
        const completedSprints = previousSprints
          .filter(s => s.status === "Completed")
          .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        
        // Check the most recent sprint first
        if (completedSprints.length > 0) {
          const recentSprint = completedSprints[0];
          
          try {
            const sprintTasksRes = await fetch(`/api/sprints/${recentSprint._id}/tasks`);
            if (sprintTasksRes.ok) {
              const sprintTasksData = await sprintTasksRes.json();
              const allSprintTasks = sprintTasksData.data || sprintTasksData.tasks || [];
              
              // Tasks that weren't completed
              const incompleteTasks = allSprintTasks.filter((task: any) => 
                task.status !== "Done" && task.status !== "Completed"
              );
              
              // All tasks from last sprint
              lastSprint = allSprintTasks.map((task: any) => {
                const taskProject = allProjects.find(p => p._id === task.projectId);
                const epicName = task.epicId ? epicMap.get(task.epicId) : undefined;
                return {
                  ...task,
                  project: taskProject,
                  projectName: taskProject?.name || "Unknown Project",
                  epicName: epicName,
                  usedInLastSprint: true,
                  lastSprintStatus: task.status // Save the status from last sprint
                } as BacklogTask;
              });
              
              carriedOver = incompleteTasks.map((task: any) => {
                const taskProject = allProjects.find(p => p._id === task.projectId);
                const epicName = task.epicId ? epicMap.get(task.epicId) : undefined;
                return {
                  ...task,
                  project: taskProject,
                  projectName: taskProject?.name || "Unknown Project",
                  epicName: epicName,
                  isCarriedOver: true,
                  previousSprintId: recentSprint._id,
                  usedInLastSprint: true,
                  lastSprintStatus: task.status
                } as BacklogTask;
              });
            }
          } catch (err) {
            console.log("Failed to fetch carried-over tasks:", err);
          }
        }
        
        // Also check other sprints for tasks that might have been moved to backlog
        // This ensures we capture tasks that were moved from any status to backlog
        for (const completedSprint of completedSprints.slice(0, 3)) { // Check last 3 sprints
          try {
            const sprintTasksRes = await fetch(`/api/sprints/${completedSprint._id}/tasks`);
            if (sprintTasksRes.ok) {
              const sprintTasksData = await sprintTasksRes.json();
              const sprintTasks = sprintTasksData.data || sprintTasksData.tasks || [];
              
              // Find tasks that were in this sprint but are now in backlog
              const tasksMovedToBacklog = sprintTasks
                .filter((task: any) => {
                  // Check if this task is now in our filteredTasks (backlog)
                  return filteredTasks.some(backlogTask => backlogTask._id === task._id);
                })
                .map((task: any) => {
                  const taskProject = allProjects.find(p => p._id === task.projectId);
                  const epicName = task.epicId ? epicMap.get(task.epicId) : undefined;
                  return {
                    ...task,
                    project: taskProject,
                    projectName: taskProject?.name || "Unknown Project",
                    epicName: epicName,
                    usedInLastSprint: true,
                    wasInSprint: true,
                    lastSprintStatus: task.status
                  } as BacklogTask;
                });
              
              // Add to lastSprintTasks for tracking
              lastSprint = [...lastSprint, ...sprintTasks.map((task: any) => {
                const taskProject = allProjects.find(p => p._id === task.projectId);
                const epicName = task.epicId ? epicMap.get(task.epicId) : undefined;
                return {
                  ...task,
                  project: taskProject,
                  projectName: taskProject?.name || "Unknown Project",
                  epicName: epicName,
                  usedInLastSprint: true,
                  lastSprintStatus: task.status
                } as BacklogTask;
              })];
            }
          } catch (err) {
            console.log(`Failed to fetch tasks from sprint ${completedSprint._id}:`, err);
          }
        }
      }
      
      // Mark tasks that were used in last sprint
      const lastSprintTaskIds = lastSprint.map(task => task._id);
      const markedTasks = enhancedTasks.map(task => ({
        ...task,
        usedInLastSprint: lastSprintTaskIds.includes(task._id),
        wasInSprint: task.wasInSprint || lastSprintTaskIds.includes(task._id)
      })) as BacklogTask[];
      
      // Separate tasks that were recently moved to backlog (were in sprint but now in backlog)
      const recentlyMovedTasks = markedTasks.filter(task => 
        task.wasInSprint && (task.status === "Backlog" || task.status === "Todo" || task.status === "To Do")
      );
      
      // Mark epics that have tasks in last sprint
      const markedEpics = enhancedEpics.map(epic => {
        const hasTasksInLastSprint = lastSprint.some(task => 
          task.epicId === epic._id || task.epicId === epic.epicId
        );
        return {
          ...epic,
          usedInLastSprint: hasTasksInLastSprint
        } as BacklogEpic;
      });
      
      setBacklogTasks(markedTasks);
      setCarriedOverTasks(carriedOver);
      setBacklogEpics(markedEpics);
      setLastSprintTasks(lastSprint);
      setRecentlyMovedToBacklogTasks(recentlyMovedTasks);
      
      // Filter tasks for current project
      const currentProjectTasks = markedTasks.filter(task => 
        task.projectId === project._id
      );
      setSelectedProjectTasks(currentProjectTasks);
      
      // Calculate total available story points
      const regularPoints = markedTasks.reduce((sum: number, task: any) => 
        sum + (task.storyPoints || 0), 0
      );
      const carriedOverPoints = carriedOver.reduce((sum: number, task: any) => 
        sum + (task.storyPoints || 0), 0
      );
      setAvailablePoints(regularPoints + carriedOverPoints);
      
      // Auto-select carried-over tasks by default
      const autoSelectTaskIds: string[] = [];
      if (carriedOver.length > 0) {
        const carriedOverTaskIds = carriedOver.map(task => task._id);
        autoSelectTaskIds.push(...carriedOverTaskIds);
        setShowCarriedOverTasks(true);
      }
      
      // Also auto-select tasks that were recently moved to backlog (optional)
      // You can enable this if you want to auto-select all previously sprint tasks
      // const recentlyMovedTaskIds = recentlyMovedTasks.map(task => task._id);
      // autoSelectTaskIds.push(...recentlyMovedTaskIds);
      
      setSelectedTasks(prev => [...new Set([...prev, ...autoSelectTaskIds])]);
    } catch (err) {
      console.error("Failed to fetch backlog items:", err);
    } finally {
      setLoadingBacklog(false);
    }
  };

  // Auto-set end date based on start date
  useEffect(() => {
    if (startDate && !endDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 13);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate]);

  // Validate sprint name
  const validateSprintName = useCallback((name: string) => {
    if (!project || !name.trim()) {
      setNameError("");
      setIsNameDuplicate(false);
      return;
    }
    
    const expectedPattern = new RegExp(`^${project.key} Sprint \\d+$`);
    const isValidFormat = expectedPattern.test(name);
    
    if (!isValidFormat) {
      setNameError(`Sprint name should be in format: "${project.key} Sprint [number]"`);
      setIsNameDuplicate(false);
      return;
    }
    
    const isDuplicate = existingSprints.some(sprint => 
      sprint.name.toLowerCase() === name.toLowerCase()
    );
    
    if (isDuplicate) {
      setNameError("A sprint with this name already exists. Please use a different name.");
      setIsNameDuplicate(true);
    } else {
      setNameError("");
      setIsNameDuplicate(false);
    }
  }, [project, existingSprints]);

  useEffect(() => {
    validateSprintName(sprintName);
  }, [sprintName, validateSprintName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project || !sprintName || !startDate || !endDate) {
      alert("Please fill in all required fields");
      return;
    }

    validateSprintName(sprintName);
    if (nameError) {
      alert(nameError);
      return;
    }

    if (isOverCapacity) {
      const confirmOverCapacity = window.confirm(
        `You are ${calculateSelectedPoints - suggestedVelocity} points over capacity. Are you sure you want to create this sprint?`
      );
      if (!confirmOverCapacity) {
        return;
      }
    }

    setLoading(true);
    try {
      const sprintData = {
        name: sprintName,
        goal: sprintGoal,
        startDate,
        endDate,
        projectId: project._id,
        projectKey: project.key,
        status: "Planned" as const,
        tasks: selectedTasks,
        epics: selectedEpics,
        velocity: suggestedVelocity,
        carriedOverTasks: selectedTasks.filter(taskId => 
          carriedOverTasks.some(task => task._id === taskId && task.isCarriedOver)
        ),
        recentlyMovedTasks: selectedTasks.filter(taskId => 
          recentlyMovedToBacklogTasks.some(task => task._id === taskId)
        )
      };

      const response = await fetch("/api/sprints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sprintData),
      });

      const responseData = await response.json();

      if (response.ok) {
        onSprintCreated(responseData.data || responseData);
        onClose();
      } else {
        if (response.status === 409 || responseData.error?.includes('already exists')) {
          const newName = generateUniqueSprintName(project.key, existingSprints);
          setSprintName(newName);
          alert(`Sprint name already exists. Changed to "${newName}". Please try again.`);
        } else {
          alert(`Failed to create sprint: ${responseData.error || responseData.message || "Unknown error"}`);
        }
      }
    } catch (err: any) {
      console.error("Failed to create sprint:", err);
      alert(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = (taskId: string, points: number = 0) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  const handleEpicToggle = (epicId: string) => {
    setSelectedEpics(prev => {
      if (prev.includes(epicId)) {
        return prev.filter(id => id !== epicId);
      } else {
        return [...prev, epicId];
      }
    });
  };

  // Select all tasks for current project
  const handleSelectAllProjectTasks = () => {
    const projectTaskIds = selectedProjectTasks.map(task => task._id);
    const newSelectedTasks = [...selectedTasks];
    
    projectTaskIds.forEach(id => {
      if (!newSelectedTasks.includes(id)) {
        newSelectedTasks.push(id);
      }
    });
    
    setSelectedTasks(newSelectedTasks);
  };

  // Deselect all tasks for current project
  const handleDeselectAllProjectTasks = () => {
    const projectTaskIds = selectedProjectTasks.map(task => task._id);
    const newSelectedTasks = selectedTasks.filter(id => !projectTaskIds.includes(id));
    setSelectedTasks(newSelectedTasks);
  };

  // Select all carried-over tasks
  const handleSelectAllCarriedOver = () => {
    const carriedOverTaskIds = carriedOverTasks.map(task => task._id);
    setSelectedTasks(prev => {
      const newSelected = [...prev];
      carriedOverTaskIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      return newSelected;
    });
  };

  // Deselect all carried-over tasks
  const handleDeselectAllCarriedOver = () => {
    setSelectedTasks(prev => prev.filter(id => 
      !carriedOverTasks.some(task => task._id === id)
    ));
  };

  // Select all recently moved to backlog tasks
  const handleSelectAllRecentlyMoved = () => {
    const recentlyMovedTaskIds = recentlyMovedToBacklogTasks.map(task => task._id);
    setSelectedTasks(prev => {
      const newSelected = [...prev];
      recentlyMovedTaskIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      return newSelected;
    });
  };

  // Deselect all recently moved to backlog tasks
  const handleDeselectAllRecentlyMoved = () => {
    setSelectedTasks(prev => prev.filter(id => 
      !recentlyMovedToBacklogTasks.some(task => task._id === id)
    ));
  };

  const calculateSelectedPoints = useMemo(() => {
    const regularTaskPoints = backlogTasks
      .filter(task => selectedTasks.includes(task._id) && !carriedOverTasks.some(ct => ct._id === task._id))
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    
    const carriedOverPoints = carriedOverTasks
      .filter(task => selectedTasks.includes(task._id))
      .reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    
    return regularTaskPoints + carriedOverPoints;
  }, [selectedTasks, backlogTasks, carriedOverTasks]);

  const isOverCapacity = calculateSelectedPoints > suggestedVelocity;

  // Generate a new unique name
  const handleGenerateName = () => {
    if (project) {
      const newName = generateUniqueSprintName(project.key, existingSprints);
      setSprintName(newName);
    }
  };

  // Get task name/description
  const getTaskDisplayText = (task: BacklogTask): string => {
    return task.summary || task.title || task.name || "Untitled Task";
  };

  // Get epic name/description
  const getEpicDisplayText = (epic: BacklogEpic): string => {
    return epic.name || epic.title || "Untitled Epic";
  };

  // Get task display with epic information
  const getTaskDisplayWithEpic = (task: BacklogTask): string => {
    const taskName = getTaskDisplayText(task);
    if (task.epicName) {
      return `${taskName} (Epic: ${task.epicName})`;
    }
    return taskName;
  };

  // Get task status badge
  const getTaskStatusBadge = (task: BacklogTask) => {
    if (task.isCarriedOver) {
      return (
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded">
          Carried Over
        </span>
      );
    }
    
    if (task.wasInSprint) {
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
          Previously in Sprint
        </span>
      );
    }
    
    return null;
  };

  // Get selected tasks for display (with epic names)
  const selectedTaskNames = useMemo(() => {
    return selectedTasks
      .map(taskId => {
        const task = [...backlogTasks, ...carriedOverTasks].find(t => t._id === taskId);
        return task ? getTaskDisplayWithEpic(task) : "";
      })
      .filter(name => name.length > 0);
  }, [selectedTasks, backlogTasks, carriedOverTasks]);

  // Get selected epics for display (just names)
  const selectedEpicNames = useMemo(() => {
    return selectedEpics
      .map(epicId => {
        const epic = backlogEpics.find(e => e._id === epicId);
        return epic ? getEpicDisplayText(epic) : "";
      })
      .filter(name => name.length > 0);
  }, [selectedEpics, backlogEpics]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Create New Sprint</h2>
                <p className="text-xs text-slate-500">
                  {project ? `Project: ${project.name} (${project.key})` : "Select a project first"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-12rem)]">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Sprint Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Sprint Name *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateName}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Generate Unique Name
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={sprintName}
                    onChange={(e) => setSprintName(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 ${nameError ? 'border-red-300' : 'border-slate-100'} rounded-xl text-sm font-medium text-black outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-gray-600`}
                    placeholder="Enter sprint name..."
                    required
                  />
                  {nameError && (
                    <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} />
                      <span>{nameError}</span>
                    </div>
                  )}
                </div>
                {project && !nameError && (
                  <p className="text-xs text-gray-600 mt-2">
                    Format: {project.key} Sprint [number]
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Sprint Goal
                </label>
                <textarea
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-black outline-none focus:border-purple-500 focus:bg-white transition-all min-h-[100px] placeholder:text-gray-600"
                  placeholder="Enter Description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Start Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-black outline-none focus:border-purple-500 focus:bg-white transition-all"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    End Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-black outline-none focus:border-purple-500 focus:bg-white transition-all"
                      required
                      min={startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Selected Items Preview */}
              <div className="space-y-4">
                {/* Selected Tasks Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-600" />
                      Selected Tasks ({selectedTasks.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowTaskDetails(!showTaskDetails)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      {showTaskDetails ? (
                        <>
                          <ChevronUp size={14} />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          Show Details
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Simple display of task names */}
                  {selectedTaskNames.length === 0 ? (
                    <div className="px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-sm text-gray-600 text-center">
                        No tasks selected yet. Select tasks from the right panel.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Collapsed view - just names */}
                      {!showTaskDetails && (
                        <div className="space-y-2">
                          <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedTaskNames.map((name, index) => (
                                <li key={index} className="text-sm text-black truncate">
                                  • {name}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {selectedProjectTasks.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllProjectTasks}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Check size={12} />
                                Select All Project Tasks
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllProjectTasks}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <X size={12} />
                                Deselect All Project Tasks
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Expanded view - detailed task cards */}
                      {showTaskDetails && (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {selectedTasks.map(taskId => {
                            const task = [...backlogTasks, ...carriedOverTasks].find(t => t._id === taskId);
                            if (!task) return null;
                            
                            return (
                              <div
                                key={task._id}
                                className={`p-3 border-2 rounded-xl ${task.isCarriedOver ? 'border-orange-200 bg-orange-50' : task.wasInSprint ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-black">
                                        {getTaskDisplayText(task)}
                                      </span>
                                      {getTaskStatusBadge(task)}
                                    </div>
                                    
                                    {/* Show epic name if task has epic */}
                                    {task.epicName && (
                                      <div className="mb-2">
                                        <span className="text-xs text-gray-600">
                                          <span className="font-medium">Epic:</span> {task.epicName}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      {task.storyPoints && task.storyPoints > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                          {task.storyPoints} pts
                                        </span>
                                      )}
                                      {task.projectName && task.projectId !== project?._id && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                          {task.projectName}
                                        </span>
                                      )}
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                        task.status === "Backlog" ? 'bg-gray-100 text-gray-700' :
                                        task.status === "Todo" || task.status === "To Do" ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>
                                        {task.status}
                                      </span>
                                      {task.priority && (
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                          task.priority === "High" ? 'bg-red-100 text-red-700' :
                                          task.priority === "Medium" ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {task.priority}
                                        </span>
                                      )}
                                      {task.lastSprintStatus && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                          Previous: {task.lastSprintStatus}
                                        </span>
                                      )}
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTaskToggle(task._id)}
                                    className="ml-2 p-1 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                    title="Remove task"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {selectedProjectTasks.length > 0 && (
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                type="button"
                                onClick={handleSelectAllProjectTasks}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Check size={12} />
                                Select All Project Tasks
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllProjectTasks}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <X size={12} />
                                Deselect All Project Tasks
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Selected Epics Preview */}
                {selectedEpics.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <Target size={16} className="text-green-600" />
                      Selected Epics ({selectedEpics.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {selectedEpics.map(epicId => {
                        const epic = backlogEpics.find(e => e._id === epicId);
                        if (!epic) return null;
                        
                        return (
                          <div
                            key={epic._id}
                            className="p-3 border border-green-200 bg-green-50 rounded-xl"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-black">
                                {getEpicDisplayText(epic)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEpicToggle(epic._id)}
                                className="p-1 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                title="Remove epic"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Available Backlog Items */}
            <div className="space-y-6">
              {/* Carried-Over Tasks Section */}
              {carriedOverTasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Archive size={16} className="text-orange-600" />
                      <h3 className="font-bold text-slate-800">
                        Carried-Over Tasks ({carriedOverTasks.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-600">
                        {carriedOverTasks.filter(task => selectedTasks.includes(task._id)).length} selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllCarriedOver}
                        className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllCarriedOver}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mb-4">
                    {carriedOverTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedTasks.includes(task._id)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => handleTaskToggle(task._id, task.storyPoints)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task._id)}
                            onChange={() => handleTaskToggle(task._id, task.storyPoints)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-black block">
                              {getTaskDisplayText(task)}
                            </span>
                            {task.epicName && (
                              <span className="text-xs text-gray-600 mt-1 block">
                                Epic: {task.epicName}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {task.storyPoints && task.storyPoints > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  {task.storyPoints} pts
                                </span>
                              )}
                              {task.lastSprintStatus && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                  Was: {task.lastSprintStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recently Moved to Backlog Tasks Section */}
              {recentlyMovedToBacklogTasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      <h3 className="font-bold text-slate-800">
                        Recently Moved to Backlog ({recentlyMovedToBacklogTasks.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">
                        {recentlyMovedToBacklogTasks.filter(task => selectedTasks.includes(task._id)).length} selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllRecentlyMoved}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllRecentlyMoved}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mb-4">
                    {recentlyMovedToBacklogTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedTasks.includes(task._id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => handleTaskToggle(task._id, task.storyPoints)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task._id)}
                            onChange={() => handleTaskToggle(task._id, task.storyPoints)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-black block">
                              {getTaskDisplayText(task)}
                            </span>
                            {task.epicName && (
                              <span className="text-xs text-gray-600 mt-1 block">
                                Epic: {task.epicName}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {task.storyPoints && task.storyPoints > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  {task.storyPoints} pts
                                </span>
                              )}
                              {task.lastSprintStatus && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                  Previously: {task.lastSprintStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tasks Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <List size={16} className="text-green-600" />
                    Available Tasks ({backlogTasks.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {selectedTasks.filter(id => 
                        !carriedOverTasks.some(task => task._id === id) && 
                        !recentlyMovedToBacklogTasks.some(task => task._id === id)
                      ).length} selected
                    </span>
                    {selectedProjectTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllProjectTasks}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                    )}
                  </div>
                </div>
                
                {loadingBacklog ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading available tasks...</p>
                  </div>
                ) : backlogTasks.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <List className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-sm text-gray-600">No backlog tasks available</p>
                    <p className="text-xs text-gray-600 mt-1">Tasks with "Backlog" status will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {backlogTasks.map((task) => {
                      // Skip tasks that are already in carried-over or recently moved sections
                      if (carriedOverTasks.some(ct => ct._id === task._id) || 
                          recentlyMovedToBacklogTasks.some(rm => rm._id === task._id)) {
                        return null;
                      }
                      
                      return (
                        <div
                          key={task._id}
                          className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedTasks.includes(task._id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => handleTaskToggle(task._id, task.storyPoints)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedTasks.includes(task._id)}
                                  onChange={() => handleTaskToggle(task._id, task.storyPoints)}
                                  className="rounded"
                                />
                                <div>
                                  <span className="text-sm font-medium text-black block">
                                    {getTaskDisplayText(task)}
                                  </span>
                                  {task.epicName && (
                                    <span className="text-xs text-gray-600 mt-1 block">
                                      Epic: {task.epicName}
                                    </span>
                                  )}
                                  {task.wasInSprint && !task.isCarriedOver && (
                                    <span className="text-xs text-blue-600 mt-1 block font-medium">
                                      ✓ Was in previous sprint
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.storyPoints && task.storyPoints > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  {task.storyPoints} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available Epics Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Target size={16} className="text-purple-600" />
                    Available Epics ({backlogEpics.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {selectedEpics.length} selected
                    </span>
                  </div>
                </div>
                
                {loadingBacklog ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading available epics...</p>
                  </div>
                ) : backlogEpics.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <Target className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-sm text-gray-600">No backlog epics available</p>
                    <p className="text-xs text-gray-600 mt-1">Epics with "Not Started" status will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {backlogEpics.map((epic) => (
                      <div
                        key={epic._id}
                        className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedEpics.includes(epic._id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => handleEpicToggle(epic._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedEpics.includes(epic._id)}
                                onChange={() => handleEpicToggle(epic._id)}
                                className="rounded"
                              />
                              <span className="text-sm font-medium text-black">
                                {getEpicDisplayText(epic)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {epic.storyPoints && epic.storyPoints > 0 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                {epic.storyPoints} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!nameError || isNameDuplicate}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                "Create Sprint"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}