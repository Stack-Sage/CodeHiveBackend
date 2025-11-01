import express from "express";
import { createOrder, verifyPayment,getPaymentHistory } from "../controllers/payment.controller.js";

const router = express.Router();

// Create order
router.post("/order", createOrder);

// Verify payment
router.post("/verify", verifyPayment);

router.get("/history", getPaymentHistory); 

export { router as paymentRouter };
