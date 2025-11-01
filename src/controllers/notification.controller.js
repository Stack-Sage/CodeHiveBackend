import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
  res.json({ success: true, notifications });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { read: true });
  res.json({ success: true });
});
