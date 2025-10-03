import mongoose from "mongoose";

const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    // One of these pairs will be set depending on who sends the message
    fromStudent: { type: Schema.Types.ObjectId, ref: "Student", default: null, index: true },
    toTeacher: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    fromTeacher: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    toStudent: { type: Schema.Types.ObjectId, ref: "Student", default: null, index: true },

    // Content
    message: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileType: {
      type: String,
      enum: ["", "image", "video", "audio", "file", "pdf", "doc", "other"],
      default: "",
    },

    // Status
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helpful indexes for threads and unread queries
MessageSchema.index({ fromStudent: 1, toTeacher: 1, createdAt: 1 });
MessageSchema.index({ fromTeacher: 1, toStudent: 1, createdAt: 1 });
MessageSchema.index({ toStudent: 1, read: 1, createdAt: 1 });
MessageSchema.index({ toTeacher: 1, read: 1, createdAt: 1 });
MessageSchema.index({ createdAt: 1 });

export const Message = mongoose.model("Message", MessageSchema);
