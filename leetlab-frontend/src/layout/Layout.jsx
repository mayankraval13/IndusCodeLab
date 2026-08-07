import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

export default function Layout() {
  return (
    <div className="min-h-screen bg-ll-bg flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
