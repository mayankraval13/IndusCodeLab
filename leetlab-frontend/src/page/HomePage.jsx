import { Link } from "react-router-dom";
import {
  ArrowRight,
  Beaker,
  Code2,
  Lock,
  ScrollText,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

const sections = [
  {
    key: "practicals",
    title: "Practicals",
    description:
      "Lab-style work organized by subject and unit — structured course practicals.",
    to: "/practicals",
    icon: Beaker,
    accent: "text-ll-easy",
    accentBg: "bg-ll-easy/15",
    locked: false,
  },
  {
    key: "problems",
    title: "Problems",
    description:
      "Practice coding problems for interviews and skill building.",
    to: "/problems",
    icon: Code2,
    accent: "text-ll-accent",
    accentBg: "bg-ll-accent/15",
    locked: false,
  },
  {
    key: "exams",
    title: "Exams",
    description:
      "Timed assessments added by faculty. Opening soon.",
    to: "/exams",
    icon: ScrollText,
    accent: "text-ll-medium",
    accentBg: "bg-ll-medium/15",
    locked: true,
  },
];

export default function HomePage() {
  const { authUser } = useAuthStore();

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back
          {authUser?.name ? `, ${authUser.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-ll-muted mt-2 text-sm sm:text-base max-w-xl">
          Start with practicals for your courses, then sharpen skills with
          practice problems. Exams will appear here when faculty publish them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {sections.map((section) => {
          const Icon = section.icon;
          const card = (
            <div
              className={`ll-panel rounded-xl p-6 h-full relative overflow-hidden transition-colors ${
                section.locked
                  ? "cursor-not-allowed"
                  : "hover:border-ll-border-light group"
              }`}
            >
              {section.locked && (
                <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-ll-bg/50 flex flex-col items-center justify-center gap-2">
                  <Lock className="w-6 h-6 text-ll-muted" />
                  <span className="text-sm font-medium text-ll-muted">
                    Coming soon
                  </span>
                </div>
              )}

              <div
                className={`w-11 h-11 rounded-lg ${section.accentBg} ${section.accent} flex items-center justify-center mb-5`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
              <p className="text-sm text-ll-muted leading-relaxed mb-6">
                {section.description}
              </p>

              {!section.locked && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ll-accent group-hover:gap-2.5 transition-all">
                  Open
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </div>
          );

          if (section.locked) {
            return (
              <div key={section.key} aria-disabled="true">
                {card}
              </div>
            );
          }

          return (
            <Link key={section.key} to={section.to} className="block">
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
