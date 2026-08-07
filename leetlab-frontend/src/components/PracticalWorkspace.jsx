import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Terminal, ChevronDown, ChevronRight } from "lucide-react";
import {
  toMonacoLanguage,
  formatLanguageLabel,
} from "../lib/lang.js";

const FILE_NAMES = {
  PYTHON: "main.py",
  C: "main.c",
  CPP: "main.cpp",
  JAVA: "Main.java",
};

const LINE_STAGGER_MS = 70;

function StatusPill({ isRunning, isError }) {
  if (isRunning) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ll-dot-pulsing" />
        Running
      </span>
    );
  }
  if (isError) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-ll-success/10 text-ll-success border border-ll-success/30">
      <span className="w-1.5 h-1.5 rounded-full bg-ll-success" />
      Success
    </span>
  );
}

/**
 * Derives terminal lines from a Judge0-style run result.
 * `result` / `error` are the injection point for real output —
 * whatever the parent passes here is what streams into the terminal.
 */
function buildOutputLines(result, error) {
  if (error) {
    return { lines: ["Something went wrong — try again"], isError: true };
  }
  if (!result) return { lines: [], isError: false };

  const statusId = result.status?.id;

  if (statusId === 6) {
    const text = result.compile_output?.trim() || "No compile output";
    return {
      lines: [`— Compilation Error —`, ...text.split("\n")],
      isError: true,
    };
  }
  if (statusId === 3) {
    const text = result.stdout ?? "";
    const lines = text.trim() ? text.replace(/\n$/, "").split("\n") : ["No output"];
    const stats = [
      result.time != null ? `time ${result.time}s` : null,
      result.memory != null ? `mem ${result.memory} KB` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { lines, isError: false, stats };
  }
  // Runtime error / TLE / anything else
  const text =
    result.stderr?.trim() ||
    result.compile_output?.trim() ||
    result.message?.trim() ||
    "No details";
  return {
    lines: [`— ${result.status?.description || "Runtime Error"} —`, ...text.split("\n")],
    isError: true,
  };
}

/**
 * Practicals coding workspace.
 *
 * Renders a centered IDE-style codespace; when Run is triggered the layout
 * animates into a two-column split and the terminal output panel streams in.
 *
 * Real execution is injected via props: parent handles `onRun` and feeds
 * `isRunning` / `result` / `error` back down.
 */
export default function PracticalWorkspace({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  languages,
  onRun,
  isRunning,
  result,
  error,
  onEditorMount,
  stdin,
  onStdinChange,
  integrityBadge,
  /** Controlled by parent so question + workspace share the same expand animation */
  hasRun = false,
}) {
  // Bumped per run so the stagger animation replays for fresh output
  const [runKey, setRunKey] = useState(0);
  const [stdinOpen, setStdinOpen] = useState(false);

  const fileName = FILE_NAMES[language] || "main.txt";

  const { lines, isError, stats } = useMemo(
    () => buildOutputLines(result, error),
    [result, error]
  );

  const handleRunClick = () => {
    setRunKey((k) => k + 1);
    onRun?.();
  };

  const showLines = !isRunning && lines.length > 0;
  const cursorDelayMs = lines.length * LINE_STAGGER_MS + 150;

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Codespace */}
        <div
          className="ll-workspace-codespace min-w-0 w-full"
          style={{
            flexBasis: hasRun ? "58%" : "100%",
            flexShrink: 0,
            flexGrow: hasRun ? 0 : 1,
          }}
        >
          <div className="rounded-xl overflow-hidden border border-ll-border bg-ll-surface shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-ll-border bg-ll-surface-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                </span>
                <span className="font-mono text-xs text-ll-muted truncate">
                  {fileName}
                </span>
                {integrityBadge && (
                  <span className="hidden xl:inline truncate text-[10px] tracking-wide text-amber-400/90 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                    {integrityBadge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  className="ll-input !py-1 !px-2 text-xs w-28"
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value)}
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {formatLanguageLabel(lang)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRunClick}
                  disabled={isRunning}
                  className="ll-btn-success flex items-center gap-1.5 !py-1.5 !px-3 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Run code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="h-[440px]">
              <Editor
                height="100%"
                language={toMonacoLanguage(language)}
                theme="vs-dark"
                value={code}
                onChange={(v) => onCodeChange(v || "")}
                onMount={onEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "JetBrains Mono, monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 14 },
                }}
              />
            </div>

            {/* Custom stdin */}
            <div className="border-t border-ll-border px-4 py-2.5 bg-ll-surface-2/60">
              <button
                type="button"
                onClick={() => setStdinOpen((o) => !o)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ll-muted hover:text-ll-text"
              >
                {stdinOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Custom input (optional)
              </button>
              {stdinOpen && (
                <textarea
                  className="ll-input w-full min-h-[52px] resize-y font-mono text-xs mt-2"
                  value={stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  placeholder="stdin for your program…"
                />
              )}
            </div>
          </div>
        </div>

        {/* Output terminal — absent from the DOM until first run */}
        {hasRun && (
          <div className="ll-output-enter min-w-0 flex-1">
            <div className="rounded-xl overflow-hidden border border-ll-border bg-ll-surface shadow-[0_8px_40px_rgba(0,0,0,0.45)] h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-ll-border bg-ll-surface-2">
                <span className="flex items-center gap-2 text-xs font-medium text-ll-text">
                  <Terminal className="w-3.5 h-3.5 text-ll-muted" />
                  Output
                </span>
                <StatusPill isRunning={isRunning} isError={isError} />
              </div>

              <div
                key={runKey}
                className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed min-h-[200px] max-h-[500px] bg-[#0d0d0f]"
              >
                {isRunning ? (
                  <p className="text-ll-muted text-xs">Executing {fileName}…</p>
                ) : showLines ? (
                  <>
                    {lines.map((line, i) => (
                      <p
                        key={`${runKey}-${i}`}
                        className={`ll-terminal-line whitespace-pre-wrap break-words ${
                          isError ? "text-red-300" : "text-ll-text"
                        }`}
                        style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}
                      >
                        {line || "\u00A0"}
                      </p>
                    ))}
                    <span
                      className="ll-terminal-cursor mt-1"
                      style={{ animationDelay: `${cursorDelayMs}ms, ${cursorDelayMs}ms` }}
                    />
                    {stats && (
                      <p
                        className="ll-terminal-line text-[10px] text-ll-muted mt-3"
                        style={{ animationDelay: `${cursorDelayMs}ms` }}
                      >
                        {stats}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-ll-muted text-xs">Waiting for output…</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
