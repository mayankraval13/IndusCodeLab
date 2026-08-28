import express from "express";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const notificationRoutes = express.Router();

// Every notification route is scoped to req.user, so authentication is the
// only guard needed — there is nothing here that is not the caller's own.
notificationRoutes.use(authMiddleware);

notificationRoutes.get("/", listNotifications);
notificationRoutes.get("/unread-count", getUnreadCount);
notificationRoutes.patch("/read-all", markAllNotificationsRead);
notificationRoutes.patch("/:id/read", markNotificationRead);

export default notificationRoutes;
