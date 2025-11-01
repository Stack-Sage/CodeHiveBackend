import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment } from "../models/payment.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Create order
export const createOrder = async (req, res, next) => {
  try {
    const { amount, userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const options = {
      amount: amount, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);

    await Payment.create({
      userId,
      orderId: order.id,
      amount,
      status: "created",
    });

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Verify payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign)
      .digest("hex");

    const isAuthentic = expectedSign === razorpay_signature;

    if (isAuthentic) {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: "success",
        }
      );
      res.status(200).json({ success: true, message: "Payment verified & stored." });
    } else {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "failed" }
      );
      res.status(400).json({ success: false, message: "Invalid signature." });
    }
  } catch (error) {
    next(error);
  }
};

// ✅ Get Payment History
export const getPaymentHistory = async (req, res, next) => {
  try {
    const { userId } = req.query;
    // Show payments where user is either payer or payee
    const filter = userId ? { $or: [{ fromUser: userId }, { toUser: userId }] } : {};
    const payments = await Payment.find(filter)
      .populate("fromUser", "fullname email")
      .populate("toUser", "fullname email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};
