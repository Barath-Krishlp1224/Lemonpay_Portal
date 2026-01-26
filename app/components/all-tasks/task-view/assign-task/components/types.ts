// Unified Types for Task Management System
// app/components/team-lead/task-view/assign-task/components/types.ts

export interface Subtask {
  id: string | null;
  _id?: string; // For compatibility with backend data
  title: string;
  assigneeName: string;
  status: string;
  completion: number;
  remarks: string;
  timeSpent?: string;
  storyPoints: number;
  subtasks?: Subtask[];
  isEditing?: boolean;
  isExpanded?: boolean;
  date?: string;
  assigneeId?: string; // For backend compatibility
  progressPercentage?: number; // For backend compatibility
  taskId?: string; // For backend compatibility
  createdAt?: string; // For backend compatibility
  updatedAt?: string; // For backend compatibility
}

export interface Task {
  _id: string;
  taskId: string; // For backend compatibility
  title: string;
  summary?: string; // For backend compatibility
  description?: string; // For backend compatibility
  issueKey?: string; // For backend compatibility
  issueType?: "Story" | "Task" | "Bug"; // For backend compatibility
  
  // Project Info
  projectId: string;
  project: string;
  projectKey?: string; // For backend compatibility
  projectName?: string; // For backend compatibility
  
  // People
  assigneeNames: string[];
  assigneeIds?: string[]; // For backend compatibility
  reporterIds?: string[]; // For backend compatibility
  reporterNames?: string[]; // For backend compatibility
  createdBy?: string; // For backend compatibility
  
  // Dates
  startDate: string;
  endDate?: string;
  dueDate: string;
  createdAt?: string; // For backend compatibility
  updatedAt?: string; // For backend compatibility
  
  // Progress & Status
  completion: number;
  status: 
    | "Backlog"
    | "Todo" // For backend compatibility
    | "In Progress"
    | "Dev Review"
    | "Deployed in QA"
    | "Test In Progress"
    | "QA Sign Off"
    | "Deployment Stage"
    | "Pilot Test"
    | "Completed"
    | "Done" // For backend compatibility
    | "Review" // For backend compatibility
    | "Blocked" // For backend compatibility
    | "Paused"
    | string;
    
  // Priority
  priority?: "Lowest" | "Low" | "Medium" | "High" | "Highest" | string;
  
  // Epic Info
  epicId?: string; // For backend compatibility
  epicName?: string; // For backend compatibility
  
  // Story Points
  taskStoryPoints: number;
  storyPoints?: number; // For backend compatibility
  
  // Other Fields
  remarks?: string;
  subtasks?: Subtask[];
  department?: "Tech" | "Accounts" | string;
  taskTimeSpent?: string;
  duration?: number; // For backend compatibility
  labels?: string[]; // For backend compatibility
  attachments?: string[]; // For backend compatibility
  comments?: Comment[]; // For backend compatibility
}

export interface Comment {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Epic {
  _id: string;
  epicId: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  projectId: string;
  tasks?: Task[];
}

export interface Project {
  _id: string;
  name: string;
  key: string;
  projectType: string;
}

export interface Employee {
  _id: string;
  name: string;
  email?: string;
}

export interface ProjectProgress {
  overall: number;
  epics: number;
  tasks: number;
  subtasks: number;
  completedEpics: number;
  completedTasks: number;
  completedSubtasks: number;
}

export type ViewType = "card" | "board" | "chart";

export type SubtaskChangeHandler = (path: number[], field: keyof Subtask, value: string | number) => void;
export type SubtaskPathHandler = (path: number[]) => void;
export type SubtaskStatusChangeFunc = (subtaskId: string | null | undefined, newStatus: string) => void;
export type SubtaskListChangeHandler = (subtasks: Subtask[]) => void;

// For compatibility with existing components
export interface AggregatedTaskData extends Task {
  aggregatedStats?: {
    totalSubtasks: number;
    completedSubtasks: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
  };
}

// Utility type for API response normalization
export type NormalizedTask = Omit<Task, 'taskStoryPoints'> & {
  taskStoryPoints: number;
  storyPoints: number;
  title: string;
};

// Status constants for type safety
export const TASK_STATUSES = [
  "Backlog", "Todo", "In Progress", "Dev Review", 
  "Deployed in QA", "Test In Progress", "QA Sign Off", 
  "Deployment Stage", "Pilot Test", "Completed", "Done", 
  "Review", "Blocked", "Paused"
] as const;

export const PRIORITY_LEVELS = ["Lowest", "Low", "Medium", "High", "Highest"] as const;