import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Code2,
  FileEdit,
  GraduationCap,
  Layers,
  Link2,
  Plus,
  Send,
  ShieldAlert,
  UserCog,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useDashboardStore } from "../store/useDashboardStore.js";
import ActivityBars from "../components/ui/ActivityBars.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";
import StatTile from "../components/ui/StatTile.jsx";
import { formatDate } from "../lib/dates.js";

const QUICK_ACTIONS = [
  { label: "Add problem", to: "/add-problem", icon: Plus },
  { label: "Subjects", to: "/admin/subjects", icon: BookOpen },
  { label: "Sections", to: "/admin/batches", icon: Layers },
  { label: "Students", to: "/admin/students", icon: UserRound },
  { label: "Faculty", to: "/admin/faculty", icon: UserCog },
  { label: "Allocations", to: "/admin/allocations", icon: Link2 },
];

export default function AdminDashboard() {
  const { admin, isLoading, fetchDashboard } = useDashboardStore();

  useEffect(() => {
    fetchDashboard("ADMIN");
  }, [fetchDashboard]);

  if (!admin) {
    return isLoading ? (
      <PageLoader message="Building your dashboard..." />
    ) : (
      <div className="max-w-[1200px] mx-auto px-4 py-16 text-center text-ll-muted">
        Could not load the dashboard.
      </div>
    );
  }

  const { totals, health, recentOfferings } = admin;

  const enrolmentRate =
    totals.students === 0
      ? 0
      : Math.round((totals.enrolledStudents / totals.students) * 100);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Platform overview
        </h1>
        <p className="text-ll-muted text-sm mt-1.5">
          Accounts, sections and coursework across the institution.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="ll-btn-ghost flex items-center gap-2 border border-ll-border"
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Users}
          label="Students"
          value={totals.students}
          hint={`${enrolmentRate}% enrolled in a section`}
          to="/admin/batches"
          accent="text-sky-400"
          accentBg="bg-sky-400/15"
        />
        <StatTile
          icon={GraduationCap}
          label="Faculty"
          value={totals.faculty}
          hint={`${totals.offerings} allocations`}
          to="/admin/faculty"
        />
        <StatTile
          icon={Layers}
          label="Sections"
          value={totals.batches}
          hint={`${totals.subjects} subjects`}
          to="/admin/batches"
          accent="text-violet-400"
          accentBg="bg-violet-400/15"
        />
        <StatTile
          icon={Code2}
          label="Problems"
          value={totals.problems}
          hint={`${totals.assignmentsPublished} assignments published`}
          to="/problems"
          accent="text-ll-success"
          accentBg="bg-ll-success/15"
        />
      </div>

      {(health.sectionsWithoutFaculty.length > 0 ||
        health.emptySections.length > 0 ||
        totals.unenrolledStudents > 0 ||
        health.selfRegisteredStudents > 0) && (
        <section className="ll-panel rounded-xl p-5 sm:p-6 border-ll-medium/40">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-ll-medium" />
            Needs attention
          </h2>
          <p className="text-xs text-ll-muted mb-4">
            States that silently leave students with nothing to do.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {health.sectionsWithoutFaculty.length > 0 && (
              <Warning
                title={`${health.sectionsWithoutFaculty.length} section${
                  health.sectionsWithoutFaculty.length === 1 ? "" : "s"
                } without faculty`}
                body={health.sectionsWithoutFaculty
                  .slice(0, 4)
                  .map((section) => section.name)
                  .join(", ")}
                actionLabel="Allocate faculty"
                to="/admin/allocations"
              />
            )}

            {health.emptySections.length > 0 && (
              <Warning
                title={`${health.emptySections.length} empty section${
                  health.emptySections.length === 1 ? "" : "s"
                }`}
                body={health.emptySections
                  .slice(0, 4)
                  .map((section) => section.name)
                  .join(", ")}
                actionLabel="Enrol students"
                to="/admin/batches"
              />
            )}

            {totals.unenrolledStudents > 0 && (
              <Warning
                title={`${totals.unenrolledStudents} student${
                  totals.unenrolledStudents === 1 ? "" : "s"
                } not in a section`}
                body="They cannot be assigned any coursework until they belong to a section."
                actionLabel="Review students"
                to="/admin/students?enrolled=false"
              />
            )}

            {health.selfRegisteredStudents > 0 && (
              <Warning
                title={`${health.selfRegisteredStudents} self-registered account${
                  health.selfRegisteredStudents === 1 ? "" : "s"
                }`}
                body="Bulk enrolment skips these on purpose. Verify the enrollment number, then add them by hand."
                actionLabel="Review"
                to="/admin/students?provisioned=false"
              />
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <section className="ll-panel rounded-xl p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-semibold mb-1">Submission activity</h2>
          <p className="text-xs text-ll-muted mb-4">
            Every submission across the platform, last 30 days.
          </p>
          <ActivityBars data={admin.activity} />
        </section>

        <section className="ll-panel rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-semibold mb-3">Coursework</h2>
            <div className="space-y-2.5">
              <Row
                icon={Send}
                label="Published"
                value={totals.assignmentsPublished}
                accent="text-ll-success"
              />
              <Row
                icon={FileEdit}
                label="Drafts"
                value={totals.assignmentsDraft}
                accent="text-ll-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-ll-border">
            <h2 className="font-semibold mb-3">Accounts</h2>
            <div className="space-y-2.5">
              <Row icon={Users} label="Students" value={totals.students} />
              <Row
                icon={GraduationCap}
                label="Faculty"
                value={totals.faculty}
              />
              <Row icon={UserPlus} label="Admins" value={totals.admins} />
            </div>
          </div>
        </section>
      </div>

      <section className="ll-panel rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-semibold">Recent allocations</h2>
          <Link
            to="/admin/allocations"
            className="text-xs text-ll-accent hover:underline flex items-center gap-1"
          >
            Manage
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentOfferings.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="w-8 h-8 mx-auto mb-3 text-ll-muted opacity-40" />
            <p className="font-medium text-sm">No allocations yet</p>
            <p className="text-xs text-ll-muted mt-1">
              Allocate a faculty member to a section and subject to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ll-border -my-1">
            {recentOfferings.map((offering) => (
              <li
                key={offering.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium">{offering.faculty?.name}</span>
                    <span className="text-ll-muted"> teaches </span>
                    <span className="font-medium">{offering.subject?.name}</span>
                  </p>
                  <p className="text-xs text-ll-muted mt-0.5">
                    Section {offering.batch?.name} · {offering.term}
                  </p>
                </div>
                <span className="text-[11px] text-ll-muted shrink-0 tabular-nums">
                  {formatDate(offering.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Warning({ title, body, actionLabel, to }) {
  return (
    <div className="rounded-lg border border-ll-border bg-ll-surface-2/40 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-ll-muted mt-1 leading-relaxed">{body}</p>
      <Link
        to={to}
        className="text-xs text-ll-accent hover:underline inline-flex items-center gap-1 mt-2.5"
      >
        {actionLabel}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function Row({ icon: Icon, label, value, accent = "text-ll-muted" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ll-muted flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
