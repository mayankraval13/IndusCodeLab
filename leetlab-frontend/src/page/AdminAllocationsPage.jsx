import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, Network, Plus, Trash2, Users } from "lucide-react";
import { useAdminStore } from "../store/useAdminStore.js";
import { useSubjectStore } from "../store/useSubjectStore.js";
import Modal from "../components/ui/Modal.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

/** Mirrors the backend fallback so the prefilled term matches what it would pick. */
const currentTerm = () => {
  const now = new Date();
  return now.getMonth() >= 6
    ? `${now.getFullYear()}-ODD`
    : `${now.getFullYear()}-EVEN`;
};

const emptyForm = { facultyId: "", batchId: "", subjectId: "" };

export default function AdminAllocationsPage() {
  const {
    offerings,
    batches,
    faculty,
    isSaving,
    fetchOfferings,
    fetchBatches,
    fetchFaculty,
    createOffering,
    deleteOffering,
  } = useAdminStore();
  const { subjects, fetchSubjects } = useSubjectStore();

  const [form, setForm] = useState(emptyForm);
  const [term, setTerm] = useState(currentTerm);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchOfferings(),
      fetchBatches(),
      fetchFaculty(),
      fetchSubjects(),
    ]).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchOfferings, fetchBatches, fetchFaculty, fetchSubjects]);

  const terms = useMemo(() => {
    const unique = new Set(offerings.map((offering) => offering.term));
    return [...unique].sort().reverse();
  }, [offerings]);

  const grouped = useMemo(
    () =>
      terms.map((value) => ({
        term: value,
        rows: offerings.filter((offering) => offering.term === value),
      })),
    [terms, offerings],
  );

  const canSubmit =
    form.facultyId && form.batchId && form.subjectId && term.trim();

  const onCreate = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    await createOffering({ ...form, term: term.trim() });
    setForm(emptyForm);
  };

  const onDelete = async () => {
    await deleteOffering(pendingDelete.id);
    setPendingDelete(null);
  };

  const setField = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  if (!ready) {
    return <PageLoader message="Loading allocations..." />;
  }

  return (
    <>
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-ll-accent" />
            Faculty allocations
          </h1>
          <p className="text-ll-muted text-sm mt-1">
            Give a faculty member one subject for one section. Only then can
            they publish practicals to those students — and they get a
            notification the moment you save.
          </p>
        </div>

        <div className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">New allocation</h2>

          {(faculty.length === 0 ||
            batches.length === 0 ||
            subjects.length === 0) && (
            <div className="mb-4 text-sm text-ll-muted space-y-1">
              {faculty.length === 0 && (
                <p>
                  No faculty accounts yet —{" "}
                  <Link
                    to="/admin/faculty"
                    className="text-ll-accent hover:underline"
                  >
                    create one
                  </Link>
                  .
                </p>
              )}
              {batches.length === 0 && (
                <p>
                  No sections yet —{" "}
                  <Link
                    to="/admin/batches"
                    className="text-ll-accent hover:underline"
                  >
                    create one
                  </Link>
                  .
                </p>
              )}
              {subjects.length === 0 && (
                <p>
                  No subjects yet —{" "}
                  <Link
                    to="/admin/subjects"
                    className="text-ll-accent hover:underline"
                  >
                    create one
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          <form
            onSubmit={onCreate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Faculty
              </label>
              <select
                className="ll-input w-full"
                value={form.facultyId}
                onChange={setField("facultyId")}
              >
                <option value="">Select faculty</option>
                {faculty.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Section
              </label>
              <select
                className="ll-input w-full"
                value={form.batchId}
                onChange={setField("batchId")}
              >
                <option value="">Select section</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.memberCount ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Subject
              </label>
              <select
                className="ll-input w-full"
                value={form.subjectId}
                onChange={setField("subjectId")}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Term</label>
              <input
                className="ll-input w-full"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="2026-ODD"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving || !canSubmit}
                className="ll-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Allocate
              </button>
            </div>
          </form>
        </div>

        {offerings.length === 0 ? (
          <div className="ll-panel rounded-xl p-10 text-center">
            <Network className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
            <p className="text-ll-muted text-sm">
              No allocations yet. Students will not see any practicals until a
              faculty member is allocated to their section.
            </p>
          </div>
        ) : (
          grouped.map(({ term: groupTerm, rows }) => (
            <div key={groupTerm} className="ll-panel rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-ll-border flex items-center justify-between">
                <h2 className="text-lg font-semibold">{groupTerm}</h2>
                <span className="text-xs text-ll-muted">
                  {rows.length} allocation{rows.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="divide-y divide-ll-border">
                {rows.map((offering) => (
                  <li
                    key={offering.id}
                    className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {offering.faculty?.name}
                      </p>
                      <p className="text-xs text-ll-muted truncate">
                        {offering.faculty?.email}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-ll-muted min-w-0">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {offering.subject?.code} — {offering.subject?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-ll-muted whitespace-nowrap">
                      <Users className="w-3.5 h-3.5" />
                      Section {offering.batch?.name}
                      <span className="text-xs">
                        ({offering.batch?.memberCount ?? 0})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingDelete(offering)}
                      className="ll-btn-ghost text-ll-error p-2"
                      title="Remove allocation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Remove allocation?"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">
            {pendingDelete?.faculty?.name}
          </span>{" "}
          will lose access to {pendingDelete?.subject?.name} for Section{" "}
          {pendingDelete?.batch?.name}. Assignments already published under this
          allocation are removed with it.
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
            Remove
          </button>
        </div>
      </Modal>
    </>
  );
}
