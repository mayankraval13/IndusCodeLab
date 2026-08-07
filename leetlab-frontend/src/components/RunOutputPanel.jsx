/**
 * Raw Judge0 run output for JUDGE0_RUN practicals (no pass/fail).
 *
 * Judge0 status ids (our instance):
 *   3  = Accepted
 *   6  = Compilation Error
 *   7–12 = Runtime Error variants (SIGSEGV, NZEC, …)
 *        Python syntax errors typically arrive as 11 (NZEC) with stderr,
 *        not as compile_output — Python has no separate compile step.
 */

const RUNTIME_ERROR_IDS = new Set([7, 8, 9, 10, 11, 12]);

export default function RunOutputPanel({
  result,
  isLoading = false,
  error = null,
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-ll-muted">
        <span className="loading loading-spinner loading-xs" />
        Running…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-ll-border bg-ll-bg px-3 py-4 text-center text-xs text-ll-muted">
        Something went wrong — try again
      </div>
    );
  }

  if (!result) {
    return (
      <p className="py-4 text-center text-xs text-ll-muted">
        Click Run to execute your code.
      </p>
    );
  }

  const statusId = result.status?.id;
  const statsLine = [
    result.time != null ? `Time: ${result.time}s` : null,
    result.memory != null ? `Memory: ${result.memory} KB` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let label = "Output";
  let body = "";
  let tone = "normal";

  if (statusId === 6) {
    label = "Compilation Error";
    body = result.compile_output?.trim() || "No compile output";
    tone = "error";
  } else if (RUNTIME_ERROR_IDS.has(statusId)) {
    label = "Runtime Error";
    body = result.stderr?.trim() || result.message?.trim() || "No stderr";
    tone = "error";
  } else if (statusId === 3) {
    label = "Output";
    body = result.stdout?.trim() ? result.stdout : "No output";
    tone = "normal";
  } else {
    // TLE, WA, internal, etc. — still show as an error-style block with available text
    label = result.status?.description || "Error";
    body =
      result.stderr?.trim() ||
      result.compile_output?.trim() ||
      result.message?.trim() ||
      result.stdout?.trim() ||
      "No details";
    tone = "error";
  }

  return (
    <div className="space-y-2 text-xs">
      <p
        className={`font-medium ${
          tone === "error" ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {label}
      </p>
      <pre
        className={`font-mono whitespace-pre-wrap break-words rounded-md border p-3 ${
          tone === "error"
            ? "border-red-500/40 bg-red-500/10 text-red-300"
            : "border-ll-border bg-ll-bg text-ll-text"
        }`}
      >
        {body}
      </pre>
      {statsLine ? (
        <p className="font-mono text-[10px] text-ll-muted">{statsLine}</p>
      ) : null}
    </div>
  );
}
