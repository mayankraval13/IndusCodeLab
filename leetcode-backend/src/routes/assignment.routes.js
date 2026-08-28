import express from "express";
import {
  getStudentAssignment,
  listStudentAssignments,
} from "../controllers/assignment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const assignmentRoutes = express.Router();

// The student-facing view. No role guard: what a caller sees is decided by
// their batch membership, so faculty and admins simply see nothing here.
assignmentRoutes.use(authMiddleware);

assignmentRoutes.get("/", listStudentAssignments);
assignmentRoutes.get("/:id", getStudentAssignment);

export default assignmentRoutes;
