import { asyncHandler } from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { accessTokenOptions, options } from "../constants/constant.js"; // removed refreshTokenOptions
import validator from "validator";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { Dashboard } from "../models/dashboard.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.models.js";

// Helper to sync skills from user model to dashboard
async function syncSkillsToDashboard(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return;
  const skills = Array.isArray(user.skills)
    ? user.skills.map(name => ({ name, level: 1 }))
    : [];
  await Dashboard.findOneAndUpdate(
    { user: userId },
    { $set: { skills } },
    { upsert: true }
  );
}

// Get dashboard stats for a user
export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  let dashboard = await Dashboard.findOne({ user: userId }).lean();
  if (!dashboard) {
    dashboard = await Dashboard.create({ user: userId });
    await syncSkillsToDashboard(userId);
    dashboard = await Dashboard.findOne({ user: userId }).lean();
  }
  // Sync skills if user updated profile
  await syncSkillsToDashboard(userId);

  // Aggregate live stats
  dashboard.messagesSent = await Message.countDocuments({ fromUser: userId });
  dashboard.messagesReceived = await Message.countDocuments({ toUser: userId });

  // Optionally, update profileClicksHistory (e.g. last 7 days)
  // dashboard.profileClicksHistory = [10, 12, 8, 15, 9, 7, 11]; // Example: implement logic as needed

  return res.status(200).json(dashboard);
});

// Update dashboard stats (for admin or educator)
export const updateDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const update = req.body;
  const dashboard = await Dashboard.findOneAndUpdate(
    { user: userId },
    { $set: update },
    { new: true, upsert: true }
  );
  return res.status(200).json(dashboard);
});

// Add a review and update feedback summary
export const addReview = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { studentId, rating, comment } = req.body;
  const dashboard = await Dashboard.findOneAndUpdate(
    { user: userId },
    { $push: { reviews: { student: studentId, rating, comment } } },
    { new: true, upsert: true }
  );
  // Update feedback summary (simple example)
  const total = dashboard.reviews.length;
  const excellent = dashboard.reviews.filter(r => r.rating >= 5).length;
  dashboard.feedbackSummary.excellentPercent = total ? Math.round((excellent / total) * 100) : 0;
  dashboard.feedbackSummary.recommendPercent = total ? Math.round((dashboard.reviews.filter(r => r.rating >= 4).length / total) * 100) : 0;
  await dashboard.save();
  return res.status(201).json(dashboard);
});

// Add a profile click and update history
export const addProfileClick = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const dashboard = await Dashboard.findOneAndUpdate(
    { user: userId },
    { $inc: { profileClicks: 1 } },
    { new: true, upsert: true }
  );
  // Update profileClicksHistory (e.g. push to array, keep last 7 days)
  dashboard.profileClicksHistory = dashboard.profileClicksHistory || [];
  dashboard.profileClicksHistory.push(1);
  if (dashboard.profileClicksHistory.length > 7) dashboard.profileClicksHistory.shift();
  await dashboard.save();
  return res.status(200).json(dashboard);
});

// Add a search appearance
export const addSearchAppearance = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const dashboard = await Dashboard.findOneAndUpdate(
    { user: userId },
    { $inc: { searchAppearances: 1 } },
    { new: true, upsert: true }
  );
  return res.status(200).json(dashboard);
});

// Admin: Get site-wide stats
export const getSiteStats = asyncHandler(async (req, res) => {
  const totalStudents = await User.countDocuments({ roles: "student" });
  const totalTeachers = await User.countDocuments({ roles: "educator" });
  // Top skills analytics
  const skillAgg = await Dashboard.aggregate([
    { $unwind: "$skills" },
    { $group: { _id: "$skills.name", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  return res.status(200).json({
    totalStudents,
    totalTeachers,
    topSkills: skillAgg.map(s => ({ skill: s._id, count: s.count }))
  });
});





