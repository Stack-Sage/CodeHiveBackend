import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Helpers
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

// Build a query that fetches the full thread between two users (student/teacher-agnostic)
const threadQuery = (a, b) => ({
  $or: [
    // Student -> Teacher
    { fromStudent: a, toTeacher: b },
    { fromStudent: b, toTeacher: a },
    // Teacher -> Student
    { fromTeacher: a, toStudent: b },
    { fromTeacher: b, toStudent: a },
  ],
});

// Resolve message direction fields based on sender role
function buildMessageDoc({ senderId, receiverId, senderRole, message, fileUrl, fileType }) {
  if (senderRole === "Student") {
    return {
      fromStudent: senderId,
      toTeacher: receiverId,
      message,
      fileUrl,
      fileType,
      read: false,
    };
  }
  if (senderRole === "Teacher") {
    return {
      fromTeacher: senderId,
      toStudent: receiverId,
      message,
      fileUrl,
      fileType,
      read: false,
    };
  }
  throw new ApiError(400, "senderRole must be 'Student' or 'Teacher'");
}

/**
 * POST /api/messages
 * body: { senderId, receiverId, senderRole: 'Student'|'Teacher', message, fileUrl?, fileType? }
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { senderId, receiverId, senderRole, message, fileUrl, fileType } = req.body || {};

  if (!senderId || !receiverId || !senderRole || (!message && !fileUrl)) {
    throw new ApiError(400, "senderId, receiverId, senderRole and message or file are required");
  }

  const doc = buildMessageDoc({ senderId, receiverId, senderRole, message, fileUrl, fileType });
  const saved = await Message.create(doc);

  // Optional: populate minimal sender/receiver info for UI
  const populated = await Message.findById(saved._id)
    .populate("fromStudent fromTeacher toStudent toTeacher", "fullname username email avatar")
    .lean();

  return res.status(201).json(new ApiResponse(201, populated, "Message sent"));
});

/**
 * GET /api/messages/thread/:userA/:userB
 * Query: ?page=1&limit=50&before=<ISO date> (optional "before" for pagination)
 */
export const getThreadMessages = asyncHandler(async (req, res) => {
  const { userA, userB } = req.params;
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
  const before = req.query.before ? new Date(req.query.before) : null;

  if (!userA || !userB) throw new ApiError(400, "Thread requires userA and userB");

  const q = threadQuery(userA, userB);
  const findQuery = before ? { $and: [q, { createdAt: { $lt: before } }] } : q;

  const messages = await Message.find(findQuery)
    .sort({ createdAt: 1 }) // ascending for chat display
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("fromStudent fromTeacher toStudent toTeacher", "fullname username email avatar")
    .lean();

  return res.status(200).json(new ApiResponse(200, messages, "Thread fetched"));
});

/**
 * GET /api/messages/conversations/:userId/:role
 * Returns list of partners with last message, time, unread count and partner info.
 */
export const getConversations = asyncHandler(async (req, res) => {
  const { userId, role } = req.params;
  if (!userId || !role) throw new ApiError(400, "User ID and role are required");
  if (role !== "Student" && role !== "Teacher") throw new ApiError(400, "Role must be Student or Teacher");

  const uid = toObjectId(userId);
  if (!uid) throw new ApiError(400, "Invalid userId");

  // Match any message where this user participates
  const match =
    role === "Student"
      ? { $or: [{ fromStudent: uid }, { toStudent: uid }] }
      : { $or: [{ fromTeacher: uid }, { toTeacher: uid }] };

  // partnerId: for Student, the partner is teacher: prefer fromTeacher else toTeacher
  // for Teacher, the partner is student: prefer fromStudent else toStudent
  const partnerExpr =
    role === "Student"
      ? { $ifNull: ["$fromTeacher", "$toTeacher"] }
      : { $ifNull: ["$fromStudent", "$toStudent"] };

  const unreadToMeCond =
    role === "Student"
      ? { $and: [{ $eq: ["$read", false] }, { $eq: ["$toStudent", uid] }] }
      : { $and: [{ $eq: ["$read", false] }, { $eq: ["$toTeacher", uid] }] };

  const pipeline = [
    { $match: match },
    { $sort: { createdAt: -1 } }, // so $first picks latest
    {
      $addFields: {
        partnerId: partnerExpr,
      },
    },
    {
      $group: {
        _id: "$partnerId",
        lastMessage: { $first: "$message" },
        lastMessageAt: { $first: "$createdAt" },
        lastMessageId: { $first: "$_id" },
        unreadCount: { $sum: { $cond: [unreadToMeCond, 1, 0] } },
      },
    },
    // Lookup partner info
    ...(role === "Student"
      ? [
          {
            $lookup: {
              from: "users", // teachers/users collection
              localField: "_id",
              foreignField: "_id",
              as: "partner",
            },
          },
        ]
      : [
          {
            $lookup: {
              from: "students",
              localField: "_id",
              foreignField: "_id",
              as: "partner",
            },
          },
        ]),
    { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1, // partnerId
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
    $or: [
      // Peer (Student) -> Me (Teacher)
      { fromStudent: peer, toTeacher: me, read: false },
      // Peer (Teacher) -> Me (Student)
      { fromTeacher: peer, toStudent: me, read: false },
    ],
  };

  const result = await Message.updateMany(filter, { $set: { read: true } });
  return res
    .status(200)
    .json(new ApiResponse(200, { matched: result.matchedCount, modified: result.modifiedCount }, "Thread marked as read"));
});


export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { newText } = req.body || {};
  if (!messageId || !newText) throw new ApiError(400, "messageId and newText required");

  // Optional: ownership check (supports both teacher and student auth middlewares)
  const currentUserId =
    req.user?._id?.toString?.() ||
    req.student?._id?.toString?.() ||
    req.body.userId ||
    null;

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, "Message not found");

  if (
    currentUserId &&
    ![msg.fromStudent?.toString?.(), msg.fromTeacher?.toString?.()].includes(currentUserId)
  ) {
    throw new ApiError(403, "You can edit only your own messages");
  }

  msg.message = newText;
  await msg.save();

  const populated = await Message.findById(msg._id)
    .populate("fromStudent fromTeacher toStudent toTeacher", "fullname username email avatar")
    .lean();

  return res.status(200).json(new ApiResponse(200, populated, "Message edited"));
});


export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) throw new ApiError(400, "messageId required");

  const currentUserId =
    req.user?._id?.toString?.() ||
    req.student?._id?.toString?.() ||
    req.body.userId ||
    null;

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, "Message not found");

  if (
    currentUserId &&
    ![msg.fromStudent?.toString?.(), msg.fromTeacher?.toString?.()].includes(currentUserId)
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
    $or: [
      // Peer (Student) -> Me (Teacher)
      { fromStudent: peer, toTeacher: me, read: false },
      // Peer (Teacher) -> Me (Student)
      { fromTeacher: peer, toStudent: me, read: false },
    ],
  });

  return res.status(200).json(new ApiResponse(200, { count }, "Unread count fetched"));
});


export const getChatHistory = asyncHandler(async (req, res) => {
  const { studentId, teacherId } = req.params;
  const page = Math.max(parseInt(req.params.page || "1", 10), 1);
  const limit = 20;

  const messages = await Message.find({
    $or: [
      { fromStudent: studentId, toTeacher: teacherId },
      { fromTeacher: teacherId, toStudent: studentId },
    ],
  })
    .populate("fromStudent fromTeacher toStudent toTeacher", "fullname username email avatar")
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return res.status(200).json(new ApiResponse(200, messages, "Chat history fetched successfully"));
});