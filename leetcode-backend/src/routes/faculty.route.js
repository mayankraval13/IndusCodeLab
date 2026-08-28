import express from "express";
import { getMyOfferings } from "../controllers/offering.controller.js";
import {
  createAssignment,
  deleteAssignment,
  getAssignmentRoster,
  getFacultyAssignment,
  listAssignableProblems,
  listFacultyAssignments,
  publishAssignment,
  updateAssignment,
} from "../controllers/assignment.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const facultyRoutes = express.Router();

// Applied to the whole router so a new faculty endpoint cannot ship unguarded.
// Per-record ownership is still enforced in every handler; this only proves the
// caller is a faculty member, not that the record is theirs.
facultyRoutes.use(authMiddleware, requireRole("FACULTY"));

facultyRoutes.get("/offerings", getMyOfferings);
facultyRoutes.get("/offerings/:offeringId/problems", listAssignableProblems);

facultyRoutes.get("/assignments", listFacultyAssignments);
facultyRoutes.post("/assignments", createAssignment);
facultyRoutes.get("/assignments/:id", getFacultyAssignment);
facultyRoutes.patch("/assignments/:id", updateAssignment);
facultyRoutes.delete("/assignments/:id", deleteAssignment);
facultyRoutes.post("/assignments/:id/publish", publishAssignment);
facultyRoutes.get("/assignments/:id/roster", getAssignmentRoster);

export default facultyRoutes;
