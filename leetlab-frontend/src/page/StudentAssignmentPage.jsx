import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Lock,
  TriangleAlert,
  User,
} from "lucide-react";
import { useAssignmentStore } from "../store/useAssignmentStore.js";
import { formatDate, formatDateTime, relativeDeadline } from "../lib/dates.js";
import DifficultyBadge from "../components/ui/DifficultyBadge.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

export default function StudentAssignmentPage() {
  const { id } = useParams();
  const { assignment, isLoading, error, fetchAssignment } =
    useAssignmentStore();

  useEffect(() => {
    fetchAssignment(id);
  }, [id, fetchAssignment]);

  if (isLoading) {
    return <PageLoader message="Loading assignment..." />;
  }

  if (error || !assignment) {
    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="font-medium">This assignment is not available to you</p>
        <p className="text-ll-muted text-sm mt-1">
          It may have been unpublished, or it belongs to another section.
        </p>
        <Link
          to="/assignments"
          className="ll-btn-primary inline-flex mt-6"
        >
          Back to assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        to="/assignments"
        className="text-sm text-ll-muted hover:text-ll-text"
      >
        ← All assignments
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          {assignment.isComplete && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-ll-success/10 text-ll-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </span>
          )}
          {assignment.isOverdue && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-ll-error/10 text-ll-error">
              <TriangleAlert className="w-3.5 h-3.5" />
              Overdue
            </span>
          )}
        </div>

        <p className="text-ll-muted text-sm mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{assignment.offering?.subject?.name}</span>
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {assignment.offering?.faculty?.name}
          </span>
          {assignment.dueAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Due {formatDateTime(assignment.dueAt)} ·{" "}
              {relativeDeadline(assignment.dueAt)}
            </span>
          )}
        </p>
      </div>

      {assignment.description && (
        <div className="ll-panel rounded-xl p-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {assignment.description}
          </p>
        </div>
      )}

      {assignment.isOpen === false ? (
        <div className="ll-panel rounded-xl p-10 text-center">
          <Lock className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
          <p className="font-medium">
            Opens {formatDate(assignment.publishAt)}
          </p>
          <p className="text-ll-muted text-sm mt-1">
            {assignment.problemCount} problem
            {assignment.problemCount === 1 ? "" : "s"} will appear here then.
          </p>
        </div>
      ) : (
        <>
          {assignment.acceptsSubmissions === false && (
            <div className="rounded-xl border border-ll-error/30 bg-ll-error/10 px-4 py-3">
              <p className="text-sm text-ll-error">
                The deadline has passed and this assignment does not accept late
                submissions. You can still open the problems, but Submit will be
                refused.
              </p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-ll-muted uppercase tracking-wide mb-3">
              Problems ({assignment.submittedCount}/{assignment.problemCount}{" "}
              submitted)
            </h2>

            <ul className="divide-y divide-ll-border rounded-xl border border-ll-border overflow-hidden">
              {assignment.problems.map((problem, index) => (
                <li key={problem.id} className="bg-ll-surface">
                  <Link
                    to={`/practical/${problem.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-ll-surface-2 transition-colors"
                  >
                    {problem.submitted ? (
                      <CheckCircle2 className="w-4 h-4 text-ll-success shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-ll-muted shrink-0" />
                    )}

                    <span className="text-xs text-ll-muted w-4 shrink-0">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{problem.title}</p>
                      <p className="text-xs text-ll-muted">
                        {problem.submitted
                          ? `Submitted ${formatDateTime(problem.lastSubmittedAt)}`
                          : problem.attempts > 0
                            ? `${problem.attempts} attempt${problem.attempts === 1 ? "" : "s"}, nothing recorded yet`
                            : "Not started"}
                      </p>
                    </div>

                    <DifficultyBadge difficulty={problem.difficulty} />
                    <ChevronRight className="w-4 h-4 text-ll-muted shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
