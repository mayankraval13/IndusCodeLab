import { Link, useLocation } from "react-router-dom";
import {
  Beaker,
  BookOpen,
  Code2,
  Home,
  Lock,
  LogOut,
  ScrollText,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import LogoutButton from "./LogoutButton.jsx";
import Logo from "./ui/Logo.jsx";

const navLinkClass = (active) =>
  `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? "text-ll-text bg-ll-surface-2"
      : "text-ll-muted hover:text-ll-text hover:bg-ll-surface-2"
  }`;

export default function Navbar() {
  const { authUser } = useAuthStore();
  const location = useLocation();

  const isPracticals = location.pathname.startsWith("/practicals");
  const isProblems = location.pathname.startsWith("/problems");
  const isExams = location.pathname.startsWith("/exams");

  return (
    <header className="sticky top-0 z-50 border-b border-ll-border bg-ll-surface/95 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Logo size="sm" />
          <nav className="hidden sm:flex items-center gap-1">
            <Link to="/" className={navLinkClass(location.pathname === "/")}>
              <span className="flex items-center gap-1.5">
                <Home className="w-4 h-4" />
                Home
              </span>
            </Link>
            <Link to="/practicals" className={navLinkClass(isPracticals)}>
              <span className="flex items-center gap-1.5">
                <Beaker className="w-4 h-4" />
                Practicals
              </span>
            </Link>
            <Link to="/problems" className={navLinkClass(isProblems)}>
              <span className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                Problems
              </span>
            </Link>
            <span
              className={`${navLinkClass(isExams)} opacity-50 cursor-not-allowed inline-flex items-center gap-1.5`}
              title="Exams coming soon"
            >
              <ScrollText className="w-4 h-4" />
              Exams
              <Lock className="w-3 h-3" />
            </span>
            {authUser?.role === "ADMIN" && (
              <>
                <Link
                  to="/add-problem"
                  className={navLinkClass(location.pathname === "/add-problem")}
                >
                  Create
                </Link>
                <Link
                  to="/admin/subjects"
                  className={navLinkClass(
                    location.pathname === "/admin/subjects",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    Subjects
                  </span>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-ll-muted truncate max-w-[160px]">
            {authUser?.email}
          </span>
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="flex items-center gap-2 cursor-pointer rounded-lg p-1 hover:bg-ll-surface-2 transition-colors"
            >
              <img
                src={
                  authUser?.image ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser?.email}`
                }
                alt=""
                className="w-8 h-8 rounded-full ring-2 ring-ll-border"
              />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content menu mt-2 z-50 p-2 ll-panel rounded-xl w-52 shadow-xl"
            >
              <li className="px-3 py-2 border-b border-ll-border mb-1">
                <p className="font-semibold text-sm truncate">
                  {authUser?.name || "User"}
                </p>
                <p className="text-xs text-ll-muted truncate">{authUser?.role}</p>
              </li>
              <li>
                <Link to="/practicals" className="flex items-center gap-2 text-sm">
                  <Beaker className="w-4 h-4" />
                  Practicals
                </Link>
              </li>
              <li>
                <Link to="/problems" className="flex items-center gap-2 text-sm">
                  <Code2 className="w-4 h-4" />
                  Problems
                </Link>
              </li>
              {authUser?.role === "ADMIN" && (
                <>
                  <li>
                    <Link
                      to="/add-problem"
                      className="flex items-center gap-2 text-sm"
                    >
                      <Code2 className="w-4 h-4" />
                      Add Problem
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/subjects"
                      className="flex items-center gap-2 text-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      Subjects
                    </Link>
                  </li>
                </>
              )}
              <li>
                <LogoutButton className="flex items-center gap-2 text-sm text-ll-error w-full justify-start px-3 py-2 rounded-lg hover:bg-ll-surface-2">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </LogoutButton>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
