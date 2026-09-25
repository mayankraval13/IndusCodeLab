import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Beaker,
  CheckCircle2,
  ClipboardList,
  Clock,
  Code2,
  Flame,
  Lightbulb,
  Lock,
  Target,
  TrendingUp,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useDashboardStore } from "../store/useDashboardStore.js";
import ActivityHeatmap from "../components/ui/ActivityHeatmap.jsx";
import DonutChart from "../components/ui/DonutChart.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";
import StatTile from "../components/ui/StatTile.jsx";
import { formatDate, formatDayKey, relativeDeadline } from "../lib/dates.js";

const DIFFICULTY_META = [
  { key: "EASY", label: "Easy", color: "var(--color-ll-easy)", text: "text-ll-easy" },
  { key: "MEDIUM", label: "Medium", color: "var(--color-ll-medium)", text: "text-ll-medium" },
  { key: "HARD", label: "Hard", color: "var(--color-ll-hard)", text: "text-ll-hard" },
];

export default function StudentDashboard() {
  const { authUser } = useAuthStore();
  const { student, isLoading, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard("USER");
  }, [fetchDashboard]);

  if (!student) {
    return isLoading ? (
      <PageLoader message="Building your dashboard..." />
    ) : (
      <div className="max-w-[1200px] mx-auto px-4 py-16 text-center text-ll-muted">
        Could not load your dashboard.
      </div>
    );
  }

  const { solved, streak, heatmap, assignments, recentSubmissions } = student;

  const segments = DIFFICULTY_META.map((meta) => ({
    label: meta.label,
    value: solved.byDifficulty[meta.key]?.solved ?? 0,
    color: meta.color,
  }));

  const catalogueTotal = DIFFICULTY_META.reduce(
    (sum, meta) => sum + (solved.byDifficulty[meta.key]?.total ?? 0),
    0,
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back
            {authUser?.name ? `, ${authUser.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-ll-muted text-sm mt-1.5">
            {authUser?.enrollmentNo && (
              <span className="font-mono">{authUser.enrollmentNo}</span>
            )}
            {student.sections.length > 0 && (
              <>
                {authUser?.enrollmentNo && " · "}
                Section {student.sections.map((s) => s.name).join(", ")}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/practicals" className="ll-btn-ghost flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Practicals
          </Link>
          <Link to="/problems" className="ll-btn-primary flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Solve problems
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Flame}
          label="Current streak"
          value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`}
          hint={`Longest ${streak.longest} · ${streak.activeDays} active days`}
          accent="text-orange-400"
          accentBg="bg-orange-400/15"
        />
        <StatTile
          icon={CheckCircle2}
          label="Solved"
          value={solved.total}
          hint={`${solved.practical} practical · ${solved.practice} practice`}
          accent="text-ll-success"
          accentBg="bg-ll-success/15"
        />
        <StatTile
          icon={ClipboardList}
          label="Pending"
          value={assignments.pending}
          hint={
            assignments.overdue > 0
              ? `${assignments.overdue} overdue`
              : "Nothing overdue"
          }
          to="/assignments"
          accent={assignments.overdue > 0 ? "text-ll-error" : "text-ll-accent"}
          accentBg={assignments.overdue > 0 ? "bg-ll-error/15" : "bg-ll-accent/15"}
        />
        <StatTile
          icon={TrendingUp}
          label="Submissions"
          value={student.totalSubmissions}
          hint="All time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <section className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold mb-4">Progress</h2>

          <div className="flex items-center gap-5">
            <DonutChart segments={segments} size={148}>
              {(hovered) =>
                hovered ? (
                  <>
                    <span className="text-2xl font-bold tabular-nums">
                      {hovered.value}
                    </span>
                    <span className="text-xs text-ll-muted">{hovered.label}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold tabular-nums">
                      {solved.total}
                    </span>
                    <span className="text-xs text-ll-muted">
                      of {catalogueTotal}
                    </span>
                  </>
                )
              }
            </DonutChart>

            <ul className="space-y-2.5 min-w-0 flex-1">
              {DIFFICULTY_META.map((meta) => {
                const bucket = solved.byDifficulty[meta.key] ?? {
                  solved: 0,
                  total: 0,
                };
                const percent =
                  bucket.total === 0
                    ? 0
                    : Math.round((bucket.solved / bucket.total) * 100);

                return (
                  <li key={meta.key}>
                    <div className="flex items-baseline justify-between text-sm gap-2">
                      <span className={meta.text}>{meta.label}</span>
                      <span className="tabular-nums text-ll-muted text-xs">
                        {bucket.solved}/{bucket.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ll-surface-2 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="ll-panel rounded-xl p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold">Activity</h2>
            {streak.lastActiveOn && (
              <span className="text-xs text-ll-muted">
                Last active {formatDayKey(streak.lastActiveOn)}
              </span>
            )}
          </div>
          <ActivityHeatmap data={heatmap} weeks={26} />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <section className="ll-panel rounded-xl p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold">Up next</h2>
            {assignments.total > 0 && (
              <Link
                to="/assignments"
                className="text-xs text-ll-accent hover:underline flex items-center gap-1"
              >
                All assignments
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {assignments.upcoming.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={
                assignments.total === 0 ? "Nothing assigned yet" : "All caught up"
              }
              body={
                assignments.total === 0
                  ? "Assigned practicals appear here once a faculty member publishes work for your section."
                  : "You have submitted everything your faculty has published. Keep the streak alive with practice problems."
              }
            />
          ) : (
            <ul className="space-y-3">
              {assignments.upcoming.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    to={`/assignments/${assignment.id}`}
                    className="block rounded-lg border border-ll-border bg-ll-surface-2/40 p-4 hover:border-ll-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {assignment.title}
                          </p>
                          {!assignment.isOpen && (
                            <Badge tone="amber" icon={Lock}>
                              Opens {formatDate(assignment.publishAt)}
                            </Badge>
                          )}
                          {assignment.isOverdue && (
                            <Badge tone="error" icon={TriangleAlert}>
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-ll-muted mt-1">
                          {assignment.subject?.name}
                          {assignment.facultyName && ` · ${assignment.facultyName}`}
                        </p>
                        {assignment.dueAt && (
                          <p className="text-xs text-ll-muted mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {relativeDeadline(assignment.dueAt)}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {assignment.submittedCount}
                          <span className="text-ll-muted">
                            /{assignment.problemCount}
                          </span>
                        </p>
                        <div className="h-1.5 w-16 rounded-full bg-ll-surface-2 mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-ll-accent transition-[width] duration-700"
                            style={{
                              width: `${
                                assignment.problemCount === 0
                                  ? 0
                                  : (assignment.submittedCount /
                                      assignment.problemCount) *
                                    100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-ll-medium" />
            Focus areas
          </h2>
          <p className="text-xs text-ll-muted mb-4">
            Topics where your practice accuracy is lowest.
          </p>

          {student.focusAreas.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Not enough data yet"
              body="Solve a few more practice problems and your weakest topics will show up here."
              compact
            />
          ) : (
            <ul className="space-y-3">
              {student.focusAreas.map((area) => (
                <li key={area.tag}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate capitalize">{area.tag}</span>
                    <span className="tabular-nums text-xs text-ll-muted shrink-0">
                      {area.accuracy}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ll-surface-2 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ${
                        area.accuracy < 34
                          ? "bg-ll-hard"
                          : area.accuracy < 67
                            ? "bg-ll-medium"
                            : "bg-ll-easy"
                      }`}
                      style={{ width: `${Math.max(4, area.accuracy)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ll-muted mt-1">
                    {area.accepted} of {area.submissions} submissions accepted
                    across {area.problems}{" "}
                    {area.problems === 1 ? "problem" : "problems"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <section className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold mb-4">Course coverage</h2>

          {student.subjectProgress.length === 0 ? (
            <EmptyState
              icon={Beaker}
              title="No course practicals yet"
              body="Progress appears for subjects your section is actually enrolled in."
              compact
            />
          ) : (
            <ul className="space-y-4">
              {student.subjectProgress.map((subject) => {
                const percent = Math.round(
                  (subject.solved / subject.total) * 100,
                );

                return (
                  <li key={subject.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{subject.name}</span>
                      <span className="tabular-nums text-xs text-ll-muted shrink-0">
                        {subject.solved}/{subject.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ll-surface-2 mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-ll-easy transition-[width] duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold mb-4">Recent submissions</h2>

          {recentSubmissions.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No submissions yet"
              body="Your latest runs and submissions will be listed here."
              compact
            />
          ) : (
            <ul className="divide-y divide-ll-border -my-1">
              {recentSubmissions.map((submission) => (
                <li key={submission.id} className="py-2.5">
                  <Link
                    to={`/${
                      submission.problem.type === "PRACTICAL"
                        ? "practical"
                        : "problem"
                    }/${submission.problem.id}`}
                    className="flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {submission.succeeded ? (
                        <CheckCircle2 className="w-4 h-4 text-ll-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-ll-error shrink-0" />
                      )}
                      <span className="text-sm truncate group-hover:text-ll-accent transition-colors">
                        {submission.problem.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-ll-muted shrink-0 tabular-nums">
                      {formatDate(submission.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Badge({ tone, icon: Icon, children }) {
  const tones = {
    amber: "bg-amber-500/10 text-amber-400",
    error: "bg-ll-error/10 text-ll-error",
  };

  return (
    <span
      className={`flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${tones[tone]}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, title, body, compact }) {
  return (
    <div className={`text-center ${compact ? "py-6" : "py-10"}`}>
      <Icon
        className={`mx-auto mb-3 text-ll-muted opacity-40 ${
          compact ? "w-7 h-7" : "w-9 h-9"
        }`}
      />
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-ll-muted mt-1 max-w-xs mx-auto leading-relaxed">
        {body}
      </p>
    </div>
  );
}
