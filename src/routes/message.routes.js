import { Router } from "express";
import {
  sendMessage,
  getThreadMessages,
  getConversations,
  markMessageAsRead,
  markThreadAsRead,
  editMessage,
  deleteMessage,
  searchMessages,
  getUnreadCountForThread,
  getChatHistory,
  uploadMessageFile, // <-- add this to your controller
} from "../controllers/message.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; // use shared multer middleware
import { verifyJWT } from "../middlewares/auth.middleware.js";

const messageRouter = Router();

messageRouter.use(verifyJWT);
// Create a message
messageRouter.post("/", sendMessage);

messageRouter.get("/thread/:userA/:userB", getThreadMessages);

// Conversations list for a user (role-aware)
messageRouter.get("/conversations/:userId", getConversations);

// Mark a specific message as read
messageRouter.patch("/:messageId/read", markMessageAsRead);

// Mark entire thread as read
messageRouter.patch("/thread/:me/:peer/read", markThreadAsRead);

// Edit a message
messageRouter.patch("/:messageId", editMessage);

// Delete a message
messageRouter.delete("/:messageId", deleteMessage);

// Search inside a thread
messageRouter.get("/search", searchMessages);

// Unread count for a thread
messageRouter.get("/unread/:me/:peer", getUnreadCountForThread);

// Chat history (paged)
messageRouter.get("/history/:userA/:userB/:page", getChatHistory);

// Message file upload route using shared multer middleware and controller
messageRouter.post("/upload", upload.single("file"), uploadMessageFile);

export { messageRouter };
