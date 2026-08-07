import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  FileText,
  MessageSquare,
  Lightbulb,
  ChevronLeft,
  History,
  Terminal,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useProblemStore } from "../store/useProblemStore.js";
import {
  getLanguageId,
  getProblemTestCases,
  getCodeSnippet,
  toMonacoLanguage,
  formatLanguageLabel,
} from "../lib/lang.js";
import toast from "react-hot-toast";
import { useExecutionStore } from "../store/useExecutionStore.js";
import { useSubmissionStore } from "../store/useSubmissionStore.js";
import { useEditorIntegrity } from "../hooks/useEditorIntegrity.js";
import Submission from "../components/Submission.jsx";
import SubmissionsList from "../components/SubmissionList.jsx";
import Logo from "../components/ui/Logo.jsx";
import DifficultyBadge from "../components/ui/DifficultyBadge.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const TABS = [
  { id: "description", label: "Description", icon: FileText },
  { id: "submissions", label: "Submissions", icon: History },
  { id: "discussion", label: "Discuss", icon: MessageSquare },
  { id: "hints", label: "Hints", icon: Lightbulb },
];

/**
 * Practice / Exam graded workspace — test cases + Submit.
 * Practicals use PracticalProblemPage (Run mode) instead.
 */
export default function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProblemById, problem, isProblemLoading } = useProblemStore();
  const {
    submission: pastSubmissions,
    isLoading: isSubmissionsLoading,
    getSubmissionForProblem,
    getSubmissionCountForProblem,
    submissionCount,
  } = useSubmissionStore();
  const { executeCode, submission, isExecuting } = useExecutionStore();

  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [selectedLanguage, setSelectedLanguage] = useState("JAVASCRIPT");
  const [testcases, setTestCases] = useState([]);
  const [bottomTab, setBottomTab] = useState("cases");

  const integrityType =
    !isProblemLoading && problem?.id === id ? problem.type : undefined;
  const { registerEditor, badgeText, isRestricted } = useEditorIntegrity({
    problemId: id,
    problemType: integrityType,
  });

  useEffect(() => {
    getProblemById(id);
    getSubmissionCountForProblem(id);
  }, [id, getProblemById, getSubmissionCountForProblem]);

  useEffect(() => {
    if (!problem) return;

    // PRACTICAL + JUDGE0_RUN belong in the Run workspace
    if (
      problem.type === "PRACTICAL" ||
      problem.executionMode === "JUDGE0_RUN"
    ) {
      const subjectId =
        problem.unit?.subjectId ?? problem.unit?.subject?.id;
      const unitId = problem.unitId ?? problem.unit?.id;
      if (subjectId && unitId) {
        navigate(
          `/practicals/${subjectId}/units/${unitId}/problems/${id}`,
          { replace: true }
        );
      } else {
        navigate(`/practical/${id}`, { replace: true });
      }
      return;
    }

    const langs = Object.keys(problem.codeSnippets || {}).map((k) =>
      k.toUpperCase()
    );
    const nextLang = langs.includes(selectedLanguage)
      ? selectedLanguage
      : langs[0] || "JAVASCRIPT";
    if (nextLang !== selectedLanguage) setSelectedLanguage(nextLang);

    setCode(getCodeSnippet(problem.codeSnippets, nextLang));
    setTestCases(
      getProblemTestCases(problem).map((tc) => ({
        input: tc.input,
        output: tc.output,
      }))
    );
  }, [problem, selectedLanguage, id, navigate]);

  useEffect(() => {
    if (activeTab === "submissions" && id) {
      getSubmissionForProblem(id);
    }
  }, [activeTab, id, getSubmissionForProblem]);

  useEffect(() => {
    if (submission) setBottomTab("result");
  }, [submission]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    setCode(getCodeSnippet(problem.codeSnippets, lang));
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const cases =
      testcases.length > 0 ? testcases : getProblemTestCases(problem);
    if (!cases.length) {
      toast.error("No test cases found for this problem");
      return;
    }
    const language_id = getLanguageId(selectedLanguage);
    if (!language_id) {
      toast.error("Unsupported language");
      return;
    }
    executeCode(
      code,
      language_id,
      cases.map((tc) => tc.input),
      cases.map((tc) => tc.output),
      id
    );
  };

  if (isProblemLoading || !problem) {
    return (
      <div className="h-screen bg-ll-bg">
        <PageLoader message="Loading problem..." />
      </div>
    );
  }

  const availableLanguages = Object.keys(problem.codeSnippets || {}).map((k) =>
    k.toUpperCase()
  );

  const renderDescription = () => (
    <div className="space-y-6 text-sm leading-relaxed">
      <p className="text-ll-text/90">{problem.description}</p>

      {problem.examples && (
        <div>
          <h3 className="font-semibold mb-3">Examples</h3>
          {Object.entries(problem.examples).map(([lang, ex]) => (
            <div key={lang} className="mb-4 ll-code-block space-y-2">
              <p className="text-xs text-ll-muted uppercase">{lang}</p>
              <div>
                <span className="text-ll-muted">Input: </span>
                <code>{ex.input}</code>
              </div>
              <div>
                <span className="text-ll-muted">Output: </span>
                <code>{ex.output}</code>
              </div>
              {ex.explanation && (
                <p className="text-ll-muted text-xs mt-2">{ex.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {problem.constraints && (
        <div>
          <h3 className="font-semibold mb-2">Constraints</h3>
          <p className="ll-code-block text-ll-muted">{problem.constraints}</p>
        </div>
      )}
    </div>
  );

  const renderLeftPanel = () => {
    switch (activeTab) {
      case "description":
        return renderDescription();
      case "submissions":
        return (
          <SubmissionsList
            submissions={pastSubmissions}
            isLoading={isSubmissionsLoading}
          />
        );
      case "discussion":
        return (
          <p className="text-ll-muted text-sm text-center py-12">
            Discussions coming soon.
          </p>
        );
      case "hints":
        return problem.hints ? (
          <p className="ll-code-block text-ll-muted">{problem.hints}</p>
        ) : (
          <p className="text-ll-muted text-sm text-center py-12">No hints yet.</p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-ll-bg overflow-hidden">
      <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-ll-border bg-ll-surface">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/problems"
            className="p-1.5 rounded-lg text-ll-muted hover:text-ll-text hover:bg-ll-surface-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Logo to="/" size="sm" />
          <span className="text-ll-border hidden sm:inline">|</span>
          <h1 className="font-medium text-sm truncate hidden sm:block">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <div className="flex items-center gap-2 text-xs text-ll-muted">
          <span>{submissionCount ?? 0} submissions</span>
          <select
            className="ll-input py-1.5 text-xs w-32"
            value={selectedLanguage}
            onChange={handleLanguageChange}
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {formatLanguageLabel(lang)}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-full lg:w-[45%] xl:w-[42%] flex flex-col border-r border-ll-border min-h-0">
          <div className="flex border-b border-ll-border bg-ll-surface shrink-0 overflow-x-auto">
            {TABS.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`ll-tab flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tabId ? "ll-tab-active" : ""
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5">{renderLeftPanel()}</div>
        </div>

        <div className="hidden lg:flex flex-1 flex-col min-h-0 min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-ll-border bg-ll-surface text-xs text-ll-muted">
            <Terminal className="w-3.5 h-3.5" />
            <span>Code</span>
            {isRestricted && badgeText && (
              <span className="ml-auto truncate text-[10px] tracking-wide text-amber-400/90 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                {badgeText}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={toMonacoLanguage(selectedLanguage)}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || "")}
              onMount={registerEditor}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>

          <div className="shrink-0 border-t border-ll-border bg-ll-surface flex flex-col max-h-[40%]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-ll-border">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setBottomTab("cases")}
                  className={`px-3 py-1 text-xs rounded-md ${
                    bottomTab === "cases"
                      ? "bg-ll-surface-2 text-ll-text"
                      : "text-ll-muted"
                  }`}
                >
                  Testcases
                </button>
                <button
                  type="button"
                  onClick={() => setBottomTab("result")}
                  className={`px-3 py-1 text-xs rounded-md ${
                    bottomTab === "result"
                      ? "bg-ll-surface-2 text-ll-text"
                      : "text-ll-muted"
                  }`}
                >
                  Result
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isExecuting}
                  className="ll-btn-ghost flex items-center gap-1.5 !text-ll-text border border-ll-border"
                >
                  {isExecuting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isExecuting}
                  className="ll-btn-success flex items-center gap-1.5"
                >
                  Submit
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-3 flex-1 min-h-[120px]">
              {bottomTab === "result" && submission ? (
                <Submission submission={submission} compact />
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-ll-muted text-left">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Input</th>
                      <th className="pb-2">Expected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testcases.map((tc, i) => (
                      <tr key={i} className="border-t border-ll-border/50">
                        <td className="py-2 pr-4 text-ll-muted">{i + 1}</td>
                        <td className="py-2 pr-4">{tc.input}</td>
                        <td className="py-2">{tc.output}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden border-t border-ll-border flex flex-col h-[50vh]">
        {isRestricted && badgeText && (
          <div className="px-3 py-1.5 border-b border-ll-border bg-ll-surface text-[10px] tracking-wide text-amber-400/90 truncate">
            {badgeText}
          </div>
        )}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={toMonacoLanguage(selectedLanguage)}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            onMount={registerEditor}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              automaticLayout: true,
            }}
          />
        </div>
        <div className="flex gap-2 p-3 border-t border-ll-border bg-ll-surface">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isExecuting}
            className="flex-1 ll-btn-primary flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run / Submit
          </button>
        </div>
        {submission && (
          <div className="p-3 border-t border-ll-border max-h-48 overflow-y-auto">
            <Submission submission={submission} compact />
          </div>
        )}
      </div>
    </div>
  );
}
