import { create } from "zustand";
import { axiosInstance, setPasswordChangeRequiredHandler } from "../lib/axios";
import toast from "react-hot-toast";
import { useNotificationStore } from "./useNotificationStore.js";
import { useDashboardStore } from "./useDashboardStore.js";
import { useAdminStore } from "./useAdminStore.js";
import { useFacultyStore } from "./useFacultyStore.js";
import { useAssignmentStore } from "./useAssignmentStore.js";

const errorMessage = (error, fallback) =>
  error.response?.data?.error ?? error.response?.data?.message ?? fallback;

export const useAuthStore = create((set) => ({
  authUser: null,
  passwordChangeRequired: false,
  isSigninUp: false,
  isLoggingIn: false,
  isCheckingAuth: false,
  isChangingPassword: false,

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get("/auth/check");

      set({
        authUser: res.data.user,
        passwordChangeRequired: Boolean(res.data.user?.mustChangePassword),
      });
    } catch {
      set({ authUser: null, passwordChangeRequired: false });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigninUp: true });
    try {
      const res = await axiosInstance.post("/auth/register", data);

      set({
        authUser: res.data.user,
        passwordChangeRequired: Boolean(res.data.user?.mustChangePassword),
      });

      toast.success(res.data.message);
    } catch (error) {
      toast.error(errorMessage(error, "Error signing up"));
    } finally {
      set({ isSigninUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);

      set({
        authUser: res.data.user,
        passwordChangeRequired: Boolean(res.data.user?.mustChangePassword),
      });

      toast.success(res.data.message);
    } catch (error) {
      toast.error(errorMessage(error, "Error logging in"));
    } finally {
      set({ isLoggingIn: false });
    }
  },

  changePassword: async (data) => {
    set({ isChangingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/change-password", data);

      set({ authUser: res.data.user, passwordChangeRequired: false });

      toast.success(res.data.message);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Error changing password"));
      return false;
    } finally {
      set({ isChangingPassword: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null, passwordChangeRequired: false });
      // Otherwise the next account to sign in inherits this user's bell state.
      useNotificationStore.getState().reset();
      useDashboardStore.getState().reset();
      useAdminStore.getState().reset();
      useFacultyStore.getState().reset();
      useAssignmentStore.getState().reset();

      toast.success("Logout successful");
    } catch (error) {
      toast.error(errorMessage(error, "Error logging out"));
    }
  },
}));

// Backstop for the case where a request is rejected by the server-side gate
// before /auth/check has reported the flag.
setPasswordChangeRequiredHandler(() => {
  useAuthStore.setState({ passwordChangeRequired: true });
});
