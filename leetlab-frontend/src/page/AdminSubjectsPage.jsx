import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useSubjectStore } from "../store/useSubjectStore.js";
import Modal from "../components/ui/Modal.jsx";
import Logo from "../components/ui/Logo.jsx";
import { Link } from "react-router-dom";
import PageLoader from "../components/ui/PageLoader.jsx";

const subjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code is too long"),
});

const unitSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  order: z.coerce.number().int().min(0, "Order must be 0 or greater"),
});

export default function AdminSubjectsPage() {
  const {
    subjects,
    isLoading,
    error,
    fetchSubjects,
    createSubject,
    deleteSubject,
    createUnit,
    deleteUnit,
  } = useSubjectStore();

  const [expandedIds, setExpandedIds] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unitFormSubjectId, setUnitFormSubjectId] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const {
    register: registerSubject,
    handleSubmit: handleSubjectSubmit,
    formState: { errors: subjectErrors },
    reset: resetSubject,
  } = useForm({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "" },
  });

  const {
    register: registerUnit,
    handleSubmit: handleUnitSubmit,
    formState: { errors: unitErrors },
    reset: resetUnit,
  } = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: { title: "", order: 0 },
  });

  const sortedSubjects = useMemo(
    () =>
      [...(subjects || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || ""),
      ),
    [subjects],
  );

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onCreateSubject = async (data) => {
    await createSubject(data);
    resetSubject();
  };

  const onCreateUnit = async (data) => {
    if (!unitFormSubjectId) return;
    await createUnit(unitFormSubjectId, {
      title: data.title,
      order: data.order,
    });
    resetUnit();
    setExpandedIds((prev) => ({ ...prev, [unitFormSubjectId]: true }));
  };

  const openDelete = (target) => {
    setDeleteError(null);
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.kind === "subject") {
        await deleteSubject(deleteTarget.id);
      } else {
        await deleteUnit(deleteTarget.subjectId, deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Delete failed";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && subjects.length === 0) {
    return <PageLoader message="Loading subjects..." />;
  }

  return (
    <div className="min-h-screen bg-ll-bg">
      <div className="border-b border-ll-border bg-ll-surface/95">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/" className="text-sm text-ll-muted hover:text-ll-text">
            ← Back to problems
          </Link>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-ll-accent" />
            Subjects & Units
          </h1>
          <p className="text-ll-muted text-sm mt-1">
            Organize problems by subject and unit for courses and exams.
          </p>
        </div>

        {/* Create subject */}
        <div className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Add subject</h2>
          <form
            onSubmit={handleSubjectSubmit(onCreateSubject)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                className="ll-input w-full"
                placeholder="Data Structures"
                {...registerSubject("name")}
              />
              {subjectErrors.name && (
                <p className="text-ll-error text-xs mt-1">
                  {subjectErrors.name.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Code</label>
              <input
                className="ll-input w-full"
                placeholder="CS201"
                {...registerSubject("code")}
              />
              {subjectErrors.code && (
                <p className="text-ll-error text-xs mt-1">
                  {subjectErrors.code.message}
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="ll-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add subject
              </button>
            </div>
          </form>
        </div>

        {/* Subject list */}
        <div className="ll-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ll-border">
            <h2 className="text-lg font-semibold">
              All subjects ({sortedSubjects.length})
            </h2>
          </div>

          {sortedSubjects.length === 0 ? (
            <div className="p-10 text-center text-ll-muted text-sm">
              No subjects yet. Create one above.
            </div>
          ) : (
            <ul className="divide-y divide-ll-border">
              {sortedSubjects.map((subject) => {
                const expanded = !!expandedIds[subject.id];
                const units = [...(subject.units || [])].sort(
                  (a, b) => (a.order ?? 0) - (b.order ?? 0),
                );
                const showingUnitForm = unitFormSubjectId === subject.id;

                return (
                  <li key={subject.id}>
                    <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 hover:bg-ll-surface-2/50">
                      <button
                        type="button"
                        onClick={() => toggleExpand(subject.id)}
                        className="p-1.5 rounded-lg text-ll-muted hover:text-ll-text hover:bg-ll-surface-2"
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{subject.name}</p>
                        <p className="text-xs text-ll-muted">
                          {subject.code} · {units.length} unit
                          {units.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUnitFormSubjectId(
                            showingUnitForm ? null : subject.id,
                          );
                          setExpandedIds((prev) => ({
                            ...prev,
                            [subject.id]: true,
                          }));
                          resetUnit({ title: "", order: units.length });
                        }}
                        className="ll-btn-ghost text-sm flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Unit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openDelete({
                            kind: "subject",
                            id: subject.id,
                            label: subject.name,
                          })
                        }
                        className="p-2 rounded-lg text-ll-muted hover:text-ll-error hover:bg-ll-error/10"
                        title="Delete subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="bg-ll-bg/40 px-4 sm:px-5 pb-4 pl-12 sm:pl-14 space-y-3">
                        {showingUnitForm && (
                          <form
                            onSubmit={handleUnitSubmit(onCreateUnit)}
                            className="ll-panel rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
                          >
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1.5 text-ll-muted">
                                Unit title
                              </label>
                              <input
                                className="ll-input w-full"
                                placeholder="Arrays & Strings"
                                {...registerUnit("title")}
                              />
                              {unitErrors.title && (
                                <p className="text-ll-error text-xs mt-1">
                                  {unitErrors.title.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1.5 text-ll-muted">
                                Order
                              </label>
                              <input
                                type="number"
                                className="ll-input w-full"
                                {...registerUnit("order")}
                              />
                              {unitErrors.order && (
                                <p className="text-ll-error text-xs mt-1">
                                  {unitErrors.order.message}
                                </p>
                              )}
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                type="submit"
                                className="ll-btn-primary flex-1"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                className="ll-btn-ghost"
                                onClick={() => setUnitFormSubjectId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {units.length === 0 ? (
                          <p className="text-sm text-ll-muted py-2">
                            No units yet.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {units.map((unit) => (
                              <li
                                key={unit.id}
                                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 border border-ll-border bg-ll-surface"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {unit.title}
                                  </p>
                                  <p className="text-xs text-ll-muted">
                                    Order {unit.order}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDelete({
                                      kind: "unit",
                                      id: unit.id,
                                      subjectId: subject.id,
                                      label: unit.title,
                                    })
                                  }
                                  className="p-2 rounded-lg text-ll-muted hover:text-ll-error hover:bg-ll-error/10"
                                  title="Delete unit"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && !deleteTarget && (
          <p className="text-sm text-ll-error">{error}</p>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={
          deleteTarget?.kind === "subject" ? "Delete subject" : "Delete unit"
        }
      >
        <p className="text-sm text-ll-muted mb-4">
          Are you sure you want to delete{" "}
          <span className="text-ll-text font-medium">
            {deleteTarget?.label}
          </span>
          ? This cannot be undone.
        </p>
        {deleteError && (
          <p className="text-sm text-ll-error mb-4 p-3 rounded-lg bg-ll-error/10 border border-ll-error/30">
            {deleteError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            disabled={isDeleting}
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary !bg-ll-error !text-white"
            disabled={isDeleting}
            onClick={confirmDelete}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
