import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  SearchCheck,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import { useAdminStore } from "../store/useAdminStore.js";
import Modal from "../components/ui/Modal.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const batchSchema = z
  .object({
    name: z.string().trim().min(1, "Section name is required"),
    enrollmentPrefix: z
      .string()
      .trim()
      .min(2, "Prefix must be at least 2 characters"),
    serialStart: z.coerce.number().int().min(0, "Must be 0 or greater"),
    serialEnd: z.coerce.number().int().min(0, "Must be 0 or greater"),
  })
  .refine((data) => data.serialStart <= data.serialEnd, {
    path: ["serialEnd"],
    message: "End must not be lower than start",
  });

const padSerial = (value) => String(value).padStart(4, "0");

export default function AdminBatchesPage() {
  const {
    overview,
    batches,
    batchDetail,
    enrollPreview,
    isLoading,
    isSaving,
    isPreviewing,
    fetchOverview,
    fetchBatches,
    fetchBatch,
    searchStudents,
    clearBatchDetail,
    createBatch,
    deleteBatch,
    previewEnrollRange,
    dismissEnrollPreview,
    enrollRange,
    addBatchMember,
    removeBatchMember,
    createSectionStudent,
    importStudents,
  } = useAdminStore();

  const [expandedId, setExpandedId] = useState(null);
  const [range, setRange] = useState({ serialStart: "", serialEnd: "" });
  const [newMember, setNewMember] = useState("");
  const [newStudent, setNewStudent] = useState({ name: "", enrollmentNo: "" });
  const [studentMatches, setStudentMatches] = useState([]);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchBatches();
    fetchOverview();
  }, [fetchBatches, fetchOverview]);

  useEffect(() => {
    const query = newMember.trim();
    if (!expandedId || query.length < 2) {
      setStudentMatches([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const users = await searchStudents(query);
        if (!cancelled) setStudentMatches(users);
      } catch {
        if (!cancelled) setStudentMatches([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newMember, expandedId, searchStudents]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: "",
      enrollmentPrefix: "",
      serialStart: 1,
      serialEnd: 132,
    },
  });

  const refresh = async (batchId) => {
    await Promise.all([fetchBatches(), fetchOverview()]);
    if (batchId) await fetchBatch(batchId);
  };

  const toggleExpand = async (batch) => {
    dismissEnrollPreview();

    if (expandedId === batch.id) {
      setExpandedId(null);
      clearBatchDetail();
      return;
    }

    setExpandedId(batch.id);
    setNewMember("");
    setNewStudent({ name: "", enrollmentNo: "" });
    setStudentMatches([]);
    setPendingAdd(null);
    setRange({
      serialStart: String(batch.serialStart),
      serialEnd: String(batch.serialEnd),
    });
    await fetchBatch(batch.id);
  };

  const onCreate = async (data) => {
    await createBatch(data);
    reset({ name: "", enrollmentPrefix: data.enrollmentPrefix, serialStart: 1, serialEnd: 132 });
    fetchOverview();
  };

  const onPreview = async () => {
    await previewEnrollRange(expandedId, {
      serialStart: Number(range.serialStart),
      serialEnd: Number(range.serialEnd),
    });
  };

  const onConfirmEnroll = async () => {
    await enrollRange(expandedId, {
      serialStart: Number(range.serialStart),
      serialEnd: Number(range.serialEnd),
    });
    await refresh(expandedId);
  };

  const onAddMember = async (move = false, target = pendingAdd) => {
    const enrollmentNo = (target?.enrollmentNo ?? newMember).trim();
    const userId = target?.userId;
    if (!enrollmentNo && !userId) return;

    try {
      await addBatchMember(expandedId, {
        ...(userId ? { userId } : { enrollmentNo }),
        move,
      });
      setNewMember("");
      setStudentMatches([]);
      setPendingAdd(null);
      setTransferTarget(null);
      await refresh(expandedId);
      if (enrollPreview) {
        await previewEnrollRange(expandedId, {
          serialStart: Number(range.serialStart),
          serialEnd: Number(range.serialEnd),
        });
      }
    } catch (err) {
      const data = err.response?.data;
      // 409 carries the section the student is currently in, so we can offer
      // a transfer instead of just failing.
      if (err.response?.status === 409 && data?.currentBatch) {
        setPendingAdd({ enrollmentNo, userId, name: target?.name });
        setTransferTarget({
          enrollmentNo: enrollmentNo || target?.name,
          currentBatch: data.currentBatch,
        });
      } else {
        setTransferTarget(null);
      }
    }
  };

  const onCreateStudent = async (event) => {
    event.preventDefault();
    try {
      const result = await createSectionStudent(expandedId, {
        name: newStudent.name.trim(),
        enrollmentNo: newStudent.enrollmentNo.trim(),
      });
      setCredentials({
        name: result.student.name,
        enrollmentNo: result.student.enrollmentNo,
        temporaryPassword: result.temporaryPassword,
      });
      setNewStudent({ name: "", enrollmentNo: "" });
      await refresh(expandedId);
    } catch {
      // The store already surfaces the error.
    }
  };

  const onImportCsv = async (file) => {
    if (!file || !expandedId) return;
    try {
      const csv = await file.text();
      const result = await importStudents({ csv, batchId: expandedId });
      setImportResult(result);
      await refresh(expandedId);
    } catch {
      // The store already surfaces the error.
    }
  };

  const onRemoveMember = async (userId) => {
    await removeBatchMember(expandedId, userId);
    await refresh(expandedId);
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    try {
      await deleteBatch(deleteTarget.id);
      if (expandedId === deleteTarget.id) {
        setExpandedId(null);
        clearBatchDetail();
      }
      setDeleteTarget(null);
      fetchOverview();
    } catch (err) {
      setDeleteError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          "Delete failed"
      );
    }
  };

  if (isLoading && batches.length === 0) {
    return <PageLoader message="Loading sections..." />;
  }

  return (
    <>
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-ll-accent" />
            Sections & Enrollment
          </h1>
          <p className="text-ll-muted text-sm mt-1">
            Group students into sections by enrollment number range.
          </p>
        </div>

        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Students" value={overview.students} />
            <Stat label="Enrolled" value={overview.enrolledStudents} />
            <Stat
              label="Not in a section"
              value={overview.unenrolledStudents}
              warn={overview.unenrolledStudents > 0}
            />
            <Stat label="Sections" value={overview.batches} />
          </div>
        )}

        <div className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Add section</h2>
          <form
            onSubmit={handleSubmit(onCreate)}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            <FormField label="Section" error={errors.name?.message}>
              <input className="ll-input w-full" placeholder="A" {...register("name")} />
            </FormField>
            <FormField
              label="Enrollment prefix"
              error={errors.enrollmentPrefix?.message}
            >
              <input
                className="ll-input w-full uppercase"
                placeholder="IU234123"
                {...register("enrollmentPrefix")}
              />
            </FormField>
            <FormField label="From" error={errors.serialStart?.message}>
              <input
                type="number"
                className="ll-input w-full"
                {...register("serialStart")}
              />
            </FormField>
            <FormField label="To" error={errors.serialEnd?.message}>
              <input
                type="number"
                className="ll-input w-full"
                {...register("serialEnd")}
              />
            </FormField>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving}
                className="ll-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>
          </form>
        </div>

        <div className="ll-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ll-border">
            <h2 className="text-lg font-semibold">
              All sections ({batches.length})
            </h2>
          </div>

          {batches.length === 0 ? (
            <div className="p-10 text-center text-ll-muted text-sm">
              No sections yet. Create one above.
            </div>
          ) : (
            <ul className="divide-y divide-ll-border">
              {batches.map((batch) => {
                const expanded = expandedId === batch.id;

                return (
                  <li key={batch.id}>
                    <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 hover:bg-ll-surface-2/50">
                      <button
                        type="button"
                        onClick={() => toggleExpand(batch)}
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
                        <p className="font-medium truncate">
                          Section {batch.name}
                        </p>
                        <p className="text-xs text-ll-muted font-mono">
                          {batch.enrollmentPrefix}
                          {padSerial(batch.serialStart)} –{" "}
                          {batch.enrollmentPrefix}
                          {padSerial(batch.serialEnd)}
                        </p>
                      </div>
                      <span className="text-xs text-ll-muted whitespace-nowrap">
                        {batch.memberCount} student
                        {batch.memberCount !== 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(batch);
                        }}
                        className="p-2 rounded-lg text-ll-muted hover:text-ll-error hover:bg-ll-error/10"
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="bg-ll-bg/40 px-4 sm:px-5 pb-5 pl-12 sm:pl-14 space-y-4">
                        <div className="ll-panel rounded-lg p-4">
                          <h3 className="text-sm font-semibold mb-1">
                            Enroll by range
                          </h3>
                          <p className="text-xs text-ll-muted mb-3">
                            Preview first — this resolves every matching
                            enrollment number before anything is written.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1.5 text-ll-muted">
                                From serial
                              </label>
                              <input
                                type="number"
                                className="ll-input w-full"
                                value={range.serialStart}
                                onChange={(e) =>
                                  setRange((prev) => ({
                                    ...prev,
                                    serialStart: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1.5 text-ll-muted">
                                To serial
                              </label>
                              <input
                                type="number"
                                className="ll-input w-full"
                                value={range.serialEnd}
                                onChange={(e) =>
                                  setRange((prev) => ({
                                    ...prev,
                                    serialEnd: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={onPreview}
                                disabled={isPreviewing}
                                className="ll-btn-ghost w-full flex items-center justify-center gap-2 border border-ll-border !text-ll-text"
                              >
                                {isPreviewing ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <SearchCheck className="w-4 h-4" />
                                )}
                                Preview
                              </button>
                            </div>
                          </div>

                          {enrollPreview && (
                            <EnrollPreview
                              preview={enrollPreview}
                              isSaving={isSaving}
                              onConfirm={onConfirmEnroll}
                              onCancel={dismissEnrollPreview}
                              onAddSkipped={(student) =>
                                onAddMember(false, {
                                  userId: student.id,
                                  enrollmentNo: student.enrollmentNo,
                                  name: student.name,
                                })
                              }
                            />
                          )}
                        </div>

                        <div className="ll-panel rounded-lg p-4">
                          <h3 className="text-sm font-semibold mb-1">
                            Create student
                          </h3>
                          <p className="text-xs text-ll-muted mb-3">
                            Creates an account for this section. The student
                            signs in with the enrollment number, and that number
                            is also the temporary password. They must set a new
                            password on first login.
                          </p>
                          <form
                            onSubmit={onCreateStudent}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"
                          >
                            <input
                              className="ll-input w-full"
                              placeholder="Student name"
                              value={newStudent.name}
                              onChange={(event) =>
                                setNewStudent((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                            />
                            <input
                              className="ll-input w-full uppercase font-mono"
                              placeholder={`${batch.enrollmentPrefix}0001`}
                              value={newStudent.enrollmentNo}
                              onChange={(event) =>
                                setNewStudent((prev) => ({
                                  ...prev,
                                  enrollmentNo: event.target.value.toUpperCase(),
                                }))
                              }
                            />
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="ll-btn-primary flex items-center justify-center gap-2"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Create
                            </button>
                          </form>
                          <label className="mt-3 inline-flex items-center gap-2 text-xs text-ll-accent cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            Import CSV into this section
                            <input
                              type="file"
                              accept=".csv,text/csv"
                              className="hidden"
                              disabled={isSaving}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                onImportCsv(file);
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-ll-muted mt-1">
                            Columns: name, enrollment number. New accounts are
                            added to Section {batch.name}.
                          </p>
                        </div>

                        <div className="ll-panel rounded-lg p-4">
                          <h3 className="text-sm font-semibold mb-1">
                            Add an existing student
                          </h3>
                          <p className="text-xs text-ll-muted mb-3">
                            Search by name, email, or enrollment number, then
                            add them to this section.
                          </p>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted" />
                            <input
                              className="ll-input w-full pl-10"
                              placeholder="Search students"
                              value={newMember}
                              onChange={(e) => setNewMember(e.target.value)}
                            />
                          </div>
                          {studentMatches.length > 0 && (
                            <ul className="mt-3 divide-y divide-ll-border rounded-lg border border-ll-border">
                              {studentMatches.map((student) => {
                                const alreadyHere = batchDetail?.members?.some(
                                  (member) => member.id === student.id,
                                );
                                return (
                                  <li
                                    key={student.id}
                                    className="flex items-center gap-3 px-3 py-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm truncate">
                                        {student.name || "Unnamed"}
                                      </p>
                                      <p className="text-xs text-ll-muted truncate font-mono">
                                        {student.enrollmentNo} · {student.email}
                                      </p>
                                    </div>
                                    {student.provisionedByAdmin === false && (
                                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-medium/15 text-ll-medium shrink-0">
                                        Self-registered
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      disabled={isSaving || alreadyHere}
                                      onClick={() =>
                                        onAddMember(false, {
                                          userId: student.id,
                                          enrollmentNo: student.enrollmentNo,
                                          name: student.name,
                                        })
                                      }
                                      className="ll-btn-primary text-xs py-1.5 px-3 shrink-0"
                                    >
                                      {alreadyHere ? "In section" : "Add"}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {newMember.trim().length >= 2 &&
                            studentMatches.length === 0 && (
                              <p className="text-xs text-ll-muted mt-3">
                                No student matches that search.
                              </p>
                            )}
                        </div>

                        <MemberList
                          batch={batchDetail}
                          isLoading={isLoading}
                          isSaving={isSaving}
                          onRemove={onRemoveMember}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!credentials}
        onClose={() => setCredentials(null)}
        title="Student credentials"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">{credentials?.name}</span>{" "}
          signs in with the enrollment number. The temporary password is that
          same number, and they must choose a new password on first login.
        </p>
        <div className="ll-code-block mb-4 space-y-1">
          <p>
            <span className="text-ll-muted">Enrollment:</span>{" "}
            <span className="font-mono">{credentials?.enrollmentNo}</span>
          </p>
          <p>
            <span className="text-ll-muted">Temporary password:</span>{" "}
            <span className="font-mono">{credentials?.temporaryPassword}</span>
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() =>
              navigator.clipboard.writeText(
                `Enrollment: ${credentials.enrollmentNo}\nTemporary password: ${credentials.temporaryPassword}`,
              )
            }
          >
            Copy
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            onClick={() => setCredentials(null)}
          >
            Done
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!importResult}
        onClose={() => setImportResult(null)}
        title="Imported students"
        wide
      >
        <p className="text-sm text-ll-muted mb-3">
          {importResult?.createdCount ?? 0} created
          {importResult?.skippedCount
            ? `, ${importResult.skippedCount} skipped`
            : ""}
          . Each temporary password is the student's enrollment number.
        </p>
        {importResult?.created?.length > 0 && (
          <div className="max-h-64 overflow-auto rounded-lg border border-ll-border mb-3">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ll-surface-2 text-ll-muted">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2">Enrollment</th>
                  <th className="text-left font-medium px-3 py-2">Password</th>
                </tr>
              </thead>
              <tbody>
                {importResult.created.map((student) => (
                  <tr key={student.enrollmentNo} className="border-t border-ll-border">
                    <td className="px-3 py-2">{student.name}</td>
                    <td className="px-3 py-2 font-mono">{student.enrollmentNo}</td>
                    <td className="px-3 py-2 font-mono">{student.temporaryPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {importResult?.skipped?.length > 0 && (
          <ul className="text-xs text-ll-muted mb-3 space-y-1 max-h-32 overflow-auto">
            {importResult.skipped.map((row) => (
              <li key={`${row.line}-${row.enrollmentNo}`}>
                Line {row.line}
                {row.enrollmentNo ? ` (${row.enrollmentNo})` : ""}: {row.reason}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          {importResult?.created?.length > 0 && (
            <button
              type="button"
              className="ll-btn-ghost"
              onClick={() => downloadCredentials(importResult.created)}
            >
              Download CSV
            </button>
          )}
          <button
            type="button"
            className="ll-btn-primary"
            onClick={() => setImportResult(null)}
          >
            Done
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isSaving) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete section"
      >
        <p className="text-sm text-ll-muted mb-4">
          Delete{" "}
          <span className="text-ll-text font-medium">
            Section {deleteTarget?.name}
          </span>
          ? This cannot be undone.
          {deleteTarget?.offeringCount > 0 &&
            " Faculty allocations for this section, and the assignments under them, are removed with it."}
          {deleteTarget?.memberCount > 0 &&
            " Students still enrolled here have to be removed first."}
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
            disabled={isSaving}
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
            disabled={isSaving}
            onClick={confirmDelete}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title="Transfer student"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="font-mono text-ll-text">
            {transferTarget?.enrollmentNo}
          </span>{" "}
          is currently in{" "}
          <span className="text-ll-text font-medium">
            Section {transferTarget?.currentBatch?.name}
          </span>
          . Move them to this section instead?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            disabled={isSaving}
            onClick={() => setTransferTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            disabled={isSaving}
            onClick={() => onAddMember(true)}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Transfer"
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}

function EnrollPreview({ preview, isSaving, onConfirm, onCancel, onAddSkipped }) {
  const { summary, conflicts, toEnroll, skipped = [] } = preview;

  return (
    <div className="mt-4 pt-4 border-t border-ll-border space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <PreviewCount label="Matched" value={summary.matched} />
        <PreviewCount label="Already in" value={summary.alreadyMembers} />
        <PreviewCount
          label="Conflicts"
          value={summary.conflicts}
          warn={summary.conflicts > 0}
        />
        <PreviewCount
          label="Will enroll"
          value={summary.toEnroll}
          highlight={summary.toEnroll > 0}
        />
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg bg-ll-medium/10 border border-ll-medium/30 p-3">
          <p className="text-xs font-medium text-ll-medium flex items-center gap-1.5 mb-2">
            <TriangleAlert className="w-3.5 h-3.5" />
            Already in another section — these will be skipped
          </p>
          <ul className="text-xs text-ll-muted space-y-1 max-h-32 overflow-y-auto">
            {conflicts.map((student) => (
              <li key={student.id} className="font-mono">
                {student.enrollmentNo} → Section {student.currentBatch.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {toEnroll.length > 0 && (
        <ul className="text-xs text-ll-muted space-y-1 max-h-40 overflow-y-auto rounded-lg border border-ll-border p-3">
          {toEnroll.map((student) => (
            <li key={student.id}>
              <span className="font-mono text-ll-text">
                {student.enrollmentNo}
              </span>{" "}
              {student.name}
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <div className="rounded-lg bg-ll-medium/10 border border-ll-medium/30 p-3">
          <p className="text-xs font-medium text-ll-medium mb-2">
            Self-registered accounts in this range are not enrolled in bulk.
            Add them only after you recognise the account.
          </p>
          <ul className="space-y-2">
            {skipped.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-mono text-ll-text truncate">
                  {student.enrollmentNo} {student.name}
                </span>
                <button
                  type="button"
                  className="ll-btn-ghost text-xs shrink-0"
                  disabled={isSaving}
                  onClick={() => onAddSkipped?.(student)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="ll-btn-ghost" onClick={onCancel}>
          Dismiss
        </button>
        <button
          type="button"
          className="ll-btn-primary"
          disabled={isSaving || summary.toEnroll === 0}
          onClick={onConfirm}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Enroll ${summary.toEnroll} student${summary.toEnroll !== 1 ? "s" : ""}`
          )}
        </button>
      </div>
    </div>
  );
}

function downloadCredentials(students) {
  const lines = [
    "name,enrollment number,temporary password",
    ...students.map(
      (student) =>
        `${csvCell(student.name)},${csvCell(student.enrollmentNo)},${csvCell(student.temporaryPassword)}`,
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-credentials.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function MemberList({ batch, isLoading, isSaving, onRemove }) {
  if (isLoading && !batch) {
    return (
      <div className="ll-panel rounded-lg p-4 text-sm text-ll-muted flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading students...
      </div>
    );
  }

  const members = batch?.members ?? [];

  return (
    <div className="ll-panel rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ll-border">
        <h3 className="text-sm font-semibold">
          Enrolled students ({members.length})
        </h3>
      </div>

      {members.length === 0 ? (
        <p className="p-6 text-center text-sm text-ll-muted">
          Nobody enrolled yet.
        </p>
      ) : (
        <ul className="divide-y divide-ll-border">
          {members.map((student) => (
            <li
              key={student.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="font-mono text-xs text-ll-accent w-32 shrink-0">
                {student.enrollmentNo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{student.name}</p>
                <p className="text-xs text-ll-muted truncate">
                  {student.email?.endsWith("@students.leetlab.local")
                    ? "Signs in with enrollment number"
                    : student.email}
                </p>
              </div>
              {student.provisionedByAdmin === false && (
                <span
                  className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-error/10 text-ll-error whitespace-nowrap"
                  title="This account signed itself up rather than being created by the institution. Verify it belongs to this student."
                >
                  Self-registered
                </span>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onRemove(student.id)}
                className="p-2 rounded-lg text-ll-muted hover:text-ll-error hover:bg-ll-error/10"
                title="Remove from section"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="ll-panel rounded-lg p-4">
      <p className="text-xs text-ll-muted">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          warn ? "text-ll-medium" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PreviewCount({ label, value, warn, highlight }) {
  return (
    <div className="rounded-lg border border-ll-border py-2">
      <p className="text-xs text-ll-muted">{label}</p>
      <p
        className={`text-lg font-semibold ${
          warn ? "text-ll-medium" : highlight ? "text-ll-success" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {error && <p className="text-ll-error text-xs mt-1">{error}</p>}
    </div>
  );
}
