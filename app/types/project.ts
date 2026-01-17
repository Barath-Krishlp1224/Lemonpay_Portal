export interface Employee {
  _id: string;
  name: string;
  department?: string;
  email?: string;
  avatar?: string;
  role?: string;
}




export interface SavedProject {
  _id: string;
  name: string;
  key: string;
  ownerId: string;
  assigneeIds: string[];
  description?: string;
  status: "Active" | "Archived" | "Completed";
  createdAt: string;
  updatedAt: string;
  visibility: "PRIVATE" | "PUBLIC";
  members: {
    userId: string;
    role: "Viewer" | "Contributor" | "Admin";
    addedAt: string;
  }[];
  // Optional fields for metrics
  totalEpics?: number;
  totalTasks?: number;
  totalSprints?: number;
  progress?: number;
}

// Update Epic type to include both assigneeId (singular) and assigneeIds (plural)
export interface Epic {
  _id: string;
  epicId: string;
  name: string;
  summary: string;
  description: string;
  status: "Not Started" | "Todo" | "In Progress" | "Review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  startDate: string;
  endDate: string | null;  // Make nullable to match your frontend
  ownerId?: string;        // Optional: for frontend usage
  assigneeIds?: string[];  // Optional: for frontend usage
  labels: string[];
  projectId: string;
  projectKey?: string;
  projectName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
  storyPoints?: number;
  owner?: { _id: string; name: string; email?: string };  // For populated data
  assignees?: Employee[];  // For populated data
  taskCount?: number;
  completedTasks?: number;
}

export interface Task {
  _id: string;
  taskId: string;
  name: string;
  description: string;
  status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done"; // Added "Backlog"
  priority: "Low" | "Medium" | "High" | "Critical";
  type: "Task" | "Bug" | "Story" | "Feature";
  storyPoints?: number;
  dueDate?: string;
  assigneeId?: string;
  reporterId: string;
  epicId: string;
  projectId: string;
  projectKey?: string;       // Added for consistency
  labels: string[];
  createdAt: string;
  updatedAt: string;
  sprintId?: string;         // Added for sprint association
  assignee?: Employee;
  reporter?: Employee;
  // Optional fields for UI
  epicName?: string;
  sprintName?: string;
}

export interface Sprint {
  _id: string;
  sprintId?: string;         // Human-readable ID like "SPR-1"
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "Planned" | "Active" | "Completed" | "Archived";
  projectId: string;
  projectKey: string;
  projectName?: string;      // Added for display purposes
  velocity?: number;
  totalPoints?: number;
  completedPoints?: number;
  tasks: string[];           // Task IDs
  taskObjects?: Task[];      // Optional: populated tasks
  epics: string[];           // Epic IDs
  epicObjects?: Epic[];      // Optional: populated epics
  assigneeIds: string[];     // Team members assigned to sprint
  assignees?: Employee[];    // Optional: populated assignees
  createdAt: string;
  updatedAt: string;
  // Optional fields for metrics
  progress?: number;
  overdueTasks?: number;
  completedTasks?: number;
  totalTasks?: number;
}

export interface BacklogItem {
  id: string;
  type: "Task" | "Epic";
  title: string;
  description: string;
  storyPoints?: number;
  assignee?: Employee;
  epicId?: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface ProjectDetailsProps {
  selectedProject: SavedProject | null;
  onProjectUpdate: () => void; // Remove employees from here
}

export interface SprintMetrics {
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  completionRate: number;
  daysRemaining: number;
  overdueTasks: number;
  teamVelocity: number;
}

export interface ProjectMetrics {
  totalEpics: number;
  totalTasks: number;
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  backlogTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overallProgress: number;
}

// UI State Types
export interface ProjectViewMode {
  mode: "overview" | "tasks" | "sprints" | "epics" | "reports";
  selectedItemId?: string;
}

export interface FilterState {
  searchQuery: string;
  dateFilter: string;
  statusFilter: string[];
  priorityFilter: string[];
  assigneeFilter: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form Data Types
export interface ProjectFormData {
  name: string;
  key: string;
  description?: string;
  status: "Active" | "Archived" | "Completed";
  visibility: "PRIVATE" | "PUBLIC";
  assigneeIds: string[];
}

export interface EpicFormData {
  name: string;
  summary: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  startDate: string;
  endDate: string;
  assigneeIds: string[];
  labels: string[];
  storyPoints?: number;
}

export interface TaskFormData {
  name: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  type: "Task" | "Bug" | "Story" | "Feature";
  storyPoints?: number;
  dueDate?: string;
  assigneeId?: string;
  epicId: string;
  labels: string[];
}

export interface SprintFormData {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  velocity?: number;
  assigneeIds: string[];
  taskIds: string[];
  epicIds: string[];
}