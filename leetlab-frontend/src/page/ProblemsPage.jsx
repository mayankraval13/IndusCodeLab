import { useEffect } from "react";
import { Code2 } from "lucide-react";
import { useProblemStore } from "../store/useProblemStore.js";
import ProblemTable from "../components/ProblemTable.jsx";

export default function ProblemsPage() {
  const { problems, getSolvedProblemByUser } = useProblemStore();

  useEffect(() => {
    getSolvedProblemByUser();
  }, [getSolvedProblemByUser]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-ll-accent mb-2">
          <Code2 className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Problems
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Practice problems
        </h1>
        <p className="text-ll-muted mt-1 text-sm sm:text-base">
          Interview-style coding challenges. Search, filter by difficulty or
          tags.
        </p>
      </div>

      <ProblemTable problems={problems} fixedType="PRACTICE" />
    </div>
  );
}
