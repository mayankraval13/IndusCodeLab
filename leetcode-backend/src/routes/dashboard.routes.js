import express from "express";
import {
  getAdminDashboard,
  getFacultyDashboard,
  getStudentDashboard,
} from "../controllers/dashboard.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const dashboardRoutes = express.Router();

dashboardRoutes.use(authMiddleware);

// One route per role rather than one polymorphic endpoint: the payload shapes
// have nothing in common, and a role guard per route is easier to audit than a
// switch inside a controller.
dashboardRoutes.get("/student", getStudentDashboard);
dashboardRoutes.get("/faculty", requireRole("FACULTY", "ADMIN"), getFacultyDashboard);
dashboardRoutes.get("/admin", requireRole("ADMIN"), getAdminDashboard);

export default dashboardRoutes;
