import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  Layers,
  Send,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useDashboardStore } from "../store/useDashboardStore.js";
import ActivityBars from "../components/ui/ActivityBars.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";
import ProgressRing from "../components/ui/ProgressRing.jsx";
import StatTile from "../components/ui/StatTile.jsx";
import { formatDate, relativeDeadline } from "../lib/dates.js";

const rateColor = (rate) =>
  rate >= 75
    ? "var(--color-ll-success)"
    : rate >= 40
      ? "var(--color-ll-medium)"
      : "var(--color-ll-hard)";

export default function FacultyDashboard() {
  const { authUser } = useAuthStore();
  const { faculty, isLoading, fetchDashboard } = useDashboardStore();
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    fetchDashboard("FACULTY");
  }, [fetchDashboard]);

  if (!faculty) {
    return isLoading ? (
      <PageLoader message="Building your dashboard..." />
    ) : (
      <div className="max-w-[1200px] mx-auto px-4 py-16 text-center text-ll-muted">
        Could not load your dashboard.
      </div>
    );
  }

  const { totals, sections, upcomingDeadlines } = faculty;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {authUser?.name ? `${authUser.name.split(" ")[0]}'s` : "Faculty"}{" "}
            dashboard
          </h1>
          <p className="text-ll-muted text-sm mt-1.5">
            Your allocated sections, published coursework and how far your
            students have got.
          </p>
        </div>

        <Link to="/faculty/sections" className="ll-btn-primary flex items-center gap-2">
          <Layers className="w-4 h-4" />
          My sections
        </Link>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Layers}
          label="Sections"
          value={totals.sections}
          hint="Allocated to you"
          to="/faculty/sections"
        />
        <StatTile
          icon={Users}
          label="Students"
          value={totals.students}
          hint="Across your sections"
          accent="text-sky-400"
          accentBg="bg-sky-400/15"
        />
        <StatTile
          icon={Send}
          label="Published"
          value={totals.published}
          hint="Live assignments"
          accent="text-ll-success"
          accentBg="bg-ll-success/15"
        />
        <StatTile
          icon={FileEdit}
          label="Drafts"
          value={totals.drafts}
          hint={
            totals.drafts > 0 ? "Not visible to students yet" : "Nothing waiting"
          }
          accent={totals.drafts > 0 ? "text-ll-medium" : "text-ll-muted"}
          accentBg={totals.drafts > 0 ? "bg-ll-medium/15" : "bg-ll-surface-2"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <section className="ll-panel rounded-xl p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-semibold mb-1">Submission activity</h2>
          <p className="text-xs text-ll-muted mb-4">
            Practical submissions from your students over the last 30 days.
          </p>
          <ActivityBars data={faculty.activity} />
        </section>

        <section className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-ll-accent" />
            Deadlines
          </h2>
          <p className="text-xs text-ll-muted mb-4">
            Overdue work first, then the next dates to fall due.
          </p>

          {upcomingDeadlines.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No open deadlines"
              body="Dated assignments that are still unfinished show up here."
            />
          ) : (
            <ul className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <li key={deadline.id}>
                  <Link
                    to={`/faculty/assignments/${deadline.id}`}
                    className="block rounded-lg border border-ll-border bg-ll-surface-2/40 p-3 hover:border-ll-accent transition-colors"
                  >
                    <p className="text-sm font-medium truncate">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-ll-muted mt-0.5 truncate">
                      {deadline.subjectCode} · Section {deadline.sectionName}
                    </p>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span
                        className={`text-xs ${
                          deadline.isOverdue ? "text-ll-error" : "text-ll-accent"
                        }`}
                      >
                        {relativeDeadline(deadline.dueAt)}
                      </span>
                      <span className="text-xs text-ll-muted tabular-nums">
                        {deadline.complete}/{deadline.students} done
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Sections</h2>

        {sections.length === 0 ? (
          <div className="ll-panel rounded-xl p-10 text-center">
            <Layers className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
            <p className="font-medium">No sections allocated yet</p>
            <p className="text-ll-muted text-sm mt-1 max-w-md mx-auto">
              An admin needs to allocate you to a section and subject before you
              can publish coursework. You will get a notification when they do.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sections.map((section) => {
              const isOpen = openSection === section.offeringId;

              return (
                <li key={section.offeringId} className="ll-panel rounded-xl">
                  <div className="p-4 sm:p-5 flex items-center gap-4">
                    <ProgressRing
                      value={section.completionRate}
                      color={rateColor(section.completionRate)}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">
                          {section.subject.name}
                        </p>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-ll-surface-2 text-ll-muted shrink-0">
                          {section.subject.code}
                        </span>
                      </div>
                      <p className="text-xs text-ll-muted mt-1">
                        Section {section.batch.name} · {section.batch.memberCount}{" "}
                        students · {section.term}
                      </p>
                      <p className="text-xs text-ll-muted mt-1">
                        {section.publishedCount} published
                        {section.draftCount > 0 && (
                          <span className="text-ll-medium">
                            {" "}
                            · {section.draftCount} draft
                            {section.draftCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {section.assignments.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSection(isOpen ? null : section.offeringId)
                          }
                          className="ll-btn-ghost text-xs"
                        >
                          {isOpen ? "Hide" : "Breakdown"}
                        </button>
                      )}
                      <Link
                        to={`/faculty/offerings/${section.offeringId}`}
                        className="ll-btn-ghost text-xs flex items-center gap-1"
                      >
                        Manage
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-ll-border px-4 sm:px-5 py-4 space-y-3">
                      {section.assignments.map((assignment) => (
                        <Link
                          key={assignment.id}
                          to={`/faculty/assignments/${assignment.id}`}
                          className="block hover:opacity-90 transition-opacity"
                        >
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate">{assignment.title}</span>
                            <span className="text-xs text-ll-muted tabular-nums shrink-0">
                              {assignment.complete}/{assignment.students} complete
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-ll-surface-2 mt-2 overflow-hidden flex">
                            <div
                              className="h-full bg-ll-success transition-[width] duration-700"
                              style={{ width: `${assignment.completionRate}%` }}
                            />
                            <div
                              className="h-full bg-ll-medium/70 transition-[width] duration-700"
                              style={{
                                width: `${
                                  assignment.students === 0
                                    ? 0
                                    : ((assignment.started -
                                        assignment.complete) /
                                        assignment.students) *
                                      100
                                }%`,
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-ll-muted mt-1.5">
                            {assignment.started - assignment.complete} in progress ·{" "}
                            {assignment.students - assignment.started} not started
                            {assignment.dueAt &&
                              ` · due ${formatDate(assignment.dueAt)}`}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sections.some((section) => section.draftCount > 0) && (
        <div className="ll-panel rounded-xl p-4 flex items-start gap-3 border-ll-medium/40">
          <TriangleAlert className="w-4 h-4 text-ll-medium shrink-0 mt-0.5" />
          <p className="text-sm text-ll-muted">
            You have unpublished drafts. Students cannot see an assignment — or
            submit to it — until it is published.
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="text-center py-6">
      <Icon className="w-7 h-7 mx-auto mb-3 text-ll-muted opacity-40" />
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-ll-muted mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
