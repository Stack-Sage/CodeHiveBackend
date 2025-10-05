import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { v2 as cloudinary } from "cloudinary";

// Helpers
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

// Build a query that fetches the full thread between two users
const threadQuery = (a, b) => ({
  $or: [
    { fromUser: a, toUser: b },
    { fromUser: b, toUser: a },
  ],
});

// Build message doc for unified user model
function buildMessageDoc({ senderId, receiverId, message, fileUrl, fileType }) {
  return {
    fromUser: senderId,
    toUser: receiverId,
    message,
    fileUrl,
    fileType,
    read: false,
  };
}

/**
 * POST /api/messages
 * body: { receiverId, message, fileUrl?, fileType? }
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, message, fileUrl, fileType } = req.body || {};
  const authenticatedUserId = req.user?._id?.toString();

  if (!authenticatedUserId) {
    throw new ApiError(401, "Authentication required");
  }
  if (!receiverId || !message?.trim()) {
    throw new ApiError(400, "Receiver and message are required");
  }

  const doc = buildMessageDoc({
    senderId: authenticatedUserId,
    receiverId,
    message,
    fileUrl,
    fileType,
  });
  const saved = await Message.create(doc);

  const populated = await Message.findById(saved._id)
    .populate("fromUser toUser", "fullname username email avatar")
    .lean();

  return res.status(201).json(new ApiResponse(201, populated, "Message sent"));
});

/**
 * GET /api/messages/thread/:userA/:userB
 */
export const getThreadMessages = asyncHandler(async (req, res) => {
  const { userA, userB } = req.params;
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
  const before = req.query.before ? new Date(req.query.before) : null;

  if (!userA || !userB) throw new ApiError(400, "Thread requires userA and userB");

  const q = threadQuery(userA, userB);
  const findQuery = before ? { $and: [q, { createdAt: { $lt: before } }] } : q;

  let query = Message.find(findQuery)
    .sort({ createdAt: 1 })
    .populate("fromUser toUser", "fullname username email avatar")
    .lean();

  if (before) {
    query = query.limit(limit);
  } else {
    query = query.skip((page - 1) * limit).limit(limit);
  }

  const messages = await query;

  return res.status(200).json(new ApiResponse(200, messages, "Thread fetched"));
});

/**
 * GET /api/messages/conversations/:userId
 * Returns list of partners with last message, time, unread count and partner info.
 */
export const getConversations = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) throw new ApiError(400, "User ID is required");

  const uid = toObjectId(userId);
  if (!uid) throw new ApiError(400, "Invalid userId");

  const pipeline = [
    { $match: { $or: [{ fromUser: uid }, { toUser: uid }] } },
    { $sort: { createdAt: -1 } },
    {
      $addFields: {
        partnerId: {
          $cond: [{ $eq: ["$fromUser", uid] }, "$toUser", "$fromUser"],
        },
      },
    },
    {
      $group: {
        _id: "$partnerId",
        lastMessage: { $first: "$message" },
        lastMessageAt: { $first: "$createdAt" },
        lastMessageId: { $first: "$_id" },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$read", false] }, { $eq: ["$toUser", uid] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "partner",
      },
    },
    { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        unreadCount: 1,
        partner: {
          _id: "$partner._id",
          fullname: "$partner.fullname",
          username: "$partner.username",
          email: "$partner.email",
          avatar: "$partner.avatar",
        },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ];

  const conversations = await Message.aggregate(pipeline);

  return res.status(200).json(new ApiResponse(200, conversations, "Conversations fetched"));
});

export const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) throw new ApiError(400, "messageId required");

  const updated = await Message.findByIdAndUpdate(
    messageId,
    { read: true },
    { new: true }
  ).lean();

  if (!updated) throw new ApiError(404, "Message not found");

  return res.status(200).json(new ApiResponse(200, updated, "Message marked as read"));
});

export const markThreadAsRead = asyncHandler(async (req, res) => {
  const { me, peer } = req.params;
  if (!me || !peer) throw new ApiError(400, "me and peer required");

  const filter = {
    fromUser: peer,
    toUser: me,
    read: false,
  };

  const result = await Message.updateMany(filter, { $set: { read: true } });
  return res
    .status(200)
    .json(new ApiResponse(200, { matched: result.matchedCount, modified: result.modifiedCount }, "Thread marked as read"));
});

export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { newText } = req.body || {};

  const authenticatedUserId = req.user?._id?.toString();

  if (!messageId || !newText?.trim()) {
    throw new ApiError(400, "Message ID and new text required");
  }

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, "Message not found");

  // Check ownership
  const isOwner = msg.fromUser?.toString() === authenticatedUserId;

  if (!isOwner) {
    throw new ApiError(403, "You can only edit your own messages");
  }

  msg.message = newText.trim();
  await msg.save();

  const populated = await Message.findById(msg._id)
    .populate("fromUser toUser", "fullname username email avatar")
    .lean();

  return res.status(200).json(new ApiResponse(200, populated, "Message edited"));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) throw new ApiError(400, "messageId required");

  const currentUserId =
    req.user?._id?.toString?.() || req.body.userId || null;

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, "Message not found");

  if (
    currentUserId &&
    msg.fromUser?.toString?.() !== currentUserId
  ) {
    throw new ApiError(403, "You can delete only your own messages");
  }

  await Message.findByIdAndDelete(messageId);
  return res.status(200).json(new ApiResponse(200, { _id: messageId }, "Message deleted"));
});

export const searchMessages = asyncHandler(async (req, res) => {
  const { me, peer, keyword } = req.query;
  if (!me || !peer || !keyword) throw new ApiError(400, "me, peer and keyword are required");

  const messages = await Message.find({
    ...threadQuery(me, peer),
    message: { $regex: keyword, $options: "i" },
  })
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json(new ApiResponse(200, messages, "Messages searched"));
});

export const getUnreadCountForThread = asyncHandler(async (req, res) => {
  const { me, peer } = req.params;
  if (!me || !peer) throw new ApiError(400, "me and peer required");

  const count = await Message.countDocuments({
    fromUser: peer,
    toUser: me,
    read: false,
  });

  return res.status(200).json(new ApiResponse(200, { count }, "Unread count fetched"));
});

export const getChatHistory = asyncHandler(async (req, res) => {
  const { userA, userB, page } = req.params;
  const pageNum = Math.max(parseInt(page || "1", 10), 1);
  const limit = 20;

  const messages = await Message.find(threadQuery(userA, userB))
    .populate("fromUser toUser", "fullname username email avatar")
    .sort({ createdAt: 1 })
    .skip((pageNum - 1) * limit)
    .limit(limit);

  return res.status(200).json(new ApiResponse(200, messages, "Chat history fetched successfully"));
});

export const uploadMessageFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'file is required' });
  }
  const ALLOWED_MIME = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain"
  ]);
  if (!ALLOWED_MIME.has(req.file.mimetype)) {
    return res.status(415).json({ success: false, message: 'unsupported media type' });
  }
  const b64 = Buffer.from(req.file.buffer).toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataUri, { resource_type: "auto" });
  return res.json({ success: true, secure_url: result.secure_url });
});