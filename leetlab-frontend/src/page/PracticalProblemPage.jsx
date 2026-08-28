import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useProblemStore } from "../store/useProblemStore.js";
import {
  getLanguageId,
  getCodeSnippet,
  RUN_MODE_LANGUAGES,
} from "../lib/lang.js";
import toast from "react-hot-toast";
import { useExecutionStore } from "../store/useExecutionStore.js";
import { useSubmissionStore } from "../store/useSubmissionStore.js";
import { useEditorIntegrity } from "../hooks/useEditorIntegrity.js";
import PracticalWorkspace from "../components/PracticalWorkspace.jsx";
import PracticalSubmissionHistory, {
  SubmissionHistoryHeading,
} from "../components/PracticalSubmissionHistory.jsx";
import Logo from "../components/ui/Logo.jsx";
import DifficultyBadge from "../components/ui/DifficultyBadge.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

/**
 * Practicals solving page — plain question on the page background,
 * centered codespace that splits into code + output on Run.
 * Question + workspace share the same width so they expand together.
 */
export default function PracticalProblemPage() {
  const { id, subjectId, unitId } = useParams();
  const navigate = useNavigate();
  const { getProblemById, problem, isProblemLoading } = useProblemStore();
  const {
    runCode,
    runResult,
    runError,
    isExecuting,
    clearRunResult,
    submitPractical,
    isSubmitting,
  } = useExecutionStore();
  const {
    submission: pastSubmissions,
    isLoading: isSubmissionsLoading,
    getSubmissionForProblem,
  } = useSubmissionStore();

  const [code, setCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("PYTHON");
  const [stdin, setStdin] = useState("");
  // Shared with the workspace — drives the centered → wide layout for both
  const [hasRun, setHasRun] = useState(false);

  const integrityType =
    !isProblemLoading && problem?.id === id ? problem.type : undefined;
  const { registerEditor, badgeText } = useEditorIntegrity({
    problemId: id,
    problemType: integrityType,
  });

  // The store seeds this as null and shares it across problems, so normalise
  // to an array and ignore anything left over from a previous problem.
  const submissions = Array.isArray(pastSubmissions)
    ? pastSubmissions.filter((s) => s.problemId === id)
    : [];

  const backTo =
    subjectId && unitId
      ? `/practicals/${subjectId}/units/${unitId}`
      : "/practicals";

  useEffect(() => {
    getProblemById(id);
    getSubmissionForProblem(id);
    clearRunResult();
    setHasRun(false);
  }, [id, getProblemById, getSubmissionForProblem, clearRunResult]);

  useEffect(() => {
    if (!problem) return;

    // Practicals always use the Run workspace — redirect PRACTICE elsewhere
    if (problem.type === "PRACTICE") {
      navigate(`/problem/${id}`, { replace: true });
      return;
    }

    const nextLang = RUN_MODE_LANGUAGES.includes(selectedLanguage)
      ? selectedLanguage
      : "PYTHON";
    if (nextLang !== selectedLanguage) setSelectedLanguage(nextLang);
    setCode(getCodeSnippet(problem.codeSnippets, nextLang));
  }, [problem, selectedLanguage, id, navigate]);

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setCode(getCodeSnippet(problem.codeSnippets, lang));
  };

  /** Run hook — expands the shared layout, then kicks off real execution. */
  const handleRun = () => {
    if (!getLanguageId(selectedLanguage)) {
      toast.error("Unsupported language");
      return;
    }
    setHasRun(true);
    runCode({
      problemId: id,
      code,
      language: selectedLanguage,
      stdin,
    });
  };

  /** Records the attempt; the server re-runs the code to capture real output. */
  const handleSubmit = async () => {
    if (!getLanguageId(selectedLanguage)) {
      toast.error("Unsupported language");
      return;
    }
    try {
      await submitPractical({
        problemId: id,
        code,
        language: selectedLanguage,
        stdin,
      });
      await getSubmissionForProblem(id);
    } catch {
      // submitPractical already surfaced the reason
    }
  };

  if (isProblemLoading || !problem) {
    return (
      <div className="h-screen bg-ll-bg">
        <PageLoader message="Loading practical..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ll-bg">
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-ll-border bg-ll-surface sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={backTo}
            className="p-1.5 rounded-lg text-ll-muted hover:text-ll-text hover:bg-ll-surface-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Logo to="/" size="sm" />
          <span className="text-ll-border hidden sm:inline">|</span>
          <span className="text-[10px] uppercase tracking-wider text-ll-easy font-semibold hidden sm:inline">
            Practical
          </span>
        </div>
        <DifficultyBadge difficulty={problem.difficulty} />
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-10">
        {/* Question + workspace share one animated width so they stay aligned */}
        <div
          className={`ll-workspace mx-auto w-full ${
            hasRun ? "max-w-[1500px]" : "max-w-[900px]"
          }`}
        >
          {/* Question — plain on the page background, no card/frame */}
          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ll-easy mb-3">
              Coding Challenge
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              {problem.title}
            </h1>
            <p
              className={`text-ll-muted text-sm sm:text-base leading-relaxed transition-[max-width] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                hasRun ? "max-w-3xl" : "max-w-2xl"
              }`}
            >
              {problem.description}
            </p>
            {problem.constraints && (
              <p
                className={`text-ll-muted/80 text-xs sm:text-sm leading-relaxed mt-3 transition-[max-width] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  hasRun ? "max-w-3xl" : "max-w-2xl"
                }`}
              >
                {problem.constraints}
              </p>
            )}
          </div>

          {/* Codespace — splits into code + output on Run */}
          <PracticalWorkspace
            code={code}
            onCodeChange={setCode}
            language={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            languages={RUN_MODE_LANGUAGES}
            onRun={handleRun}
            isRunning={isExecuting}
            result={runResult}
            error={runError}
            onEditorMount={registerEditor}
            stdin={stdin}
            onStdinChange={setStdin}
            integrityBadge={badgeText}
            hasRun={hasRun}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            hasSubmitted={submissions.length > 0}
          />

          <div className="mt-10 max-w-3xl">
            <SubmissionHistoryHeading count={submissions.length} />
            <PracticalSubmissionHistory
              submissions={submissions}
              isLoading={isSubmissionsLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
