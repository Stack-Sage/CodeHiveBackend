import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/order", createOrder);
router.post("/verify", verifyPayment);

export { router as paymentRouter };
