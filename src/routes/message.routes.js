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
} from "../controllers/message.controller.js";

const messageRouter = Router();

// Create a message
messageRouter.post("/", sendMessage);

// Fetch a thread between two users (agnostic of roles)
messageRouter.get("/thread/:userA/:userB", getThreadMessages);

// Conversations list for a user (role-aware)
messageRouter.get("/conversations/:userId/:role", getConversations);

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
messageRouter.get("/history/:studentId/:teacherId/:page", getChatHistory);


export { messageRouter  };

