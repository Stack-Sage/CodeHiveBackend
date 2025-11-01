import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topic: { type: String, required: true },
  skill: { type: String, required: true },
  message: { type: String, default: "" },
  proposedRate: { type: Number, required: true },
  proposedDates: [{ type: String }], // ISO strings
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled", "paid", "completed", "refunded"],
    default: "pending"
  },
  statusHistory: [{
    status: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  platformFee: { type: Number, default: 0 },
  teacherAmount: { type: Number, default: 0 },
  payoutStatus: {
    type: String,
    enum: ["pending", "paid", "refunded", "not_applicable"],
    default: "not_applicable"
  },
  teacherPaymentMethod: {
    upi: { type: String, default: "" },
    bank: { type: String, default: "" },
    mobile: { type: String, default: "" }
  }
}, { timestamps: true });

export const Session = mongoose.model("Session", SessionSchema);
