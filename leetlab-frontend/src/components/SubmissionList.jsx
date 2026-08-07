import {
  CheckCircle2,
  XCircle,
  Clock,
  MemoryStick,
  Calendar,
  Loader2,
} from "lucide-react";

function safeParse(data) {
  try {
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function avgFromJson(data, split = true) {
  const arr = safeParse(data).map((v) =>
    split ? parseFloat(String(v).split(" ")[0]) : parseFloat(v)
  );
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default function SubmissionsList({ submissions, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-ll-accent animate-spin" />
      </div>
    );
  }

  if (!submissions?.length) {
    return (
      <p className="text-center text-ll-muted text-sm py-12">No submissions yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => {
        const accepted = submission.status === "Accepted";
        return (
          <div
            key={submission.id}
            className="ll-panel rounded-lg p-4 hover:border-ll-border-light transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {accepted ? (
                  <span className="flex items-center gap-1.5 text-ll-success text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Accepted
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-ll-error text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    {submission.status}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs bg-ll-surface-2 text-ll-muted border border-ll-border">
                  {submission.language}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-ll-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {avgFromJson(submission.time).toFixed(3)}s
                </span>
                <span className="flex items-center gap-1">
                  <MemoryStick className="w-3.5 h-3.5" />
                  {avgFromJson(submission.memory).toFixed(0)} KB
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(submission.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
