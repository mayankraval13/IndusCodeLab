import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";

import HomePage from "./page/HomePage.jsx";
import PracticalsPage from "./page/PracticalsPage.jsx";
import PracticalUnitPage from "./page/PracticalUnitPage.jsx";
import ProblemsPage from "./page/ProblemsPage.jsx";
import ExamsPage from "./page/ExamsPage.jsx";
import LoginPage from "./page/LoginPage.jsx";
import SignUpPage from "./page/SignUpPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import Layout from "./layout/Layout.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AddProblem from "./page/AddProblem.jsx";
import AdminSubjectsPage from "./page/AdminSubjectsPage.jsx";
import AdminBatchesPage from "./page/AdminBatchesPage.jsx";
import AdminFacultyPage from "./page/AdminFacultyPage.jsx";
import AdminStudentsPage from "./page/AdminStudentsPage.jsx";
import AdminAllocationsPage from "./page/AdminAllocationsPage.jsx";
import FacultySectionsPage from "./page/FacultySectionsPage.jsx";
import FacultyOfferingPage from "./page/FacultyOfferingPage.jsx";
import FacultyAssignmentPage from "./page/FacultyAssignmentPage.jsx";
import StudentAssignmentsPage from "./page/StudentAssignmentsPage.jsx";
import StudentAssignmentPage from "./page/StudentAssignmentPage.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ProblemPage from "./page/ProblemPage.jsx";
import PracticalProblemPage from "./page/PracticalProblemPage.jsx";
import ChangePasswordPage from "./page/ChangePasswordPage.jsx";
import Logo from "./components/ui/Logo.jsx";

export default function App() {
  const { authUser, checkAuth, isCheckingAuth, passwordChangeRequired } =
    useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="min-h-screen bg-ll-bg flex flex-col items-center justify-center gap-6">
        <Logo showText />
        <Loader2 className="w-8 h-8 text-ll-accent animate-spin" />
      </div>
    );
  }

  // Replaces the router entirely: the server rejects every other route until
  // the password is changed, so there is nowhere else worth navigating to.
  if (authUser && passwordChangeRequired) {
    return (
      <>
        <Toaster
          position="top-center"
          toastOptions={{
            className: "!bg-ll-surface !text-ll-text !border !border-ll-border",
            duration: 3000,
          }}
        />
        <ChangePasswordPage />
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: "!bg-ll-surface !text-ll-text !border !border-ll-border",
          duration: 3000,
        }}
      />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            {/* Alias, so a bookmarked or linked /dashboard still lands right. */}
            <Route path="dashboard" element={<HomePage />} />
            <Route path="practicals" element={<PracticalsPage />} />
            <Route
              path="practicals/:subjectId/units/:unitId"
              element={<PracticalUnitPage />}
            />
            <Route path="problems" element={<ProblemsPage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="assignments" element={<StudentAssignmentsPage />} />
            <Route path="assignments/:id" element={<StudentAssignmentPage />} />

            {/* Management pages keep the navbar: without it there is no way
                back out of them other than the browser's back button. */}
            <Route element={<AdminRoute />}>
              <Route path="add-problem" element={<AddProblem />} />
              <Route path="admin/subjects" element={<AdminSubjectsPage />} />
              <Route path="admin/batches" element={<AdminBatchesPage />} />
              <Route path="admin/faculty" element={<AdminFacultyPage />} />
              <Route path="admin/students" element={<AdminStudentsPage />} />
              <Route
                path="admin/allocations"
                element={<AdminAllocationsPage />}
              />
            </Route>

            <Route element={<RoleRoute roles={["FACULTY"]} />}>
              <Route path="faculty/sections" element={<FacultySectionsPage />} />
              <Route
                path="faculty/offerings/:offeringId"
                element={<FacultyOfferingPage />}
              />
              <Route
                path="faculty/assignments/:id"
                element={<FacultyAssignmentPage />}
              />
            </Route>
          </Route>

          {/* Full-screen editor routes deliberately sit outside the layout. */}
          <Route path="/problem/:id" element={<ProblemPage />} />
          <Route path="/practical/:id" element={<PracticalProblemPage />} />
          <Route
            path="/practicals/:subjectId/units/:unitId/problems/:id"
            element={<PracticalProblemPage />}
          />
        </Route>

        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <RedirectAfterAuth />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <RedirectAfterAuth />}
        />
      </Routes>
    </>
  );
}

/** Returns the user to the page that bounced them, falling back to the dashboard. */
function RedirectAfterAuth() {
  const location = useLocation();
  return <Navigate to={location.state?.from ?? "/"} replace />;
}
