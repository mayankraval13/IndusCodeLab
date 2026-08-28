import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || fallback;

/** The student's view of assigned work. Scoping happens entirely server-side. */
export const useAssignmentStore = create((set) => ({
  assignments: [],
  assignment: null,
  isLoading: false,
  error: null,

  fetchAssignments: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/assignments");
      set({ assignments: res.data.assignments ?? [] });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch assignments");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAssignment: async (id) => {
    try {
      set({ isLoading: true, error: null, assignment: null });
      const res = await axiosInstance.get(`/assignments/${id}`);
      set({ assignment: res.data.assignment });
      return res.data.assignment;
    } catch (error) {
      const message = getErrorMessage(error, "Assignment not found");
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
