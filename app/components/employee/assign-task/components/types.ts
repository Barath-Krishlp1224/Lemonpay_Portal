export interface Subtask {
  id: string | null;
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
}

export interface Task {
  _id: string;
  taskId: string;
  projectId: string;
  project: string;
  assigneeNames: string[];
  assigneeIds?: string[];
  startDate: string;
  endDate?: string;
  dueDate: string;
  completion: number;
  status:
    | "Backlog"
    | "To Do" // Added To Do status
    | "In Progress"
    | "Dev Review"
    | "Deployed in QA"
    | "Test In Progress"
    | "QA Sign Off"
    | "Deployment Stage"
    | "Pilot Test"
    | "Completed"
    | "Paused"
    | string;
  remarks?: string;
  summary?: string; // Main task description
  title?: string;   // Alternative title field
  name?: string;    // Alternative name field
  subtasks?: Subtask[];
  department?: "Tech" | "Accounts" | string;
  taskTimeSpent?: string;
  taskStoryPoints: number;
  issueType?: "Epic" | "Story" | "Task" | "Bug";
  priority?: "Low" | "Medium" | "High" | "Critical";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Additional fields that might come from API
  epicId?: string;
  sprintId?: string;
  labels?: string[];
  currentLabel?: string;
  duration?: number;
  reporterIds?: string[];
  reporterNames?: string[];
  epicName?: string;
  projectName?: string;
  projectKey?: string;
  
  // Helper property for display
  displayName?: string;
}

export interface Employee {
  _id: string;
  name: string;
  empId?: string;
  team?: string;
  email?: string;
  role?: string;
}

export type SubtaskChangeHandler = (path: number[], field: keyof Subtask, value: string | number) => void;
export type SubtaskPathHandler = (path: number[]) => void;
export type SubtaskStatusChangeFunc = (subtaskId: string | null | undefined, newStatus: string) => void;