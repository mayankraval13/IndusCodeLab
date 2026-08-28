import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  History,
} from "lucide-react";

const formatWhen = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const readSourceCode = (sourceCode) =>
  typeof sourceCode === "string" ? sourceCode : String(sourceCode ?? "");

/**
 * Practicals are checked physically by faculty, so this is a record of what was
 * submitted rather than a verdict. The newest submission is the one that counts;
 * older ones stay visible so a student can see what they changed.
 */
export default function PracticalSubmissionHistory({ submissions, isLoading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (isLoading && submissions.length === 0) {
    return (
      <p className="text-xs text-ll-muted">Loading your submissions…</p>
    );
  }

  if (submissions.length === 0) {
    return (
      <p className="text-xs text-ll-muted">
        Nothing submitted yet. Run your code, and once the output looks right,
        hit Submit.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-ll-border rounded-xl border border-ll-border overflow-hidden">
      {submissions.map((submission, index) => {
        const failed = submission.status !== "SUBMITTED";
        const isExpanded = expandedId === submission.id;
        const output =
          submission.stdout?.trim() ||
          submission.stderr?.trim() ||
          submission.complieOutput?.trim() ||
          "No output";

        return (
          <li key={submission.id} className="bg-ll-surface">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : submission.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ll-surface-2 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-ll-muted shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-ll-muted shrink-0" />
              )}

              {failed ? (
                <AlertTriangle className="w-4 h-4 text-ll-error shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-ll-success shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {failed ? "Did not run cleanly" : "Submitted"}
                  {index === 0 && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-ll-accent">
                      Latest
                    </span>
                  )}
                </p>
                <p className="text-xs text-ll-muted">
                  {formatWhen(submission.createdAt)} · {submission.language}
                </p>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ll-muted mb-1">
                    Output
                  </p>
                  <pre className="ll-code-block text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {output}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ll-muted mb-1">
                    Code
                  </p>
                  <pre className="ll-code-block text-xs whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                    {readSourceCode(submission.sourceCode)}
                  </pre>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SubmissionHistoryHeading({ count }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold mb-3">
      <History className="w-4 h-4 text-ll-muted" />
      Your submissions
      {count > 0 && (
        <span className="text-xs font-normal text-ll-muted">({count})</span>
      )}
    </h2>
  );
}
