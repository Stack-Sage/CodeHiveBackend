import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  bookSession,
  respondSession,
  payForSession,
  getSessionHistory,
  getSessionDetails,
  cancelSession,
  completeSession,
  refundSession
} from "../controllers/session.controller.js";

const sessionRouter = Router();

sessionRouter.use(verifyJWT);

sessionRouter.post("/book/:teacherId", bookSession);
sessionRouter.post("/respond/:sessionId", respondSession);
sessionRouter.post("/pay/:sessionId", payForSession);
sessionRouter.post("/cancel/:sessionId", cancelSession);
sessionRouter.post("/complete/:sessionId", completeSession);
sessionRouter.post("/refund/:sessionId", refundSession);
sessionRouter.get("/history", getSessionHistory);
sessionRouter.get("/:sessionId", getSessionDetails);

export { sessionRouter };
