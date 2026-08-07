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
import ProblemPage from "./page/ProblemPage.jsx";
import PracticalProblemPage from "./page/PracticalProblemPage.jsx";
import Logo from "./components/ui/Logo.jsx";

export default function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

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
        </Route>
      </Routes>
    </>
  );
}
