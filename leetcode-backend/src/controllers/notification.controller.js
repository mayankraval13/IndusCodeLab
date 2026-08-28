import { db } from "../libs/db.js";

export const listNotifications = async (req, res) => {
  const unreadOnly = req.query.unreadOnly === "true";
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  try {
    const notifications = await db.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await db.notification.count({
      where: { userId: req.user.id, readAt: null },
    });

    res.status(200).json({
      success: true,
      message: "Unread count fetched successfully",
      count,
    });
  } catch (error) {
    console.error("Error counting notifications:", error);
    res.status(500).json({ error: "Failed to count notifications" });
  }
};

export const markNotificationRead = async (req, res) => {
  const { id } = req.params;

  try {
    // updateMany scoped by userId, so one user can never mark another's
    // notification as read by guessing an id.
    const result = await db.notification.updateMany({
      where: { id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await db.notification.findFirst({
        where: { id, userId: req.user.id },
        select: { id: true },
      });

      if (!exists) {
        return res.status(404).json({ error: "Notification not found" });
      }
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await db.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: `Marked ${result.count} notification(s) as read`,
      count: result.count,
    });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};
