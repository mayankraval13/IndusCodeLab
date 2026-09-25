import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  fallback;

export const useAdminStore = create((set) => ({
  overview: null,
  batches: [],
  batchDetail: null,
  faculty: [],
  offerings: [],
  /** Result of the last dry run, held until it is applied or dismissed. */
  enrollPreview: null,
  students: [],
  studentsMeta: { total: 0, page: 1, totalPages: 1 },
  isLoading: false,
  isSaving: false,
  isPreviewing: false,
  error: null,

  reset: () =>
    set({
      overview: null,
      batches: [],
      batchDetail: null,
      faculty: [],
      offerings: [],
      students: [],
      studentsMeta: { total: 0, page: 1, totalPages: 1 },
      enrollPreview: null,
      isLoading: false,
      isSaving: false,
      isPreviewing: false,
      error: null,
    }),

  fetchOverview: async () => {
    try {
      const res = await axiosInstance.get("/admin/overview");
      set({ overview: res.data.overview });
    } catch (error) {
      console.error("Error fetching overview:", error);
    }
  },

  fetchBatches: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/admin/batches");
      set({ batches: res.data.batches ?? [] });
    } catch (error) {
      console.error("Error fetching batches:", error);
      const message = getErrorMessage(error, "Failed to fetch batches");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBatch: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get(`/admin/batches/${id}`);
      set({ batchDetail: res.data.batch });
      return res.data.batch;
    } catch (error) {
      console.error("Error fetching batch:", error);
      const message = getErrorMessage(error, "Failed to fetch batch");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  clearBatchDetail: () => set({ batchDetail: null, enrollPreview: null }),

  createBatch: async (data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post("/admin/batches", data);
      const batch = {
        ...res.data.batch,
        memberCount: 0,
        offeringCount: 0,
      };
      set((state) => ({ batches: [...state.batches, batch] }));
      toast.success("Section created");
      return batch;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create section");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteBatch: async (id) => {
    try {
      set({ isSaving: true, error: null });
      await axiosInstance.delete(`/admin/batches/${id}`);
      set((state) => ({
        batches: state.batches.filter((b) => b.id !== id),
      }));
      toast.success("Section deleted");
    } catch (error) {
      // Surfaces the backend 409 when the section still has students
      const message = getErrorMessage(error, "Failed to delete section");
      set({ error: message });
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  previewEnrollRange: async (id, range) => {
    try {
      set({ isPreviewing: true, error: null, enrollPreview: null });
      const res = await axiosInstance.post(
        `/admin/batches/${id}/enroll-range`,
        { ...range, dryRun: true }
      );
      set({ enrollPreview: res.data });
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to preview enrollment");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isPreviewing: false });
    }
  },

  dismissEnrollPreview: () => set({ enrollPreview: null }),

  enrollRange: async (id, range) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post(
        `/admin/batches/${id}/enroll-range`,
        { ...range, dryRun: false }
      );
      toast.success(res.data.message);
      set({ enrollPreview: null });
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to enroll students");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  addBatchMember: async (id, payload) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post(
        `/admin/batches/${id}/members`,
        payload
      );
      toast.success(res.data.message);
      return res.data;
    } catch (error) {
      // 409 means the student is in another section and needs move: true
      const message = getErrorMessage(error, "Failed to enroll student");
      set({ error: message });
      if (error.response?.status !== 409) toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  removeBatchMember: async (id, userId) => {
    try {
      set({ isSaving: true, error: null });
      await axiosInstance.delete(`/admin/batches/${id}/members/${userId}`);
      toast.success("Student removed from section");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove student");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchFaculty: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/admin/users?role=FACULTY&limit=500");
      set({ faculty: res.data.users ?? [] });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch faculty");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  createFaculty: async (data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post("/admin/users/faculty", data);
      set((state) => ({ faculty: [...state.faculty, res.data.faculty] }));
      toast.success("Faculty account created");
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create faculty");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  createSectionStudent: async (batchId, data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post(
        `/admin/batches/${batchId}/students`,
        data,
      );
      toast.success("Student account created");
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create student");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  importStudents: async ({ csv, batchId }) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post("/admin/users/students/import", {
        csv,
        batchId,
      });
      const createdCount = res.data.createdCount ?? 0;
      const skippedCount = res.data.skippedCount ?? 0;
      if (createdCount > 0) {
        toast.success(
          `Created ${createdCount} student account${createdCount === 1 ? "" : "s"}`,
        );
      }
      if (skippedCount > 0) {
        toast(
          `${skippedCount} row${skippedCount === 1 ? "" : "s"} skipped`,
        );
      }
      if (createdCount === 0 && skippedCount === 0) {
        toast.error("No students were imported");
      }
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to import students");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchOfferings: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/admin/offerings");
      set({ offerings: res.data.offerings ?? [] });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch allocations");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  createOffering: async (data) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post("/admin/offerings", data);
      set((state) => ({ offerings: [res.data.offering, ...state.offerings] }));
      toast.success("Faculty allocated — they have been notified");
      return res.data.offering;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create allocation");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteOffering: async (id) => {
    try {
      set({ isSaving: true, error: null });
      await axiosInstance.delete(`/admin/offerings/${id}`);
      set((state) => ({
        offerings: state.offerings.filter((o) => o.id !== id),
      }));
      toast.success("Allocation removed");
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove allocation");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  searchStudents: async (q) => {
    const res = await axiosInstance.get("/admin/users", {
      params: { role: "USER", q, limit: 8 },
    });
    return res.data.users ?? [];
  },

  fetchStudents: async (query = {}) => {
    try {
      set({ isLoading: true, error: null });
      const res = await axiosInstance.get("/admin/users", {
        params: { role: "USER", limit: 25, ...query },
      });
      set({
        students: res.data.users ?? [],
        studentsMeta: {
          total: res.data.total ?? 0,
          page: res.data.page ?? 1,
          totalPages: res.data.totalPages ?? 1,
        },
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to fetch students");
      set({ error: message });
      toast.error(message);
    } finally {
      set({ isLoading: false });
    }
  },

  resetUserPassword: async (id) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.post(`/admin/users/${id}/reset-password`);
      toast.success("Temporary password issued");
      return res.data;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to reset password");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  updateUserRole: async (id, role) => {
    try {
      set({ isSaving: true, error: null });
      const res = await axiosInstance.patch(`/admin/users/${id}/role`, { role });
      toast.success(res.data.message);
      return res.data.user;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update role");
      set({ error: message });
      toast.error(message);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },
}));
