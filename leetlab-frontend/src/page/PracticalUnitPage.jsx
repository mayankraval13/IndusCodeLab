import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Beaker } from "lucide-react";
import { useProblemStore } from "../store/useProblemStore.js";
import { useSubjectStore } from "../store/useSubjectStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import PageLoader from "../components/ui/PageLoader.jsx";
import DifficultyBadge from "../components/ui/DifficultyBadge.jsx";

export default function PracticalUnitPage() {
  const { subjectId, unitId } = useParams();
  const { authUser } = useAuthStore();
  const { subjects, fetchSubjects, isLoading: subjectsLoading } =
    useSubjectStore();
  const { problems, isProblemsLoading, getAllProblems } = useProblemStore();

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (unitId) {
      getAllProblems({ unitId, type: "PRACTICAL" });
    }
  }, [unitId, getAllProblems]);

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId],
  );

  const unit = useMemo(
    () => subject?.units?.find((u) => u.id === unitId),
    [subject, unitId],
  );

  if ((subjectsLoading && !subject) || (isProblemsLoading && problems.length === 0)) {
    return <PageLoader message="Loading practical..." />;
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/practicals"
        className="inline-flex items-center gap-1.5 text-sm text-ll-muted hover:text-ll-text mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All practicals
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-ll-easy mb-2">
          <Beaker className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {subject?.code || "Practical"}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {unit?.title || "Unit"}
        </h1>
        <p className="text-ll-muted text-sm mt-1">
          {subject?.name} · Practical problems
        </p>
      </div>

      <div className="ll-panel rounded-xl overflow-hidden">
        {problems.length === 0 ? (
          <div className="p-12 text-center text-ll-muted text-sm">
            No practical problems in this unit yet.
          </div>
        ) : (
          <ul className="divide-y divide-ll-border">
            {problems.map((problem, idx) => {
              const isSolved = problem.solvedBy?.some(
                (u) => u.userId === authUser?.id,
              );
              return (
                <li key={problem.id}>
                  <Link
                    to={`/practicals/${subjectId}/units/${unitId}/problems/${problem.id}`}
                    className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-ll-surface-2 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSolved
                          ? "bg-ll-success/20 text-ll-success"
                          : "bg-ll-surface-2 text-ll-muted border border-ll-border"
                      }`}
                    >
                      {isSolved ? "✓" : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate hover:text-ll-accent">
                        {problem.title}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(problem.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-xs bg-ll-bg text-ll-muted border border-ll-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
