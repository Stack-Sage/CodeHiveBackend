import mongoose from "mongoose";

const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    
    fromUser: { type: Schema.Types.ObjectId, ref: "User", index: true },
    toUser: { type: Schema.Types.ObjectId, ref: "User", index: true },

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


MessageSchema.index({ fromUser: 1, toUser: 1, createdAt: 1 });
MessageSchema.index({ toUser: 1, read: 1, createdAt: 1 });
MessageSchema.index({ createdAt: 1 });

export const Message = mongoose.model("Message", MessageSchema);
