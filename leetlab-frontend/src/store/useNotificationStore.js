import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  /**
   * Polled by the bell, so failures stay silent — a dropped poll should never
   * throw a toast at someone who is not even looking at notifications.
   */
  fetchUnreadCount: async () => {
    try {
      const res = await axiosInstance.get("/notifications/unread-count");
      set({ unreadCount: res.data.count ?? 0 });
    } catch {
      // ignored on purpose
    }
  },

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const res = await axiosInstance.get("/notifications?limit=20");
      const notifications = res.data.notifications ?? [];
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.readAt).length,
      });
    } catch {
      // ignored on purpose
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.readAt) return;

    // Optimistic: the badge should drop the instant the item is opened.
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await axiosInstance.patch(`/notifications/${id}/read`);
    } catch {
      get().fetchNotifications();
    }
  },

  markAllRead: async () => {
    const previous = get().notifications;
    const now = new Date().toISOString();

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.readAt ? n : { ...n, readAt: now },
      ),
      unreadCount: 0,
    }));

    try {
      await axiosInstance.patch("/notifications/read-all");
    } catch {
      set({
        notifications: previous,
        unreadCount: previous.filter((n) => !n.readAt).length,
      });
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
