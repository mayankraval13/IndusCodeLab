import { Link } from "react-router-dom";
import { ArrowLeft, Lock, ScrollText } from "lucide-react";

export default function ExamsPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-ll-muted hover:text-ll-text mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <div className="ll-panel rounded-xl overflow-hidden relative min-h-[320px]">
        <div className="absolute inset-0 z-10 backdrop-blur-md bg-ll-bg/55 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-ll-surface-2 border border-ll-border flex items-center justify-center mb-1">
            <Lock className="w-6 h-6 text-ll-muted" />
          </div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-sm text-ll-muted max-w-md leading-relaxed">
            Faculty will publish exam questions here. This section is locked
            until assessments are ready — nothing to configure on your side for
            now.
          </p>
        </div>

        {/* Soft preview under blur */}
        <div className="p-6 space-y-3 opacity-40 pointer-events-none select-none">
          <div className="flex items-center gap-2 text-ll-medium mb-4">
            <ScrollText className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Exams
            </span>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-ll-surface-2 border border-ll-border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
