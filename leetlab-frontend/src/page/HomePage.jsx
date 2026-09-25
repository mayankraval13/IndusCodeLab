import { useAuthStore } from "../store/useAuthStore.js";
import AdminDashboard from "./AdminDashboard.jsx";
import FacultyDashboard from "./FacultyDashboard.jsx";
import StudentDashboard from "./StudentDashboard.jsx";

/**
 * Landing route. Each role gets a different dashboard rather than a shared page
 * with hidden panels, because they answer different questions: a student's
 * "what do I owe?", a faculty member's "who has delivered?", an admin's "what
 * is broken?".
 */
export default function HomePage() {
  const { authUser } = useAuthStore();

  if (authUser?.role === "ADMIN") return <AdminDashboard />;
  if (authUser?.role === "FACULTY") return <FacultyDashboard />;
  return <StudentDashboard />;
}
