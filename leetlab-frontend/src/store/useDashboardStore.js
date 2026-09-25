import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || fallback;

/**
 * One store for all three dashboards. Each role's payload has its own slot, so
 * an admin who visits both their own dashboard and a student view does not have
 * the two overwrite each other.
 */
export const useDashboardStore = create((set) => ({
  student: null,
  faculty: null,
  admin: null,
  isLoading: false,
  error: null,

  reset: () =>
    set({
      student: null,
      faculty: null,
      admin: null,
      isLoading: false,
      error: null,
    }),

  fetchDashboard: async (role) => {
    const slot = { ADMIN: "admin", FACULTY: "faculty", USER: "student" }[role];
    const path = { admin: "/dashboard/admin", faculty: "/dashboard/faculty", student: "/dashboard/student" }[slot];

    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get(path);
      set({ [slot]: res.data.dashboard });
      return res.data.dashboard;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load dashboard");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },
}));
