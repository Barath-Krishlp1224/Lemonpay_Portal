import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttachment {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedById: string;
}

export interface IComment extends Document {
  text?: string;
  userId: string;
  userName: string;
  userRole: string;
  taskId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  mentionedEmployees?: string[];
  attachments?: IAttachment[];
}

const AttachmentSchema: Schema = new Schema(
  {
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0'],
    },
    uploadedBy: {
      type: String,
      required: [true, 'Uploader name is required'],
      trim: true,
    },
    uploadedById: {
      type: String,
      required: [true, 'Uploader ID is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const CommentSchema: Schema = new Schema(
  {
    text: {
      type: String,
      required: function(this: any): boolean {
        // Only require text if there are no attachments
        const attachments = this.attachments || [];
        return attachments.length === 0;
      },
      trim: true,
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      index: true,
    },
    userRole: {
      type: String,
      required: [true, 'User role is required'],
      enum: ['Admin', 'Manager', 'TeamLead', 'Employee'],
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Task ID is required'],
      ref: 'Task',
      index: true,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    mentionedEmployees: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
      validate: {
        validator: function(attachments: IAttachment[]): boolean {
          // Limit to 10 attachments per comment
          return attachments.length <= 10;
        },
        message: 'Cannot upload more than 10 attachments per comment',
      },
    },
  },
  {
    timestamps: true,
    collection: 'comments',
  }
);

// Indexes for efficient querying
CommentSchema.index({ taskId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ userName: 1, createdAt: -1 });
CommentSchema.index({ createdAt: -1 });

// Middleware to extract mentions from comment text
CommentSchema.pre('save', function (next) {
  if (this.isModified('text')) {
    const text = this.get('text');
    if (typeof text === 'string' && text.trim()) {
      const mentionRegex = /@([a-zA-Z0-9_\s]+)/g;
      const mentions: string[] = [];
      let match: RegExpExecArray | null;
      
      while ((match = mentionRegex.exec(text)) !== null) {
        if (match[1]) {
          mentions.push(match[1].trim());
        }
      }
      
      this.set('mentionedEmployees', [...new Set(mentions)]);
    } else {
      // If text is empty, clear mentions
      this.set('mentionedEmployees', []);
    }
  }
  
  // Set editedAt timestamp when text is modified (except for initial creation)
  if (this.isModified('text') && !this.isNew) {
    this.set('editedAt', new Date());
  }
  
  next();
});

// Clear any existing model
if (mongoose.models.Comment) {
  delete mongoose.models.Comment;
}

const Comment = mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;