export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedById: string;
}

export interface Comment {
  _id?: string;
  id?: string;
  text: string;
  userId: string;
  userName: string;
  userRole?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  editedAt?: string;
  mentions?: string[];
  taskId?: string;
  isEditing?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  attachments?: Attachment[];
}

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
  progress?: number;
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
  status: string;
  remarks?: string;
  summary?: string;
  title?: string;
  name?: string;
  subtasks?: Subtask[];
  department?: "Tech" | "Accounts" | string;
  taskTimeSpent?: string;
  taskStoryPoints: number;
  issueType?: "Epic" | "Story" | "Task" | "Bug";
  priority?: "Low" | "Medium" | "High" | "Critical";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  
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
  
  displayName?: string;
  
  commentCount?: number;
  comments?: Comment[];
  lastCommentAt?: string;
}

export interface Employee {
  _id: string;
  name: string;
  empId?: string;
  team?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export type SubtaskChangeHandler = (path: number[], field: keyof Subtask, value: string | number) => void;
export type SubtaskPathHandler = (path: number[]) => void;
export type SubtaskStatusChangeFunc = (subtaskId: string | null | undefined, newStatus: string) => void;

export interface CurrentUser {
  id: string;
  name: string;
  role: string;
  email?: string;
}

// Comment action types
export type CommentActionHandler = (commentId: string, text?: string, attachments?: File[]) => Promise<void>;
export type CommentUpdateHandler = (commentId: string, newText: string, attachments?: File[], removedAttachmentIds?: string[]) => Promise<void>;