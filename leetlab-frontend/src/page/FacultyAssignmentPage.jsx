import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Circle, Clock, Users } from "lucide-react";
import { useFacultyStore } from "../store/useFacultyStore.js";
import { formatDate, formatDateTime } from "../lib/dates.js";
import Logo from "../components/ui/Logo.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

function Stat({ label, value, tone = "text-ll-text" }) {
  return (
    <div className="ll-panel rounded-xl p-4">
      <p className="text-xs text-ll-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

export default function FacultyAssignmentPage() {
  const { id } = useParams();
  const { roster, isLoading, fetchRoster } = useFacultyStore();

  useEffect(() => {
    fetchRoster(id);
  }, [id, fetchRoster]);

  if (isLoading || !roster) {
    return <PageLoader message="Loading roster..." />;
  }

  const { assignment, roster: rows, summary, problemCount } = roster;

  return (
    <div className="min-h-screen bg-ll-bg">
      <div className="border-b border-ll-border bg-ll-surface/95">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            to={`/faculty/offerings/${assignment.offeringId}`}
            className="text-sm text-ll-muted hover:text-ll-text"
          >
            ← Back to section
          </Link>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-ll-muted text-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Section {assignment.offering?.batch?.name}
            </span>
            <span>{problemCount} problem{problemCount === 1 ? "" : "s"}</span>
            {assignment.dueAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Due {formatDate(assignment.dueAt)}
              </span>
            )}
          </p>
          <p className="text-xs text-ll-muted mt-3 max-w-2xl">
            Submissions are recorded here so you know who to check. The code and
            output stay with the student — you verify the running program in the
            lab.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Students" value={summary.total} />
          <Stat label="Started" value={summary.submitted} />
          <Stat
            label="All problems done"
            value={summary.complete}
            tone="text-ll-success"
          />
          <Stat
            label="Late"
            value={summary.late}
            tone={summary.late > 0 ? "text-ll-error" : "text-ll-text"}
          />
        </div>

        <div className="ll-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ll-border">
            <h2 className="text-lg font-semibold">Section roster</h2>
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-ll-muted text-sm">
              This section has no students enrolled yet.
            </div>
          ) : (
            <ul className="divide-y divide-ll-border">
              {rows.map((row) => (
                <li
                  key={row.user.id}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3.5"
                >
                  {row.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-ll-success shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ll-muted shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {row.user.enrollmentNo ?? row.user.email}
                    </p>
                    <p className="text-xs text-ll-muted truncate">
                      {row.user.name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm">
                      {row.problemsSubmitted}/{problemCount}
                      <span className="text-ll-muted text-xs ml-1">done</span>
                    </p>
                    <p className="text-xs text-ll-muted">
                      {row.lastSubmittedAt
                        ? formatDateTime(row.lastSubmittedAt)
                        : "No submissions"}
                    </p>
                  </div>

                  {row.isLate && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-error/10 text-ll-error whitespace-nowrap">
                      Late
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
