import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  fallback;

export const useSubjectStore = create((set, get) => ({
  subjects: [],
  isLoading: false,
  error: null,

  fetchSubjects: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/subjects");
      set({ subjects: res.data.subjects ?? [] });
    } catch (error) {
      console.error("Error fetching subjects:", error);
      const message = getErrorMessage(error, "Failed to fetch subjects");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  createSubject: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.post("/subjects", data);
      const subject = { ...res.data.subject, units: res.data.subject.units ?? [] };
      set((state) => ({
        subjects: [...state.subjects, subject],
      }));
      toast.success("Subject created successfully");
      return subject;
    } catch (error) {
      console.error("Error creating subject:", error);
      const message = getErrorMessage(error, "Failed to create subject");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateSubject: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.put(`/subjects/${id}`, data);
      const updated = res.data.subject;
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === id ? { ...s, ...updated, units: s.units } : s,
        ),
      }));
      toast.success("Subject updated successfully");
      return updated;
    } catch (error) {
      console.error("Error updating subject:", error);
      const message = getErrorMessage(error, "Failed to update subject");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteSubject: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await axiosInstance.delete(`/subjects/${id}`);
      set((state) => ({
        subjects: state.subjects.filter((s) => s.id !== id),
      }));
      toast.success("Subject deleted successfully");
    } catch (error) {
      console.error("Error deleting subject:", error);
      // Surfaces backend 409 when units still have problems attached
      const message = getErrorMessage(error, "Failed to delete subject");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createUnit: async (subjectId, data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.post(
        `/subjects/${subjectId}/units`,
        data,
      );
      const unit = res.data.unit;
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === subjectId
            ? { ...s, units: [...(s.units ?? []), unit] }
            : s,
        ),
      }));
      toast.success("Unit created successfully");
      return unit;
    } catch (error) {
      console.error("Error creating unit:", error);
      const message = getErrorMessage(error, "Failed to create unit");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateUnit: async (subjectId, unitId, data) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.put(
        `/subjects/${subjectId}/units/${unitId}`,
        data,
      );
      const updated = res.data.unit;
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: (s.units ?? []).map((u) =>
                  u.id === unitId ? { ...u, ...updated } : u,
                ),
              }
            : s,
        ),
      }));
      toast.success("Unit updated successfully");
      return updated;
    } catch (error) {
      console.error("Error updating unit:", error);
      const message = getErrorMessage(error, "Failed to update unit");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteUnit: async (subjectId, unitId) => {
    try {
      set({ isLoading: true, error: null });
      await axiosInstance.delete(`/subjects/${subjectId}/units/${unitId}`);
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                units: (s.units ?? []).filter((u) => u.id !== unitId),
              }
            : s,
        ),
      }));
      toast.success("Unit deleted successfully");
    } catch (error) {
      console.error("Error deleting unit:", error);
      // Surfaces backend 409 when unit still has problems attached
      const message = getErrorMessage(error, "Failed to delete unit");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
