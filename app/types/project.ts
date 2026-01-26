export interface Employee {
  _id: string;
  name: string;
  department?: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: "active" | "inactive";
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
  totalEpics?: number;
  totalTasks?: number;
  totalSprints?: number;
  progress?: number;
}



export interface Epic {
  _id: string;
  epicId: string;
  name: string;
  summary: string;
  description: string;
  status: "Not Started" | "Todo" | "In Progress" | "Review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  startDate: string;
  endDate: string | null;
  ownerId?: string;
  assigneeIds?: string[];
  labels: string[];
  projectId: string;
  projectKey?: string;
  projectName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sprintId?: string;
  storyPoints?: number;
  owner?: { _id: string; name: string; email?: string };
  assignees?: Employee[];
  taskCount?: number;
  completedTasks?: number;
}

// Extended Task interface for Tasks Management
export interface Task {
  _id: string;
  taskId: string;

  // Issue info
  issueKey?: string;
  name?: string;
  summary?: string;
  description: string;

  // Types
  issueType?: "Story" | "Task" | "Bug" | "Feature";
  type?: "Task" | "Bug" | "Story" | "Feature";

  // Status & priority
  status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
  priority: "Lowest" | "Low" | "Medium" | "High" | "Highest" | "Critical";

  // Relations
  assigneeId?: string;
  assigneeIds?: string[];
  reporterId?: string;
  reporterIds?: string[];

  epicId: string;
  epicName?: string;

  projectId: string;
  projectKey?: string;
  projectName?: string;

  sprintId?: string;

  // Time & progress
  storyPoints?: number;
  dueDate?: string;
  duration?: number;

  estimatedHours?: number;
  actualHours?: number;

  completion?: number; // Manual
  subtaskProgress?: number; // Auto-calculated
  overallProgress?: number; // Combined

  // Labels & metadata
  labels: string[];

  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Attachments & comments
  attachments?: string[];
  comments?: (TaskComment | Comment)[];

  // Subtasks
  subtasks?: Subtask[];

  // Populated employee objects
  assignee?: Employee;
  reporter?: Employee;
  assignees?: Employee[];
  reporters?: Employee[];

  // Display fields
  assigneeNames?: string[];
  reporterNames?: string[];
  assigneeEmails?: string[];
  reporterEmails?: string[];
  assigneeRoles?: string[];
  reporterRoles?: string[];
}


export interface Subtask {
  _id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assigneeName: string;
  status: "Todo" | "In Progress" | "Done";
  progressPercentage: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  _id: string;
  taskId: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  message: string;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Sprint {
  _id: string;
  sprintId?: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "Planned" | "Active" | "Completed" | "Archived";
  projectId: string;
  projectKey: string;
  projectName?: string;
  velocity?: number;
  totalPoints?: number;
  completedPoints?: number;
  tasks: string[];
  taskObjects?: Task[];
  epics: string[];
  epicObjects?: Epic[];
  assigneeIds: string[];
  assignees?: Employee[];
  createdAt: string;
  updatedAt: string;
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
  onProjectUpdate: () => void;
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
  summary?: string;
  description: string;
  issueType?: "Story" | "Task" | "Bug" | "Feature";
  priority: "Lowest" | "Low" | "Medium" | "High" | "Highest" | "Critical";
  type: "Task" | "Bug" | "Story" | "Feature";
  storyPoints?: number;
  dueDate?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  reporterIds?: string[];
  epicId: string;
  labels: string[];
  currentLabel?: string;
  duration?: number;
  estimatedHours?: number;
  actualHours?: number;
  status?: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
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

// Tasks Management specific types
export interface TasksManagementProps {
  selectedProject: SavedProject | null;
  selectedEpic: Epic | null;
  employees: Employee[];
  onBackToEpics: () => void;
}

export interface TaskListProps {
  tasks: Task[];
  loadingTasks: boolean;
  taskSearchQuery: string;
  setTaskSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  issueTypeFilter: string;
  setIssueTypeFilter: (type: string) => void;
  totalTasks: number;
  filteredTasksCount: number;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  employees: Employee[];
  selectedEpic: Epic;
  selectedProject: SavedProject;
  onShowTaskForm: () => void;
}

export interface TaskFormProps {
  taskFormData: {
    summary: string;
    description: string;
    issueType: "Story" | "Task" | "Bug" | "Feature";
    status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
    priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
    assigneeIds: string[];
    reporterIds: string[];
    storyPoints: number;
    labels: string[];
    currentLabel: string;
    dueDate: string;
    duration: number;
    estimatedHours: number;
    actualHours: number;
  };
  setTaskFormData: React.Dispatch<React.SetStateAction<{
    summary: string;
    description: string;
    issueType: "Story" | "Task" | "Bug" | "Feature";
    status: "Backlog" | "Todo" | "In Progress" | "Review" | "Done" | "Blocked";
    priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
    assigneeIds: string[];
    reporterIds: string[];
    storyPoints: number;
    labels: string[];
    currentLabel: string;
    dueDate: string;
    duration: number;
    estimatedHours: number;
    actualHours: number;
  }>>;
  editingTaskId: string | null;
  selectedProject: SavedProject;
  selectedEpic: Epic;
  employees: Employee[];
  tasks: Task[];
  loading: boolean;
  onTaskSubmit: () => Promise<void>;
  onBack: () => void;
}

export interface TaskViewModalProps {
  task: Task;
  employees: Employee[];
  selectedProject: SavedProject;
  selectedEpic: Epic;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

// Filter interfaces
export interface TaskFilter {
  search: string;
  status: string;
  priority: string;
  issueType: string;
  assignee: string;
  label: string;
}

// Stats interfaces
export interface TaskStats {
  total: number;
  backlog: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  blocked: number;
}

export interface EpicStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  progress: number;
}