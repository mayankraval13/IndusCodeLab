import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Clock, Users } from "lucide-react";
import { useFacultyStore } from "../store/useFacultyStore.js";
import Logo from "../components/ui/Logo.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

export default function FacultySectionsPage() {
  const { offerings, isLoading, fetchMyOfferings } = useFacultyStore();

  useEffect(() => {
    fetchMyOfferings();
  }, [fetchMyOfferings]);

  if (isLoading && offerings.length === 0) {
    return <PageLoader message="Loading your sections..." />;
  }

  return (
    <div className="min-h-screen bg-ll-bg">
      <div className="border-b border-ll-border bg-ll-surface/95">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/" className="text-sm text-ll-muted hover:text-ll-text">
            ← Back to home
          </Link>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-ll-accent" />
            My sections
          </h1>
          <p className="text-ll-muted text-sm mt-1">
            Everything the admin has allocated to you. Practicals you publish
            go to the students in these sections.
          </p>
        </div>

        {offerings.length === 0 ? (
          <div className="ll-panel rounded-xl p-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-ll-muted opacity-40" />
            <p className="font-medium">No sections allocated yet</p>
            <p className="text-ll-muted text-sm mt-1">
              An admin needs to allocate you a subject and section. You will get
              a notification as soon as that happens.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offerings.map((offering) => (
              <div key={offering.id} className="ll-panel rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">
                      {offering.subject?.name}
                    </h2>
                    <p className="text-xs text-ll-muted mt-0.5">
                      {offering.subject?.code}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-ll-surface-2 text-ll-muted whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {offering.term}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-ll-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Section {offering.batch?.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {offering.batch?.memberCount ?? 0} students
                  </span>
                </div>

                <Link
                  to={`/faculty/offerings/${offering.id}`}
                  className="ll-btn-primary w-full mt-4 flex items-center justify-center gap-1.5 text-sm"
                >
                  Manage practicals
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
