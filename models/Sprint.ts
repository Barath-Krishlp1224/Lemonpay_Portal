import mongoose, { Schema, Document } from 'mongoose';

export interface ISprint extends Document {
  id?: string; // Add this if your database has id field
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  projectId: mongoose.Types.ObjectId;
  projectKey: string;
  velocity: number;
  totalPoints: number;
  completedPoints: number;
  status: 'Planned' | 'Active' | 'Completed' | 'Closed';
  tasks: mongoose.Types.ObjectId[];
  epics: mongoose.Types.ObjectId[];
  sprintNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new Schema<ISprint>({
  // Add id field with auto-generation
  id: {
    type: String,
    unique: true,
    default: function() {
      return new mongoose.Types.ObjectId().toString();
    }
  },
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
  },
  goal: {
    type: String,
    default: '',
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
  },
  projectKey: {
    type: String,
    required: [true, 'Project key is required'],
  },
  velocity: {
    type: Number,
    default: 20,
    min: [0, 'Velocity cannot be negative'],
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  completedPoints: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Planned', 'Active', 'Completed', 'Closed'],
    default: 'Planned',
  },
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  epics: [{
    type: Schema.Types.ObjectId,
    ref: 'Epic',
  }],
  sprintNumber: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

// Compound unique index for projectId and name
sprintSchema.index({ projectId: 1, name: 1 }, { unique: true });

const Sprint = mongoose.models.Sprint || mongoose.model<ISprint>('Sprint', sprintSchema);

export default Sprint;