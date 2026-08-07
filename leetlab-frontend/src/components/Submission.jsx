import { CheckCircle2, XCircle, Clock, MemoryStick } from "lucide-react";

function safeParse(data, fallback = []) {
  try {
    return JSON.parse(data || "[]");
  } catch {
    return fallback;
  }
}

export default function SubmissionResults({ submission, compact = false }) {
  const memoryArr = safeParse(submission.memory);
  const timeArr = safeParse(submission.time);
  const testCases = submission.testCases ?? [];

  const avgMemory =
    memoryArr.length > 0
      ? memoryArr.reduce((a, m) => a + parseFloat(m), 0) / memoryArr.length
      : 0;
  const avgTime =
    timeArr.length > 0
      ? timeArr.reduce((a, t) => a + parseFloat(t), 0) / timeArr.length
      : 0;

  const passedTests = testCases.filter((tc) => tc.passed).length;
  const totalTests = testCases.length || 1;
  const successRate = (passedTests / totalTests) * 100;
  const accepted = submission.status === "Accepted";

  if (compact) {
    return (
      <div className="space-y-3 text-xs">
        <div
          className={`flex items-center gap-2 font-semibold ${
            accepted ? "text-ll-success" : "text-ll-error"
          }`}
        >
          {accepted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {submission.status} — {passedTests}/{totalTests} passed (
          {successRate.toFixed(0)}%)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono">
            <thead>
              <tr className="text-ll-muted text-left">
                <th className="pb-1 pr-3">#</th>
                <th className="pb-1 pr-3">Status</th>
                <th className="pb-1">Output</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc) => (
                <tr key={tc.id ?? tc.testCase} className="border-t border-ll-border/40">
                  <td className="py-1.5 pr-3 text-ll-muted">{tc.testCase}</td>
                  <td className="py-1.5 pr-3">
                    {tc.passed ? (
                      <span className="text-ll-success">Pass</span>
                    ) : (
                      <span className="text-ll-error">Fail</span>
                    )}
                  </td>
                  <td className="py-1.5 truncate max-w-[200px]">{tc.stdout ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Status" value={submission.status} highlight={accepted} />
        <Stat label="Success" value={`${successRate.toFixed(1)}%`} />
        <Stat label="Runtime" value={`${avgTime.toFixed(3)} s`} icon={Clock} />
        <Stat label="Memory" value={`${avgMemory.toFixed(0)} KB`} icon={MemoryStick} />
      </div>

      <div className="ll-panel rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-ll-border font-semibold text-sm">
          Test Results
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ll-muted text-xs uppercase border-b border-ll-border">
                <th className="px-4 py-2 text-left">Case</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Expected</th>
                <th className="px-4 py-2 text-left">Got</th>
                <th className="px-4 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc) => (
                <tr key={tc.id} className="border-b border-ll-border/50 font-mono text-xs">
                  <td className="px-4 py-2">{tc.testCase}</td>
                  <td className="px-4 py-2">
                    {tc.passed ? (
                      <span className="text-ll-success flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Pass
                      </span>
                    ) : (
                      <span className="text-ll-error flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Fail
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{tc.expected}</td>
                  <td className="px-4 py-2">{tc.stdout ?? "—"}</td>
                  <td className="px-4 py-2">{tc.time ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight, icon: Icon }) {
  return (
    <div className="ll-panel rounded-lg p-4">
      <p className="text-xs text-ll-muted uppercase tracking-wide">{label}</p>
      <p
        className={`text-lg font-bold mt-1 flex items-center gap-1.5 ${
          highlight === true
            ? "text-ll-success"
            : highlight === false
              ? "text-ll-error"
              : ""
        }`}
      >
        {Icon && <Icon className="w-4 h-4 text-ll-muted" />}
        {value}
      </p>
    </div>
  );
}
