import mongoose, { Schema, models, model, Document, Types } from "mongoose";

// Define interfaces for embedded documents
interface IProjectMember {
  userId: string;
  role: "Viewer" | "Contributor" | "Admin";
  addedAt: Date;
}

interface ISprint {
  _id: Types.ObjectId;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  status: "Planned" | "Active" | "Completed";
  tasks?: Types.ObjectId[];
  completedTasks: number;
  totalTasks: number;
  completedPoints: number;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IEpic {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  status: "Not Started" | "In Progress" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  createdAt: Date;
  updatedAt: Date;
}

interface ITask {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: "Backlog" | "To Do" | "In Progress" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  sprintId?: Types.ObjectId | null;
  assigneeId?: string | null;
  storyPoints?: number;
  epicId?: Types.ObjectId | null;
  taskId?: string;
  issueType?: string;
  assigneeNames?: string[];
  subtasks?: any[];
  backlogOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define the interface for the Project document
interface IProject extends Document {
  name: string;
  key: string;
  description: string;
  members: IProjectMember[];
  assigneeIds?: string[]; // Add this line
  visibility: "PRIVATE" | "PUBLIC";
  status: "Active" | "Archived" | "Completed";
  totalTasks: number;
  completedTasks: number;
  createdAt: Date;
  updatedAt: Date;
  
  sprints: ISprint[];
  epics: IEpic[];
  tasks: ITask[];
  
  createdAtFormatted: string;
  completionPercentage: number;
  
  // Methods
  updateTaskCounts(completedTasks: number, totalTasks: number): Promise<IProject>;
  getActiveSprint(): ISprint | null;
  getBacklogTasks(): ITask[];
  getTasksBySprint(sprintId: Types.ObjectId | null): ITask[];
  getEpicsByStatus(status: "Not Started" | "In Progress" | "Done"): IEpic[];
  addTask(taskData: Partial<ITask>): ITask;
  updateTask(taskId: string | Types.ObjectId, updateData: Partial<ITask>): ITask;
  deleteTask(taskId: string | Types.ObjectId): ITask;
  updateSprintMetrics(sprintId: Types.ObjectId): ISprint;
}

/**
 * Project Schema with all required fields including sprints, epics, and tasks
 */
const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    key: {
      type: String,
      required: [true, "Project key is required"],
      uppercase: true,
      unique: true,
      trim: true,
      index: true,
      maxlength: [10, "Project key cannot exceed 10 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    members: {
      type: [{
        userId: {
          type: String,
          required: [true, "User ID is required"],
        },
        role: {
          type: String,
          enum: ["Viewer", "Contributor", "Admin"],
          default: "Contributor"
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: [],
    },
    assigneeIds: { // Add this field
      type: [String],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
    },
    status: {
      type: String,
      enum: ["Active", "Archived", "Completed"],
      default: "Active",
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    
    // Updated sprints array with metrics fields
    sprints: {
      type: [{
        name: {
          type: String,
          required: [true, "Sprint name is required"],
          trim: true,
          maxlength: [100, "Sprint name cannot exceed 100 characters"],
        },
        goal: {
          type: String,
          trim: true,
          maxlength: [500, "Sprint goal cannot exceed 500 characters"],
        },
        startDate: {
          type: Date,
        },
        endDate: {
          type: Date,
        },
        status: {
          type: String,
          enum: ["Planned", "Active", "Completed"],
          default: "Planned",
        },
        tasks: {
          type: [Schema.Types.ObjectId],
          default: [],
        },
        completedTasks: {
          type: Number,
          default: 0,
        },
        totalTasks: {
          type: Number,
          default: 0,
        },
        completedPoints: {
          type: Number,
          default: 0,
        },
        totalPoints: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
    
    // Epics array
    epics: {
      type: [{
        name: {
          type: String,
          required: [true, "Epic name is required"],
          trim: true,
          maxlength: [100, "Epic name cannot exceed 100 characters"],
        },
        description: {
          type: String,
          trim: true,
          maxlength: [1000, "Epic description cannot exceed 1000 characters"],
        },
        status: {
          type: String,
          enum: ["Not Started", "In Progress", "Done"],
          default: "Not Started",
        },
        priority: {
          type: String,
          enum: ["Low", "Medium", "High", "Critical"],
          default: "Medium",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
    
    // Updated tasks array with all fields
    tasks: {
      type: [{
        title: {
          type: String,
          required: [true, "Task title is required"],
          trim: true,
          maxlength: [200, "Task title cannot exceed 200 characters"],
        },
        description: {
          type: String,
          trim: true,
          maxlength: [2000, "Task description cannot exceed 2000 characters"],
          default: "",
        },
        status: {
          type: String,
          enum: ["Backlog", "To Do", "In Progress", "Done"],
          default: "Backlog",
        },
        priority: {
          type: String,
          enum: ["Low", "Medium", "High", "Critical"],
          default: "Medium",
        },
        sprintId: {
          type: Schema.Types.ObjectId,
          ref: "Sprint",
          default: null,
        },
        assigneeId: {
          type: String,
          default: null,
        },
        storyPoints: {
          type: Number,
          min: [0, "Story points must be positive"],
          max: [100, "Story points cannot exceed 100"],
          default: 0,
        },
        epicId: {
          type: Schema.Types.ObjectId,
          default: null,
        },
        taskId: {
          type: String,
        },
        issueType: {
          type: String,
          default: "Task",
        },
        assigneeNames: {
          type: [String],
          default: [],
        },
        subtasks: {
          type: [Schema.Types.Mixed],
          default: [],
        },
        backlogOrder: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
  },
  { 
    timestamps: true // Automatically creates createdAt and updatedAt fields
  }
);

// Pre-save middleware to ensure key is uppercase
ProjectSchema.pre('save', function(next) {
  if (this.key) {
    this.key = this.key.toUpperCase();
  }
  next();
});

// Pre-save middleware to ensure at least one admin member exists
ProjectSchema.pre('save', function(next) {
  // Check if there are any admin members
  const hasAdmin = this.members?.some(member => member.role === 'Admin');
  
  if (!hasAdmin && this.members?.length > 0) {
    // If there are members but no admin, make the first member an admin
    this.members[0].role = 'Admin';
  }
  
  next();
});

// Pre-save middleware to sync assigneeIds from tasks
ProjectSchema.pre('save', function(next) {
  // Collect all unique assigneeIds from tasks
  const assigneeSet = new Set<string>();
  
  this.tasks?.forEach((task: any) => {
    if (task.assigneeId && typeof task.assigneeId === 'string') {
      assigneeSet.add(task.assigneeId);
    }
  });
  
  // Update assigneeIds array
  this.assigneeIds = Array.from(assigneeSet);
  
  next();
});

// Indexes for faster queries
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ "sprints.status": 1 });
ProjectSchema.index({ "tasks.sprintId": 1 });
ProjectSchema.index({ "tasks.status": 1 });
ProjectSchema.index({ "tasks.taskId": 1 });
ProjectSchema.index({ "epics.status": 1 });
ProjectSchema.index({ "members.userId": 1 });
ProjectSchema.index({ "assigneeIds": 1 }); // Add index for assigneeIds

// Virtual for formatted date
ProjectSchema.virtual('createdAtFormatted').get(function(this: IProject) {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for completion percentage
ProjectSchema.virtual('completionPercentage').get(function(this: IProject) {
  if (this.totalTasks === 0) return 0;
  return Math.round((this.completedTasks / this.totalTasks) * 100);
});

// Method to add a member to the project
ProjectSchema.methods.addMember = function(this: IProject, userId: string, role: "Viewer" | "Contributor" | "Admin" = "Contributor") {
  const existingMemberIndex = this.members.findIndex(m => m.userId === userId);
  
  if (existingMemberIndex !== -1) {
    // Update existing member's role
    this.members[existingMemberIndex].role = role;
    this.members[existingMemberIndex].addedAt = new Date();
  } else {
    // Add new member
    this.members.push({
      userId,
      role,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove a member from the project
ProjectSchema.methods.removeMember = function(this: IProject, userId: string) {
  const memberIndex = this.members.findIndex(m => m.userId === userId);
  
  if (memberIndex === -1) {
    throw new Error("Member not found");
  }
  
  this.members.splice(memberIndex, 1);
  
  // Ensure at least one admin remains
  const hasAdmin = this.members.some(member => member.role === 'Admin');
  if (!hasAdmin && this.members.length > 0) {
    this.members[0].role = 'Admin';
  }
  
  return this.save();
};

// Method to update task counts
ProjectSchema.methods.updateTaskCounts = async function(this: IProject, completedTasks: number, totalTasks: number) {
  this.completedTasks = completedTasks;
  this.totalTasks = totalTasks;
  return this.save();
};

// Method to get active sprint
ProjectSchema.methods.getActiveSprint = function(this: IProject) {
  return this.sprints.find((sprint: ISprint) => sprint.status === "Active") || null;
};

// Method to get backlog tasks (tasks not assigned to any sprint)
ProjectSchema.methods.getBacklogTasks = function(this: IProject) {
  return this.tasks.filter((task: ITask) => !task.sprintId && task.status === "Backlog");
};

// Method to get tasks by sprint
ProjectSchema.methods.getTasksBySprint = function(this: IProject, sprintId: Types.ObjectId | null) {
  if (sprintId === null) {
    return this.tasks.filter((task: ITask) => !task.sprintId);
  }
  return this.tasks.filter((task: ITask) => task.sprintId && task.sprintId.equals(sprintId));
};

// Method to get epics by status
ProjectSchema.methods.getEpicsByStatus = function(this: IProject, status: "Not Started" | "In Progress" | "Done") {
  return this.epics.filter((epic: IEpic) => epic.status === status);
};

// Method to add a new task
ProjectSchema.methods.addTask = function(this: IProject, taskData: Partial<ITask>) {
  const newTask: ITask = {
    _id: new Types.ObjectId(),
    title: taskData.title || "New Task",
    description: taskData.description || "",
    status: taskData.status || "Backlog",
    priority: taskData.priority || "Medium",
    sprintId: taskData.sprintId || null,
    assigneeId: taskData.assigneeId || null,
    storyPoints: taskData.storyPoints || 0,
    epicId: taskData.epicId || null,
    taskId: taskData.taskId || `${this.key}-${this.tasks.length + 1}`,
    issueType: taskData.issueType || "Task",
    assigneeNames: taskData.assigneeNames || [],
    subtasks: taskData.subtasks || [],
    backlogOrder: taskData.backlogOrder || this.tasks.length,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.tasks.push(newTask);
  
  // Update project task counts
  this.totalTasks += 1;
  if (newTask.status === "Done") {
    this.completedTasks += 1;
  }
  
  // Update assigneeIds if task has an assignee
  if (newTask.assigneeId && !this.assigneeIds?.includes(newTask.assigneeId)) {
    if (!this.assigneeIds) this.assigneeIds = [];
    this.assigneeIds.push(newTask.assigneeId);
  }
  
  // If task has sprintId, update sprint metrics
  if (newTask.sprintId) {
    const sprintIndex = this.sprints.findIndex(
      (s: ISprint) => s._id.equals(newTask.sprintId!)
    );
    if (sprintIndex !== -1) {
      this.sprints[sprintIndex].totalTasks += 1;
      this.sprints[sprintIndex].totalPoints += newTask.storyPoints || 0;
      if (newTask.status === "Done") {
        this.sprints[sprintIndex].completedTasks += 1;
        this.sprints[sprintIndex].completedPoints += newTask.storyPoints || 0;
      }
    }
  }
  
  return newTask;
};

// Method to update a task
ProjectSchema.methods.updateTask = function(this: IProject, taskId: string | Types.ObjectId, updateData: Partial<ITask>) {
  const taskIndex = this.tasks.findIndex((t: ITask) => 
    t._id.toString() === taskId.toString() || t.taskId === taskId
  );
  
  if (taskIndex === -1) {
    throw new Error("Task not found");
  }
  
  const oldTask = { ...this.tasks[taskIndex] };
  const oldSprintId = oldTask.sprintId;
  const oldStatus = oldTask.status;
  const oldStoryPoints = oldTask.storyPoints || 0;
  const oldAssigneeId = oldTask.assigneeId;
  
  // Update task properties
  const updatedTask = {
    ...oldTask,
    ...updateData,
    updatedAt: new Date()
  };

  // Handle null values properly
  if (updateData.sprintId === null) {
    updatedTask.sprintId = null;
  }
  if (updateData.assigneeId === null) {
    updatedTask.assigneeId = null;
  }
  if (updateData.epicId === null) {
    updatedTask.epicId = null;
  }

  this.tasks[taskIndex] = updatedTask;
  
  const newTask = this.tasks[taskIndex];
  const newSprintId = newTask.sprintId;
  const newStatus = newTask.status;
  const newStoryPoints = newTask.storyPoints || 0;
  const newAssigneeId = newTask.assigneeId;
  
  // Update project task counts if status changed
  if (oldStatus !== newStatus) {
    if (oldStatus === "Done" && newStatus !== "Done") {
      this.completedTasks = Math.max(0, this.completedTasks - 1);
    } else if (oldStatus !== "Done" && newStatus === "Done") {
      this.completedTasks += 1;
    }
  }
  
  // Update assigneeIds if assignee changed
  if (oldAssigneeId !== newAssigneeId) {
    // Remove old assignee if no other tasks are assigned to them
    if (oldAssigneeId) {
      const hasOtherTasks = this.tasks.some((t: ITask, idx: number) => 
        idx !== taskIndex && t.assigneeId === oldAssigneeId
      );
      if (!hasOtherTasks && this.assigneeIds) {
        this.assigneeIds = this.assigneeIds.filter(id => id !== oldAssigneeId);
      }
    }
    
    // Add new assignee if not already in assigneeIds
    if (newAssigneeId && this.assigneeIds && !this.assigneeIds.includes(newAssigneeId)) {
      this.assigneeIds.push(newAssigneeId);
    }
  }
  
  // Handle sprint changes
  if (oldSprintId && !oldSprintId.equals(newSprintId!)) {
    // Task moved from old sprint
    const oldSprintIndex = this.sprints.findIndex(
      (s: ISprint) => s._id.equals(oldSprintId)
    );
    if (oldSprintIndex !== -1) {
      this.sprints[oldSprintIndex].totalTasks = Math.max(0, this.sprints[oldSprintIndex].totalTasks - 1);
      this.sprints[oldSprintIndex].totalPoints = Math.max(0, this.sprints[oldSprintIndex].totalPoints - oldStoryPoints);
      if (oldStatus === "Done") {
        this.sprints[oldSprintIndex].completedTasks = Math.max(0, this.sprints[oldSprintIndex].completedTasks - 1);
        this.sprints[oldSprintIndex].completedPoints = Math.max(0, this.sprints[oldSprintIndex].completedPoints - oldStoryPoints);
      }
    }
  }
  
  if (newSprintId && (!oldSprintId || !oldSprintId.equals(newSprintId))) {
    // Task moved to new sprint
    const newSprintIndex = this.sprints.findIndex(
      (s: ISprint) => s._id.equals(newSprintId)
    );
    if (newSprintIndex !== -1) {
      this.sprints[newSprintIndex].totalTasks += 1;
      this.sprints[newSprintIndex].totalPoints += newStoryPoints;
      if (newStatus === "Done") {
        this.sprints[newSprintIndex].completedTasks += 1;
        this.sprints[newSprintIndex].completedPoints += newStoryPoints;
      }
    }
  }
  
  // Update same sprint metrics if only status or points changed
  if (oldSprintId && newSprintId && oldSprintId.equals(newSprintId)) {
    const sprintIndex = this.sprints.findIndex(
      (s: ISprint) => s._id.equals(oldSprintId)
    );
    if (sprintIndex !== -1) {
      // Update points if changed
      if (oldStoryPoints !== newStoryPoints) {
        this.sprints[sprintIndex].totalPoints = 
          this.sprints[sprintIndex].totalPoints - oldStoryPoints + newStoryPoints;
        if (oldStatus === "Done") {
          this.sprints[sprintIndex].completedPoints = 
            Math.max(0, this.sprints[sprintIndex].completedPoints - oldStoryPoints);
        }
        if (newStatus === "Done") {
          this.sprints[sprintIndex].completedPoints += newStoryPoints;
        }
      }
      
      // Update status if changed
      if (oldStatus !== newStatus) {
        if (oldStatus === "Done" && newStatus !== "Done") {
          this.sprints[sprintIndex].completedTasks = Math.max(0, this.sprints[sprintIndex].completedTasks - 1);
          this.sprints[sprintIndex].completedPoints = Math.max(0, this.sprints[sprintIndex].completedPoints - (newStoryPoints || 0));
        } else if (oldStatus !== "Done" && newStatus === "Done") {
          this.sprints[sprintIndex].completedTasks += 1;
          this.sprints[sprintIndex].completedPoints += newStoryPoints;
        }
      }
    }
  }
  
  return newTask;
};

// Method to delete a task
ProjectSchema.methods.deleteTask = function(this: IProject, taskId: string | Types.ObjectId) {
  const taskIndex = this.tasks.findIndex((t: ITask) => 
    t._id.toString() === taskId.toString() || t.taskId === taskId
  );
  
  if (taskIndex === -1) {
    throw new Error("Task not found");
  }
  
  const taskToDelete = this.tasks[taskIndex];
  
  // Remove the task
  this.tasks.splice(taskIndex, 1);
  
  // Update project task counts
  this.totalTasks = Math.max(0, this.totalTasks - 1);
  if (taskToDelete.status === "Done") {
    this.completedTasks = Math.max(0, this.completedTasks - 1);
  }
  
  // Update assigneeIds if this was the last task for this assignee
  if (taskToDelete.assigneeId) {
    const hasOtherTasks = this.tasks.some((t: ITask) => t.assigneeId === taskToDelete.assigneeId);
    if (!hasOtherTasks && this.assigneeIds) {
      this.assigneeIds = this.assigneeIds.filter(id => id !== taskToDelete.assigneeId);
    }
  }
  
  // Update sprint metrics if task was in a sprint
  if (taskToDelete.sprintId) {
    const sprintIndex = this.sprints.findIndex(
      (s: ISprint) => s._id.equals(taskToDelete.sprintId!)
    );
    if (sprintIndex !== -1) {
      this.sprints[sprintIndex].totalTasks = Math.max(0, this.sprints[sprintIndex].totalTasks - 1);
      this.sprints[sprintIndex].totalPoints = Math.max(0, this.sprints[sprintIndex].totalPoints - (taskToDelete.storyPoints || 0));
      if (taskToDelete.status === "Done") {
        this.sprints[sprintIndex].completedTasks = Math.max(0, this.sprints[sprintIndex].completedTasks - 1);
        this.sprints[sprintIndex].completedPoints = Math.max(0, this.sprints[sprintIndex].completedPoints - (taskToDelete.storyPoints || 0));
      }
    }
  }
  
  return taskToDelete;
};

// Method to update sprint metrics
ProjectSchema.methods.updateSprintMetrics = function(this: IProject, sprintId: Types.ObjectId) {
  const sprintIndex = this.sprints.findIndex((s: ISprint) => s._id.equals(sprintId));
  
  if (sprintIndex === -1) {
    throw new Error("Sprint not found");
  }
  
  const sprintTasks = this.tasks.filter((task: ITask) => 
    task.sprintId && task.sprintId.equals(sprintId)
  );
  
  const totalTasks = sprintTasks.length;
  const completedTasks = sprintTasks.filter((task: ITask) => task.status === "Done").length;
  const totalPoints = sprintTasks.reduce((sum: number, task: ITask) => sum + (task.storyPoints || 0), 0);
  const completedPoints = sprintTasks
    .filter((task: ITask) => task.status === "Done")
    .reduce((sum: number, task: ITask) => sum + (task.storyPoints || 0), 0);
  
  this.sprints[sprintIndex].totalTasks = totalTasks;
  this.sprints[sprintIndex].completedTasks = completedTasks;
  this.sprints[sprintIndex].totalPoints = totalPoints;
  this.sprints[sprintIndex].completedPoints = completedPoints;
  this.sprints[sprintIndex].updatedAt = new Date();
  
  return this.sprints[sprintIndex];
};

// Ensure virtual fields are included in JSON output
ProjectSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete (ret as any).__v;
    return ret;
  }
});

ProjectSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete (ret as any).__v;
    return ret;
  }
});

// Add static methods interface
interface ProjectModel extends mongoose.Model<IProject> {
  // Add any static methods here if needed
}

// Prevent Mongoose from creating multiple models during Next.js Hot Module Replacement
const Project = models.Project as ProjectModel || model<IProject, ProjectModel>("Project", ProjectSchema);

export default Project;