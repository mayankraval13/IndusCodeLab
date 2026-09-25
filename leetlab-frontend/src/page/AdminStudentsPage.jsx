import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, Loader2, Search, Upload, Users } from "lucide-react";
import { useAdminStore } from "../store/useAdminStore.js";
import Modal from "../components/ui/Modal.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const FILTERS = [
  { id: "all", label: "All students", enrolled: "", provisioned: "" },
  { id: "unenrolled", label: "Not in a section", enrolled: "false", provisioned: "" },
  { id: "self", label: "Self-registered", enrolled: "", provisioned: "false" },
];

export default function AdminStudentsPage() {
  const {
    students,
    studentsMeta,
    isLoading,
    isSaving,
    fetchStudents,
    resetUserPassword,
    importStudents,
  } = useAdminStore();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [credentials, setCredentials] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const enrolled = params.get("enrolled") ?? "";
  const provisioned = params.get("provisioned") ?? "";
  const page = Number(params.get("page") || 1);
  const q = params.get("q") ?? "";

  const activeFilter =
    FILTERS.find(
      (filter) => filter.enrolled === enrolled && filter.provisioned === provisioned,
    )?.id ?? "all";

  useEffect(() => {
    fetchStudents({
      q: q || undefined,
      page,
      ...(enrolled ? { enrolled } : {}),
      ...(provisioned ? { provisioned } : {}),
    });
  }, [fetchStudents, q, page, enrolled, provisioned]);

  const apply = (next) => {
    const merged = {
      q,
      enrolled,
      provisioned,
      ...next,
      page: next.page ?? "1",
    };
    const cleaned = {};
    if (merged.q) cleaned.q = merged.q;
    if (merged.enrolled) cleaned.enrolled = merged.enrolled;
    if (merged.provisioned) cleaned.provisioned = merged.provisioned;
    if (merged.page && String(merged.page) !== "1") cleaned.page = String(merged.page);
    setParams(cleaned);
  };

  const onSearch = (event) => {
    event.preventDefault();
    apply({ q: query.trim() });
  };

  const onImportCsv = async (file) => {
    if (!file) return;
    try {
      const csv = await file.text();
      const result = await importStudents({ csv });
      setImportResult(result);
      fetchStudents({
        q: q || undefined,
        page,
        ...(enrolled ? { enrolled } : {}),
        ...(provisioned ? { provisioned } : {}),
      });
    } catch {
      // The store already surfaces the error.
    }
  };

  const onReset = async () => {
    try {
      const result = await resetUserPassword(resetTarget.id);
      setResetTarget(null);
      setCredentials({
        name: result.user.name,
        email: result.user.email,
        enrollmentNo: result.user.enrollmentNo,
        temporaryPassword: result.temporaryPassword,
      });
    } catch {
      // The store already surfaces the error.
    }
  };

  if (isLoading && students.length === 0) {
    return <PageLoader message="Loading students..." />;
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-ll-accent" />
          Students
        </h1>
        <p className="text-ll-muted text-sm mt-1">
          Institution accounts and self-registrations. Bulk enrolment only picks
          up accounts the college created.
        </p>
      </div>

      <div className="ll-panel rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">Upload students</h2>
        <p className="text-sm text-ll-muted mb-4">
          CSV with a name and an enrollment number on each row. The temporary
          password is the enrollment number. They must set a new password on
          first login, and can then be enrolled from a section.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="ll-btn-primary inline-flex items-center gap-2 cursor-pointer">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Choose CSV
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
          <button
            type="button"
            className="ll-btn-ghost text-sm"
            onClick={downloadTemplate}
          >
            Download template
          </button>
        </div>
        <p className="text-xs text-ll-muted mt-3 font-mono">
          name,enrollment number
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() =>
              apply({ enrolled: filter.enrolled, provisioned: filter.provisioned })
            }
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              activeFilter === filter.id
                ? "border-ll-accent text-ll-text bg-ll-accent/10"
                : "border-ll-border text-ll-muted hover:text-ll-text"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted" />
          <input
            className="ll-input w-full pl-10"
            placeholder="Name, email, or enrollment number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="ll-btn-primary">
          Search
        </button>
      </form>

      <div className="ll-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-ll-border flex items-center justify-between">
          <h2 className="font-semibold">{studentsMeta.total} matching</h2>
          {enrolled === "false" && (
            <Link to="/admin/batches" className="text-xs text-ll-accent hover:underline">
              Enrol from a section
            </Link>
          )}
        </div>

        {students.length === 0 ? (
          <p className="p-10 text-center text-sm text-ll-muted">
            No students match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-ll-border">
            {students.map((student) => (
              <li
                key={student.id}
                className="px-4 sm:px-5 py-3.5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.name || "Unnamed"}</p>
                  <p className="text-xs text-ll-muted truncate">
                    <span className="font-mono">{student.enrollmentNo}</span>
                    {" · "}
                    {student.email?.endsWith("@students.leetlab.local")
                      ? "Signs in with enrollment number"
                      : student.email}
                  </p>
                  <p className="text-xs text-ll-muted mt-1">
                    {student.sections?.length
                      ? `Section ${student.sections.map((section) => section.name).join(", ")}`
                      : "Not in a section"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!student.provisionedByAdmin && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-medium/15 text-ll-medium">
                      Self-registered
                    </span>
                  )}
                  {student.mustChangePassword && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-surface-2 text-ll-muted">
                      Password pending
                    </span>
                  )}
                  <button
                    type="button"
                    className="ll-btn-ghost text-sm flex items-center gap-1.5"
                    onClick={() => setResetTarget(student)}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset password
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {studentsMeta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-ll-border flex items-center justify-between text-sm">
            <button
              type="button"
              className="ll-btn-ghost"
              disabled={page <= 1}
              onClick={() => apply({ page: String(page - 1) })}
            >
              Previous
            </button>
            <span className="text-ll-muted">
              Page {studentsMeta.page} of {studentsMeta.totalPages}
            </span>
            <button
              type="button"
              className="ll-btn-ghost"
              disabled={page >= studentsMeta.totalPages}
              onClick={() => apply({ page: String(page + 1) })}
            >
              Next
            </button>
          </div>
        )}
      </div>

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
          . The temporary password for each student is their enrollment
          number. They sign in with that number and must choose a new password.
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
        isOpen={!!resetTarget}
        onClose={() => !isSaving && setResetTarget(null)}
        title="Reset password?"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">{resetTarget?.name}</span>{" "}
          will be signed out of their current password and must set a new one
          on next login.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() => setResetTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            disabled={isSaving}
            onClick={onReset}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue password"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!credentials}
        onClose={() => setCredentials(null)}
        title="Temporary password"
      >
        <p className="text-sm text-ll-muted mb-4">
          Hand this to{" "}
          <span className="text-ll-text font-medium">{credentials?.name}</span>{" "}
          now. It is not stored and cannot be shown again.
        </p>
        <div className="ll-code-block mb-4 space-y-1">
          {credentials?.enrollmentNo && (
            <p>
              <span className="text-ll-muted">Enrollment:</span>{" "}
              {credentials.enrollmentNo}
            </p>
          )}
          <p>
            <span className="text-ll-muted">Email:</span> {credentials?.email}
          </p>
          <p>
            <span className="text-ll-muted">Password:</span>{" "}
            {credentials?.temporaryPassword}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="ll-btn-primary"
            onClick={() => setCredentials(null)}
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}

function downloadTemplate() {
  const blob = new Blob(
    ["name,enrollment number\nRam Patel,IU2341230201\n"],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-template.csv";
  link.click();
  URL.revokeObjectURL(url);
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
