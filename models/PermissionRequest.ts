import mongoose, { Schema, Document, Model } from "mongoose";

export type PermissionType = "permission" | "wfh" | "on-duty" | "forgot-check";
export type ForgotType = "in" | "out";
export type DurationOption = "hours" | "first-half" | "second-half" | "minutes";
export type PermissionStatus = 
  | "pending"
  | "manager-pending"
  | "approved"
  | "rejected"
  | "auto-approved";

export interface IPermissionRequest extends Document {
  employeeName?: string;
  employeeId?: string;
  
  // Request type information
  permissionType: PermissionType;
  forgotType?: ForgotType;
  durationOption?: DurationOption; // New: Store which duration option was selected
  
  // Date/Time information
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  
  // Time information
  startTime?: string;
  endTime?: string;
  time?: string;
  
  // Duration information
  days?: number;
  hours?: string; // Store hours as entered (for hours option)
  minutes?: string; // Store minutes as entered (for minutes option)
  duration?: string; // Final calculated duration in hours
  
  // Reason/Description
  reason?: string;
  forgotReason?: string;
  description?: string;
  
  // Status
  status: PermissionStatus;
  
  // Approval tracking
  teamLeadApproved?: boolean;
  managerApproved?: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PermissionRequestSchema = new Schema<IPermissionRequest>(
  {
    employeeName: { type: String },
    employeeId: { type: String },
    
    permissionType: {
      type: String,
      enum: ["permission", "wfh", "on-duty", "forgot-check"],
      required: true,
    },
    
    forgotType: {
      type: String,
      enum: ["in", "out"],
    },
    
    durationOption: {
      type: String,
      enum: ["hours", "first-half", "second-half", "minutes"],
    },
    
    // Date fields
    date: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    
    // Time fields
    startTime: { type: String },
    endTime: { type: String },
    time: { type: String },
    
    // Duration fields
    days: { type: Number },
    hours: { type: String },
    minutes: { type: String },
    duration: { type: String },
    
    // Reason fields
    reason: { type: String },
    forgotReason: { type: String },
    description: { type: String },
    
    // Status
    status: {
      type: String,
      enum: ["pending", "manager-pending", "approved", "rejected", "auto-approved"],
      default: "pending",
    },
    
    // Approval tracking
    teamLeadApproved: {
      type: Boolean,
      default: false,
    },
    managerApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
PermissionRequestSchema.index({ employeeId: 1, createdAt: -1 });
PermissionRequestSchema.index({ status: 1 });
PermissionRequestSchema.index({ permissionType: 1 });
PermissionRequestSchema.index({ date: 1 });

const PermissionRequest: Model<IPermissionRequest> =
  mongoose.models.PermissionRequest ||
  mongoose.model<IPermissionRequest>("PermissionRequest", PermissionRequestSchema);

export default PermissionRequest;