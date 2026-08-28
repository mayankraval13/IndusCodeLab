import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useExecutionStore = create((set) => ({
  isExecuting: false,
  isSubmitting: false,
  submission: null,
  runResult: null,
  runError: null,

  executeCode: async (
    source_code,
    language_id,
    stdin,
    expected_outputs,
    problemId
  ) => {
    try {
      set({ isExecuting: true, runResult: null, runError: null });
      console.log(
        "Submission:",
        JSON.stringify({
          source_code,
          language_id,
          stdin,
          expected_outputs,
          problemId,
        })
      );
      const res = await axiosInstance.post("/execute-code", {
        source_code,
        language_id,
        stdin,
        expected_outputs,
        problemId,
      });

      set({ submission: res.data.submission });

      toast.success(res.data.message);
    } catch (error) {
      console.log("Error executing code", error);
      toast.error("Error executing code");
    } finally {
      set({ isExecuting: false });
    }
  },

  runCode: async ({ problemId, code, language, stdin }) => {
    try {
      set({
        isExecuting: true,
        runResult: null,
        runError: null,
        submission: null,
      });
      const res = await axiosInstance.post("/execute/run", {
        problemId,
        code,
        language,
        stdin: stdin ?? "",
      });
      set({ runResult: res.data, runError: null });
    } catch (error) {
      console.log("Error running code", error);
      set({
        runResult: null,
        runError: error.response?.data?.error || "request_failed",
      });
      toast.error(error.response?.data?.error || "Error running code");
    } finally {
      set({ isExecuting: false });
    }
  },

  /**
   * Practicals are ungraded, so this records the attempt instead of judging it.
   * Kept on its own flag so submitting never disables the Run button.
   */
  submitPractical: async ({ problemId, code, language, stdin }) => {
    try {
      set({ isSubmitting: true });
      const res = await axiosInstance.post("/execute/submit", {
        problemId,
        code,
        language,
        stdin: stdin ?? "",
      });

      if (res.data.ran) {
        toast.success(res.data.message);
      } else {
        // Saved, but there is no usable output for faculty to check.
        toast.error(res.data.message);
      }

      return res.data;
    } catch (error) {
      console.log("Error submitting practical", error);
      toast.error(
        error.response?.data?.error || "Error submitting practical",
      );
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  clearRunResult: () => set({ runResult: null, runError: null }),
}));
