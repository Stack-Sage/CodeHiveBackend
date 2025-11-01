import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment } from "../models/payment.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export const createOrder = async (req, res, next) => {
  try {
    const { amount, userId } = req.body;

    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Save initial order in DB
    await Payment.create({
      user: userId || null,
      orderId: order.id,
      amount,
      currency: order.currency,
      status: "created",
    });

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};




// 🔐 Verify payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
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
    const { userId } = req.query; // optional query param

    const filter = userId ? { user: userId } : {};
    const payments = await Payment.find(filter)
      .populate("user", "name email") // optional, shows user info
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
