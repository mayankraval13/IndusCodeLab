import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Beaker,
  BookOpen,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useSubjectStore } from "../store/useSubjectStore.js";
import PageLoader from "../components/ui/PageLoader.jsx";

export default function PracticalsPage() {
  const { subjects, isLoading, fetchSubjects } = useSubjectStore();
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const sortedSubjects = useMemo(
    () =>
      [...(subjects || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || ""),
      ),
    [subjects],
  );

  const selectedSubject = useMemo(
    () => sortedSubjects.find((s) => s.id === selectedSubjectId) ?? null,
    [sortedSubjects, selectedSubjectId],
  );

  const units = useMemo(
    () =>
      [...(selectedSubject?.units || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [selectedSubject],
  );

  if (isLoading && subjects.length === 0) {
    return <PageLoader message="Loading practicals..." />;
  }

  // Subject selected → show practicals list only
  if (selectedSubject) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={() => setSelectedSubjectId(null)}
          className="inline-flex items-center gap-1.5 text-sm text-ll-muted hover:text-ll-text mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All subjects
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-ll-easy mb-2">
            <Beaker className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">
              {selectedSubject.code}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {selectedSubject.name}
          </h1>
          <p className="text-ll-muted mt-1 text-sm">
            Choose a practical unit to start.
          </p>
        </div>

        {units.length === 0 ? (
          <div className="ll-panel rounded-xl p-10 text-center text-ll-muted text-sm">
            No practicals in this subject yet.
          </div>
        ) : (
          <div className="ll-panel rounded-xl overflow-hidden divide-y divide-ll-border">
            {units.map((unit, index) => (
              <Link
                key={unit.id}
                to={`/practicals/${selectedSubject.id}/units/${unit.id}`}
                className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-ll-surface-2 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-ll-surface-2 border border-ll-border flex items-center justify-center text-sm font-semibold text-ll-muted group-hover:text-ll-accent group-hover:border-ll-accent/40">
                  {unit.order || index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-ll-accent transition-colors">
                    {unit.title}
                  </p>
                  <p className="text-xs text-ll-muted flex items-center gap-1.5 mt-0.5">
                    <Layers className="w-3 h-3" />
                    Practical
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-ll-muted group-hover:text-ll-accent shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default → subjects grid only
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-ll-easy mb-2">
          <Beaker className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Practicals
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Course practicals
        </h1>
        <p className="text-ll-muted mt-1 text-sm sm:text-base">
          Select a subject to view its practicals.
        </p>
      </div>

      {sortedSubjects.length === 0 ? (
        <div className="ll-panel rounded-xl p-10 text-center text-ll-muted text-sm">
          No subjects published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedSubjects.map((subject) => {
            const unitCount = subject.units?.length ?? 0;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className="ll-panel rounded-xl p-5 text-left transition-colors hover:border-ll-border-light group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-ll-surface-2 text-ll-muted group-hover:bg-ll-easy/15 group-hover:text-ll-easy transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono text-ll-muted">
                    {subject.code}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{subject.name}</h3>
                <p className="text-xs text-ll-muted">
                  {unitCount} practical{unitCount !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
