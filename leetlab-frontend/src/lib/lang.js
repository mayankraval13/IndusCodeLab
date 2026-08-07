function getLanguageName(languageId) {
    const LANGUAGE_NAMES = {
      74: "TypeScript",
      63: "JavaScript",
      71: "Python",
      62: "Java",
      50: "C",
      54: "C++",
    };
    return LANGUAGE_NAMES[languageId] || "Unknown";
  }

  export { getLanguageName };

  /** Languages allowed in JUDGE0_RUN (online-compiler) mode — no JavaScript. */
  export const RUN_MODE_LANGUAGES = ["C", "CPP", "JAVA", "PYTHON"];

  export function getLanguageId(language) {
    const languageMap = {
      "PYTHON": 71,
      "JAVASCRIPT": 63,
      "JAVA": 62,
      "TYPESCRIPT": 74,
      "C": 50,
      "CPP": 54,
      "C++": 54,
    };
    return languageMap[language.toUpperCase()];
  }

  export function getProblemTestCases(problem) {
    return problem?.testCases ?? problem?.testcases ?? [];
  }

  export function getCodeSnippet(codeSnippets, language) {
    if (!codeSnippets) return "";
    const key = Object.keys(codeSnippets).find(
      (k) => k.toUpperCase() === String(language).toUpperCase()
    );
    return key ? codeSnippets[key] : "";
  }

  export function toMonacoLanguage(language) {
    const map = {
      JAVASCRIPT: "javascript",
      PYTHON: "python",
      JAVA: "java",
      TYPESCRIPT: "typescript",
      C: "c",
      CPP: "cpp",
      "C++": "cpp",
    };
    return map[String(language).toUpperCase()] ?? "javascript";
  }

  export function formatLanguageLabel(language) {
    const labels = {
      C: "C",
      CPP: "C++",
      "C++": "C++",
      JAVA: "Java",
      PYTHON: "Python",
      JAVASCRIPT: "Javascript",
      TYPESCRIPT: "Typescript",
    };
    const key = String(language).toUpperCase();
    return labels[key] ?? language.charAt(0) + language.slice(1).toLowerCase();
  }

  /** Language options for the editor dropdown. */
  export function getAvailableLanguages(problem) {
    if (
      problem?.executionMode === "JUDGE0_RUN" ||
      problem?.type === "PRACTICAL"
    ) {
      return [...RUN_MODE_LANGUAGES];
    }
    return Object.keys(problem?.codeSnippets || {}).map((k) => k.toUpperCase());
  }
