import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || fallback;

export const useFacultyStore = create((set) => ({
  offerings: [],
  assignments: [],
  assignment: null,
  assignableProblems: [],
  roster: null,
  isLoading: false,
  isSaving: false,
  error: null,

  /** Server scopes this to the signed-in faculty member; no id is sent. */
  fetchMyOfferings: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/faculty/offerings");
      set({ offerings: res.data.offerings ?? [] });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch your sections");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAssignments: async (offeringId) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/faculty/assignments", {
        params: offeringId ? { offeringId } : undefined,
      });
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
      const res = await axiosInstance.get(`/faculty/assignments/${id}`);
      set({ assignment: res.data.assignment });
      return res.data.assignment;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch assignment");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAssignableProblems: async (offeringId) => {
    try {
      const res = await axiosInstance.get(
        `/faculty/offerings/${offeringId}/problems`,
      );
      set({ assignableProblems: res.data.problems ?? [] });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch problems");
      set({ error: message });
      toast.error(message);
    }
  },

  createAssignment: async (data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post("/faculty/assignments", data);
      set((state) => ({
        assignments: [res.data.assignment, ...state.assignments],
      }));
      toast.success("Draft saved");
      return res.data.assignment;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create assignment");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  updateAssignment: async (id, data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.patch(`/faculty/assignments/${id}`, data);
      set((state) => ({
        assignment: res.data.assignment,
        assignments: state.assignments.map((a) =>
          a.id === id ? { ...a, ...res.data.assignment } : a,
        ),
      }));
      toast.success("Assignment updated");
      return res.data.assignment;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update assignment");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  publishAssignment: async (id, publishAt) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post(
        `/faculty/assignments/${id}/publish`,
        publishAt ? { publishAt } : {},
      );
      set((state) => ({
        assignment: res.data.assignment,
        assignments: state.assignments.map((a) =>
          a.id === id ? { ...a, ...res.data.assignment } : a,
        ),
      }));
      toast.success(res.data.message);
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to publish assignment");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteAssignment: async (id) => {
    try {
      set({ isSaving: true, error: null });
      await axiosInstance.delete(`/faculty/assignments/${id}`);
      set((state) => ({
        assignments: state.assignments.filter((a) => a.id !== id),
      }));
      toast.success("Draft deleted");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete draft");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchRoster: async (id) => {
    try {
      set({ isLoading: true, error: null, roster: null });
      const res = await axiosInstance.get(`/faculty/assignments/${id}/roster`);
      set({ roster: res.data });
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch roster");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },
}));
