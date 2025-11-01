import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String },
    signature: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["created", "success", "failed"], default: "created" },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
