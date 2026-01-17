import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtask {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  storyPoints?: number;
  timeSpent?: number;
  dueDate?: Date;
  remarks?: string;
  subtasks?: ISubtask[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITask extends Document {
  taskId: string;
  issueKey: string;
  summary: string;
  description?: string;
  issueType: 'Story' | 'Task' | 'Bug';
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Review' | 'Done' | 'Blocked';
  priority: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest';
  assigneeIds: string[];
  reporterIds: string[];
  assigneeNames?: string[];
  reporterNames?: string[];
  epicId?: string;
  epicName?: string;
  storyPoints?: number;
  labels: string[];
  dueDate?: Date;
  duration?: number;
  attachments: string[];
  comments: any[];
  projectId: string;
  project?: string;
  projectName?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Add these fields
  subtasks?: ISubtask[];
  completion?: number;
  department?: string;
  remarks?: string;
  startDate?: Date;
  endDate?: Date;
  currentLabel?: string;
  taskTimeSpent?: string;
  taskStoryPoints?: number;
  sprintId?: string;
}

const SubtaskSchema: Schema = new Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    default: 'To Do'
  },
  assigneeId: {
    type: String
  },
  assigneeName: {
    type: String
  },
  storyPoints: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  remarks: {
    type: String
  },
  subtasks: {
    type: [this], // Recursive reference
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const TaskSchema: Schema = new Schema({
  taskId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  issueKey: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  issueType: {
    type: String,
    enum: ['Story', 'Task', 'Bug'],
    default: 'Story'
  },
  status: {
    type: String,
    enum: ['Backlog', 'Todo', 'In Progress', 'Review', 'Done', 'Blocked'],
    default: 'Backlog'
  },
  priority: {
    type: String,
    enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
    default: 'Medium'
  },
  assigneeIds: {
    type: [String],
    default: []
  },
  reporterIds: {
    type: [String],
    default: []
  },
  assigneeNames: {
    type: [String],
    default: []
  },
  reporterNames: {
    type: [String],
    default: []
  },
  epicId: {
    type: String,
    trim: true
  },
  epicName: {
    type: String,
    trim: true
  },
  storyPoints: {
    type: Number,
    default: 0
  },
  labels: {
    type: [String],
    default: []
  },
  dueDate: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  attachments: {
    type: [String],
    default: []
  },
  comments: {
    type: [{
      userId: String,
      userName: String,
      content: String,
      createdAt: Date
    }],
    default: []
  },
  projectId: {
    type: String,
    required: false,
    trim: true
  },
  project: {
    type: String,
    required: false,
    trim: true
  },
  projectName: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Add these fields
  subtasks: {
    type: [SubtaskSchema],
    default: []
  },
  completion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  department: {
    type: String
  },
  remarks: {
    type: String
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  currentLabel: {
    type: String
  },
  taskTimeSpent: {
    type: String
  },
  taskStoryPoints: {
    type: Number,
    default: 0
  },
  sprintId: {
    type: String
  }
}, {
  timestamps: true
});

// Add index for better query performance
TaskSchema.index({ epicId: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ assigneeIds: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ createdAt: -1 });
TaskSchema.index({ subtasks: 1 });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);