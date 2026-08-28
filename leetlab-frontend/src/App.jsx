import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import AdminAllocationsPage from "./page/AdminAllocationsPage.jsx";
import FacultySectionsPage from "./page/FacultySectionsPage.jsx";
import FacultyOfferingPage from "./page/FacultyOfferingPage.jsx";
import FacultyAssignmentPage from "./page/FacultyAssignmentPage.jsx";
import StudentAssignmentsPage from "./page/StudentAssignmentsPage.jsx";
import StudentAssignmentPage from "./page/StudentAssignmentPage.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
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
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={authUser ? <HomePage /> : <Navigate to="/login" />}
          />
          <Route
            path="practicals"
            element={authUser ? <PracticalsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="practicals/:subjectId/units/:unitId"
            element={
              authUser ? <PracticalUnitPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="problems"
            element={authUser ? <ProblemsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="exams"
            element={authUser ? <ExamsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="assignments"
            element={
              authUser ? <StudentAssignmentsPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="assignments/:id"
            element={
              authUser ? <StudentAssignmentPage /> : <Navigate to="/login" />
            }
          />
        </Route>

        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/problem/:id"
          element={authUser ? <ProblemPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/practical/:id"
          element={
            authUser ? <PracticalProblemPage /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/practicals/:subjectId/units/:unitId/problems/:id"
          element={
            authUser ? <PracticalProblemPage /> : <Navigate to="/login" />
          }
        />
        <Route element={<AdminRoute />}>
          <Route
            path="/add-problem"
            element={authUser ? <AddProblem /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/subjects"
            element={authUser ? <AdminSubjectsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/batches"
            element={authUser ? <AdminBatchesPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/faculty"
            element={authUser ? <AdminFacultyPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/allocations"
            element={authUser ? <AdminAllocationsPage /> : <Navigate to="/" />}
          />
        </Route>
        <Route element={<RoleRoute roles={["FACULTY"]} />}>
          <Route path="/faculty/sections" element={<FacultySectionsPage />} />
          <Route
            path="/faculty/offerings/:offeringId"
            element={<FacultyOfferingPage />}
          />
          <Route
            path="/faculty/assignments/:id"
            element={<FacultyAssignmentPage />}
          />
        </Route>
      </Routes>
    </>
  );
}
