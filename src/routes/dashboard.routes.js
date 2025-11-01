import { Router } from "express";
import {
  getDashboardStats,
  updateDashboardStats,
  addReview,
  addProfileClick,
  addSearchAppearance,
  getSiteStats
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.use(verifyJWT);

dashboardRouter.get("/:userId", getDashboardStats);
dashboardRouter.patch("/:userId", updateDashboardStats);
dashboardRouter.post("/:userId/review", addReview);
dashboardRouter.post("/:userId/click", addProfileClick);
dashboardRouter.post("/:userId/search", addSearchAppearance);
dashboardRouter.get("/site-stats", getSiteStats);

export { dashboardRouter };
