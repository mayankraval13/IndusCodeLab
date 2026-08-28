import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore.js";

const POLL_INTERVAL_MS = 60_000;

const relativeTime = (iso) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationBell() {
  const { notifications, unreadCount, isLoading, fetchUnreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleOpenItem = (notification) => {
    markRead(notification.id);
    if (notification.linkUrl) {
      setOpen(false);
      navigate(notification.linkUrl);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-ll-muted hover:text-ll-text hover:bg-ll-surface-2 transition-colors"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-ll-error text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 ll-panel rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ll-border">
            <p className="text-sm font-semibold text-ll-text">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-ll-muted hover:text-ll-text transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-ll-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-ll-muted opacity-40" />
                <p className="text-sm text-ll-muted">You are all caught up</p>
              </div>
            ) : (
              <ul className="divide-y divide-ll-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-ll-surface-2 transition-colors ${
                        notification.readAt ? "" : "bg-ll-surface-2/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            notification.readAt
                              ? "bg-transparent"
                              : "bg-ll-accent"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ll-text">
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-xs text-ll-muted mt-0.5">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-[11px] text-ll-muted mt-1">
                            {relativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
