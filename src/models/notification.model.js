import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true }, // e.g. "session", "payment"
  message: { type: String, required: true },
  link: { type: String }, // e.g. link to session or payment
  read: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model("Notification", NotificationSchema);
