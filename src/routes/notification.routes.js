import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getNotifications, markNotificationRead } from "../controllers/notification.controller.js";

const notificationRouter = Router();
notificationRouter.use(verifyJWT);

notificationRouter.get("/", getNotifications);
notificationRouter.post("/:id/read", markNotificationRead);

export { notificationRouter };
