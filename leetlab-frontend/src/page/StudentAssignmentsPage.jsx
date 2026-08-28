import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { useAssignmentStore } from "../store/useAssignmentStore.js";
import { formatDate, relativeDeadline } from "../lib/dates.js";
import PageLoader from "../components/ui/PageLoader.jsx";

export default function StudentAssignmentsPage() {
  const { assignments, isLoading, fetchAssignments } = useAssignmentStore();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  if (isLoading && assignments.length === 0) {
    return <PageLoader message="Loading your assignments..." />;
  }

  const pending = assignments.filter((a) => !a.isComplete);
  const done = assignments.filter((a) => a.isComplete);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-ll-accent" />
          Assigned practicals
        </h1>
        <p className="text-ll-muted text-sm mt-1">
          Work your faculty has set for your section. Run your code, then submit
          it so your submission is on record.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="ll-panel rounded-xl p-10 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
          <p className="font-medium">Nothing assigned yet</p>
          <p className="text-ll-muted text-sm mt-1 max-w-md mx-auto">
            Once a faculty member is allocated to your section and publishes a
            practical, it will appear here. In the meantime you can work through
            the{" "}
            <Link to="/practicals" className="text-ll-accent hover:underline">
              practice problems
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <Section title="To do" assignments={pending} emptyText="All caught up." />
          {done.length > 0 && <Section title="Completed" assignments={done} />}
        </>
      )}
    </div>
  );
}

function Section({ title, assignments, emptyText }) {
  if (assignments.length === 0 && !emptyText) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-ll-muted uppercase tracking-wide mb-3">
        {title} ({assignments.length})
      </h2>

      {assignments.length === 0 ? (
        <p className="text-sm text-ll-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <Link
                to={`/assignments/${assignment.id}`}
                className="ll-panel rounded-xl p-4 sm:p-5 block hover:border-ll-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">
                        {assignment.title}
                      </h3>
                      {assignment.isComplete && (
                        <CheckCircle2 className="w-4 h-4 text-ll-success shrink-0" />
                      )}
                      {!assignment.isOpen && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                          <Lock className="w-3 h-3" />
                          Opens {formatDate(assignment.publishAt)}
                        </span>
                      )}
                      {assignment.isOverdue && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-error/10 text-ll-error">
                          <TriangleAlert className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ll-muted mt-1">
                      {assignment.offering?.subject?.name} ·{" "}
                      {assignment.offering?.faculty?.name}
                    </p>
                    {assignment.dueAt && (
                      <p className="text-xs text-ll-muted mt-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Due {formatDate(assignment.dueAt)} ·{" "}
                        {relativeDeadline(assignment.dueAt)}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold">
                      {assignment.submittedCount}
                      <span className="text-ll-muted text-sm">
                        /{assignment.problemCount}
                      </span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-ll-muted">
                      submitted
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
