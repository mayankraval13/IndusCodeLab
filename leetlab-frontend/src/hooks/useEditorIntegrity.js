import { useCallback, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const FLUSH_INTERVAL_MS = 9000;
const RESTRICTED_TYPES = new Set(["PRACTICAL", "EXAM"]);

/**
 * Anti-cheat integrity for PRACTICAL / EXAM problems.
 * PRACTICE (and unknown/undefined type): no session, no listeners — unchanged editor behavior.
 *
 * EXAM-only: document.visibilitychange + window.blur are registered ONLY when
 * problemType === "EXAM". PRACTICAL never attaches those listeners (hard requirement).
 */
export function useEditorIntegrity({ problemId, problemType }) {
  const sessionIdRef = useRef(null);
  const eventQueueRef = useRef([]);
  const editorsRef = useRef(new Map());
  const flushingRef = useRef(false);

  const isRestricted = RESTRICTED_TYPES.has(problemType);
  const isExam = problemType === "EXAM";

  const badgeText = useMemo(() => {
    if (problemType === "EXAM") {
      return "Copy-paste disabled · Tab switches are monitored";
    }
    if (problemType === "PRACTICAL") {
      return "Copy-paste disabled";
    }
    return null;
  }, [problemType]);

  const queueEvent = useCallback((type, metadata = {}) => {
    eventQueueRef.current.push({
      type,
      metadata: { ...metadata, clientTimestamp: new Date().toISOString() },
    });
  }, []);

  const flushEvents = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    const batch = eventQueueRef.current;
    if (!sessionId || batch.length === 0 || flushingRef.current) return;

    flushingRef.current = true;
    eventQueueRef.current = [];
    try {
      await axiosInstance.post(`/code-sessions/${sessionId}/events`, {
        events: batch,
      });
    } catch (error) {
      // Re-queue on failure so a later flush can retry
      eventQueueRef.current = [...batch, ...eventQueueRef.current];
      console.error("Failed to flush proctor events:", error);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await flushEvents();
      await axiosInstance.put(`/code-sessions/${sessionId}/end`);
    } catch (error) {
      console.error("Failed to end code session:", error);
    } finally {
      sessionIdRef.current = null;
    }
  }, [flushEvents]);

  const detachEditor = useCallback((editor) => {
    const entry = editorsRef.current.get(editor);
    if (!entry) return;
    entry.pasteDisposable?.dispose?.();
    entry.disposeListener?.dispose?.();
    if (entry.domNode) {
      entry.domNode.removeEventListener("paste", entry.onPaste, true);
      entry.domNode.removeEventListener("copy", entry.onCopy, true);
    }
    editorsRef.current.delete(editor);
  }, []);

  const detachAllEditors = useCallback(() => {
    for (const editor of [...editorsRef.current.keys()]) {
      detachEditor(editor);
    }
  }, [detachEditor]);

  const registerEditor = useCallback(
    (editor) => {
      // PRACTICE / unknown: completely unchanged — no listeners, no side effects
      if (!isRestricted || !editor) return;
      if (editorsRef.current.has(editor)) return;

      const onDidPaste = () => {
        editor.trigger("keyboard", "undo", null);
        queueEvent("PASTE_BLOCKED", { source: "monaco-onDidPaste" });
        toast.error("Paste is disabled for this assessment");
      };

      const pasteDisposable = editor.onDidPaste(onDidPaste);

      const onPaste = (e) => {
        e.preventDefault();
        e.stopPropagation();
        queueEvent("PASTE_BLOCKED", { source: "dom-paste" });
        toast.error("Paste is disabled for this assessment");
      };

      const onCopy = (e) => {
        e.preventDefault();
        e.stopPropagation();
        queueEvent("COPY_BLOCKED", { source: "dom-copy" });
        toast.error("Copy is disabled for this assessment");
      };

      const domNode = editor.getDomNode();
      if (domNode) {
        domNode.addEventListener("paste", onPaste, true);
        domNode.addEventListener("copy", onCopy, true);
      }

      const disposeListener = editor.onDidDispose(() => {
        detachEditor(editor);
      });

      editorsRef.current.set(editor, {
        pasteDisposable,
        disposeListener,
        onPaste,
        onCopy,
        domNode,
      });
    },
    [detachEditor, isRestricted, queueEvent],
  );

  // Create session once when type is PRACTICAL or EXAM and problemId is known
  useEffect(() => {
    if (!problemId || !isRestricted) {
      return undefined;
    }

    let cancelled = false;

    const startSession = async () => {
      try {
        const res = await axiosInstance.post("/code-sessions", { problemId });
        if (cancelled) {
          // Component already torn down — end immediately
          const sid = res.data?.session?.id;
          if (sid) {
            await axiosInstance.put(`/code-sessions/${sid}/end`).catch(() => {});
          }
          return;
        }
        sessionIdRef.current = res.data.session.id;
      } catch (error) {
        console.error("Failed to create code session:", error);
        toast.error("Could not start integrity monitoring");
      }
    };

    startSession();

    return () => {
      cancelled = true;
      detachAllEditors();
      endSession();
      eventQueueRef.current = [];
    };
  }, [problemId, isRestricted, detachAllEditors, endSession]);

  // Periodic flush
  useEffect(() => {
    if (!isRestricted) return undefined;

    const timer = setInterval(() => {
      flushEvents();
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isRestricted, flushEvents]);

  // EXAM only: tab / window blur tracking
  // HARD REQUIREMENT — these listeners must NOT be registered for PRACTICAL.
  useEffect(() => {
    if (!isExam) {
      // Intentional no-op for PRACTICAL / PRACTICE: no visibility or blur listeners
      return undefined;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        queueEvent("TAB_SWITCH", { visibilityState: document.visibilityState });
        toast.error("Tab switch detected — this is monitored");
      }
    };

    const onWindowBlur = () => {
      // Ignore in-page focus moves (e.g. clicking Run); only count real window/tab leaves
      setTimeout(() => {
        if (!document.hasFocus()) {
          queueEvent("WINDOW_BLUR", {});
          toast.error("Window focus lost — this is monitored");
        }
      }, 0);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [isExam, queueEvent]);

  return { registerEditor, badgeText, isRestricted };
}
