import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useActions } from "../store/useAction.js";
import { useProblemStore } from "../store/useProblemStore.js";
import { useSubjectStore } from "../store/useSubjectStore.js";
import AddToPlaylistModal from "./AddToPlaylist.jsx";
import CreatePlaylistModal from "./CreatePlaylistModal.jsx";
import { usePlaylistStore } from "../store/usePlaylistStore.js";
import DifficultyBadge from "./ui/DifficultyBadge.jsx";

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PRACTICE", label: "Practice" },
  { value: "PRACTICAL", label: "Practical" },
  { value: "EXAM", label: "Exam" },
];

export default function ProblemTable({ problems, fixedType = null }) {
  const { authUser } = useAuthStore();
  const { onDeleteProblem } = useActions();
  const { createPlaylist } = usePlaylistStore();
  const { getAllProblems } = useProblemStore();
  const { subjects, fetchSubjects } = useSubjectStore();

  const showSubjectFilters = !fixedType;

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("ALL");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [type, setType] = useState(fixedType || "ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(null);

  useEffect(() => {
    if (showSubjectFilters) fetchSubjects();
  }, [fetchSubjects, showSubjectFilters]);

  useEffect(() => {
    setUnitId("");
  }, [subjectId]);

  useEffect(() => {
    if (fixedType) setType(fixedType);
  }, [fixedType]);

  useEffect(() => {
    const filters = {};
    if (showSubjectFilters && subjectId) filters.subjectId = subjectId;
    if (showSubjectFilters && unitId) filters.unitId = unitId;
    const effectiveType = fixedType || type;
    if (effectiveType && effectiveType !== "ALL") {
      filters.type = effectiveType;
    }
    getAllProblems(filters);
    setCurrentPage(1);
  }, [subjectId, unitId, type, fixedType, showSubjectFilters, getAllProblems]);

  const unitOptions = useMemo(() => {
    const subject = subjects.find((s) => s.id === subjectId);
    return [...(subject?.units || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }, [subjects, subjectId]);

  const allTags = useMemo(() => {
    const tagsSet = new Set();
    (problems || []).forEach((p) => p.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return (problems || [])
      .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => (difficulty === "ALL" ? true : p.difficulty === difficulty))
      .filter((p) => (selectedTag === "ALL" ? true : p.tags?.includes(selectedTag)));
  }, [problems, search, difficulty, selectedTag]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));
  const paginatedProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="ll-panel rounded-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-ll-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Problem Set</h2>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="ll-btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>

      {!fixedType && (
        <div className="px-4 sm:px-5 py-3 border-b border-ll-border flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                type === t.value
                  ? "bg-ll-accent/15 text-ll-accent border-ll-accent/40"
                  : "bg-ll-surface-2 text-ll-muted border-ll-border hover:text-ll-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-5 py-4 border-b border-ll-border flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ll-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search problems..."
            className="ll-input w-full pl-11 pr-3.5"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        {showSubjectFilters && (
          <>
            <select
              className="ll-input lg:w-48"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="ll-input lg:w-48"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!subjectId}
            >
              <option value="">
                {subjectId ? "All units" : "Select subject first"}
              </option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </>
        )}
        <select
          className="ll-input lg:w-40"
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          className="ll-input lg:w-44"
          value={selectedTag}
          onChange={(e) => {
            setSelectedTag(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ll-muted text-xs uppercase tracking-wider border-b border-ll-border">
              <th className="px-4 py-3 w-12 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Tags</th>
              <th className="px-4 py-3 w-24 font-medium">Difficulty</th>
              <th className="px-4 py-3 w-32 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProblems.length > 0 ? (
              paginatedProblems.map((problem, idx) => {
                const isSolved = problem.solvedBy?.some(
                  (u) => u.userId === authUser?.id
                );
                return (
                  <tr
                    key={problem.id}
                    className="ll-table-row border-b border-ll-border/60 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSolved
                            ? "bg-ll-success/20 text-ll-success"
                            : "bg-ll-surface-2 text-ll-muted border border-ll-border"
                        }`}
                      >
                        {isSolved ? "✓" : (currentPage - 1) * itemsPerPage + idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/problem/${problem.id}`}
                        className="font-medium text-ll-text hover:text-ll-accent transition-colors"
                      >
                        {problem.title}
                      </Link>
                      {problem.type && problem.type !== "PRACTICE" && (
                        <span className="ml-2 text-xs text-ll-muted">
                          {problem.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {(problem.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-xs bg-ll-surface-2 text-ll-muted border border-ll-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {authUser?.role === "ADMIN" && (
                          <>
                            <button
                              type="button"
                              onClick={() => onDeleteProblem(problem.id)}
                              className="p-2 rounded-lg text-ll-muted hover:text-ll-error hover:bg-ll-error/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled
                              className="p-2 rounded-lg text-ll-muted opacity-40 cursor-not-allowed"
                              title="Edit (coming soon)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProblemId(problem.id);
                            setIsAddToPlaylistModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-ll-muted hover:text-ll-accent hover:bg-ll-accent/10 transition-colors"
                          title="Save to playlist"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-ll-muted">
                  No problems match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-ll-border flex items-center justify-between text-sm">
        <span className="text-ll-muted">
          {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 rounded-lg ll-btn-ghost disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-ll-muted px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 rounded-lg ll-btn-ghost disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createPlaylist}
      />
      <AddToPlaylistModal
        isOpen={isAddToPlaylistModalOpen}
        onClose={() => setIsAddToPlaylistModalOpen(false)}
        problemId={selectedProblemId}
      />
    </div>
  );
}
