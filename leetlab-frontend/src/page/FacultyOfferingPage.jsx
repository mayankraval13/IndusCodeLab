import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useFacultyStore } from "../store/useFacultyStore.js";
import {
  formatDate,
  fromDateTimeLocalValue,
  relativeDeadline,
} from "../lib/dates.js";
import Modal from "../components/ui/Modal.jsx";
import Logo from "../components/ui/Logo.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const emptyDraft = {
  title: "",
  description: "",
  dueAt: "",
  allowLateSubmission: true,
  problemIds: [],
};

export default function FacultyOfferingPage() {
  const { offeringId } = useParams();
  const {
    offerings,
    assignments,
    assignableProblems,
    isLoading,
    isSaving,
    fetchMyOfferings,
    fetchAssignments,
    fetchAssignableProblems,
    createAssignment,
    publishAssignment,
    deleteAssignment,
  } = useFacultyStore();

  const [draft, setDraft] = useState(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  const [pendingPublish, setPendingPublish] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (offerings.length === 0) fetchMyOfferings();
  }, [offerings.length, fetchMyOfferings]);

  useEffect(() => {
    fetchAssignments(offeringId);
    fetchAssignableProblems(offeringId);
  }, [offeringId, fetchAssignments, fetchAssignableProblems]);

  const offering = offerings.find((o) => o.id === offeringId);

  const problemsByUnit = useMemo(() => {
    const groups = new Map();
    for (const problem of assignableProblems) {
      const key = problem.unit?.title ?? "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(problem);
    }
    return [...groups.entries()];
  }, [assignableProblems]);

  const toggleProblem = (problemId) =>
    setDraft((previous) => ({
      ...previous,
      problemIds: previous.problemIds.includes(problemId)
        ? previous.problemIds.filter((id) => id !== problemId)
        : [...previous.problemIds, problemId],
    }));

  const onCreate = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;

    await createAssignment({
      offeringId,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      dueAt: fromDateTimeLocalValue(draft.dueAt),
      allowLateSubmission: draft.allowLateSubmission,
      problemIds: draft.problemIds,
    });
    setDraft(emptyDraft);
    setShowForm(false);
  };

  const onPublish = async () => {
    await publishAssignment(pendingPublish.id);
    setPendingPublish(null);
  };

  const onDelete = async () => {
    await deleteAssignment(pendingDelete.id);
    setPendingDelete(null);
  };

  if (isLoading && assignments.length === 0 && !offering) {
    return <PageLoader message="Loading section..." />;
  }

  return (
    <div className="min-h-screen bg-ll-bg">
      <div className="border-b border-ll-border bg-ll-surface/95">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            to="/faculty/sections"
            className="text-sm text-ll-muted hover:text-ll-text"
          >
            ← All sections
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">
            {offering?.subject?.name ?? "Practicals"}
          </h1>
          <p className="text-ll-muted text-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Section {offering?.batch?.name} ·{" "}
              {offering?.batch?.memberCount ?? 0} students
            </span>
            {offering?.term && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" />
                {offering.term}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Practical assignments ({assignments.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="ll-btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New assignment
          </button>
        </div>

        {showForm && (
          <form onSubmit={onCreate} className="ll-panel rounded-xl p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  className="ll-input w-full"
                  placeholder="Practical 3 — Loops"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Due date (optional)
                </label>
                <input
                  type="datetime-local"
                  className="ll-input w-full"
                  value={draft.dueAt}
                  onChange={(e) =>
                    setDraft({ ...draft, dueAt: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Instructions (optional)
              </label>
              <textarea
                className="ll-input w-full min-h-[72px] resize-y"
                placeholder="What students should bring to the lab, how it will be checked…"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={draft.allowLateSubmission}
                onChange={(e) =>
                  setDraft({ ...draft, allowLateSubmission: e.target.checked })
                }
              />
              Accept submissions after the due date
            </label>

            <div>
              <p className="text-sm font-medium mb-2">
                Problems ({draft.problemIds.length} selected)
              </p>
              {assignableProblems.length === 0 ? (
                <p className="text-xs text-ll-muted">
                  This subject has no practical problems yet. An admin needs to
                  add them under the subject's units first.
                </p>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {problemsByUnit.map(([unitTitle, problems]) => (
                    <div key={unitTitle}>
                      <p className="text-[10px] uppercase tracking-wide text-ll-muted mb-1.5">
                        {unitTitle}
                      </p>
                      <div className="space-y-1">
                        {problems.map((problem) => (
                          <label
                            key={problem.id}
                            className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-lg hover:bg-ll-surface-2"
                          >
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={draft.problemIds.includes(problem.id)}
                              onChange={() => toggleProblem(problem.id)}
                            />
                            <span className="truncate">{problem.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ll-border">
              <button
                type="button"
                className="ll-btn-ghost"
                onClick={() => {
                  setDraft(emptyDraft);
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !draft.title.trim()}
                className="ll-btn-primary flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save as draft
              </button>
            </div>
          </form>
        )}

        {assignments.length === 0 ? (
          <div className="ll-panel rounded-xl p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
            <p className="font-medium">No assignments yet</p>
            <p className="text-ll-muted text-sm mt-1">
              Create a draft, add problems, then publish it to notify the
              section.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {assignments.map((assignment) => {
              const isDraft = assignment.status === "DRAFT";
              const opensLater =
                assignment.publishAt &&
                new Date(assignment.publishAt) > new Date();

              return (
                <li
                  key={assignment.id}
                  className="ll-panel rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {assignment.title}
                        </h3>
                        {isDraft ? (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-surface-2 text-ll-muted">
                            Draft
                          </span>
                        ) : opensLater ? (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            Opens {formatDate(assignment.publishAt)}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-success/10 text-ll-success">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ll-muted mt-1">
                        {assignment.problemCount ?? 0} problem
                        {assignment.problemCount === 1 ? "" : "s"}
                        {assignment.dueAt && (
                          <> · due {formatDate(assignment.dueAt)}</>
                        )}
                        {!assignment.allowLateSubmission && (
                          <> · no late submissions</>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isDraft ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPendingPublish(assignment)}
                            className="ll-btn-primary flex items-center gap-1.5 text-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(assignment)}
                            className="ll-btn-ghost text-ll-error p-2"
                            title="Delete draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/faculty/assignments/${assignment.id}`}
                          className="ll-btn-ghost flex items-center gap-1.5 text-sm whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Who submitted
                        </Link>
                      )}
                    </div>
                  </div>

                  {assignment.dueAt && !isDraft && (
                    <p className="text-xs text-ll-muted mt-2">
                      {relativeDeadline(assignment.dueAt)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={!!pendingPublish}
        onClose={() => setPendingPublish(null)}
        title="Publish to the section?"
      >
        <p className="text-sm text-ll-muted mb-4">
          Every student in Section {offering?.batch?.name} gets a notification,
          and the problems become visible immediately. After publishing you can
          still edit the title, instructions and due date, but not the problem
          list.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() => setPendingPublish(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            disabled={isSaving}
            onClick={onPublish}
          >
            Publish now
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this draft?"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">
            {pendingDelete?.title}
          </span>{" "}
          has not been published, so no student has seen it.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() => setPendingDelete(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary bg-ll-error hover:bg-ll-error"
            disabled={isSaving}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
