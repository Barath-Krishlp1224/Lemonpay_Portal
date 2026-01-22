import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  type: 'mention' | 'status_change' | 'assignment' | 'due_date' | 'comment';
  userId: string;
  userName: string;
  message: string;
  taskId?: string;
  commentId?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['mention', 'status_change', 'assignment', 'due_date', 'comment'],
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    taskId: {
      type: String,
      ref: 'Task',
    },
    commentId: {
      type: String,
      ref: 'Comment',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

const Notification: Model<INotification> = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;