import express from "express";
import { authMiddleware, checkAdmin } from "../middleware/auth.middleware.js";
import {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../controllers/subject.controller.js";

const subjectRoutes = express.Router();

subjectRoutes.post("/", authMiddleware, checkAdmin, createSubject);

subjectRoutes.get("/", authMiddleware, getAllSubjects);

subjectRoutes.get("/:id", authMiddleware, getSubjectById);

subjectRoutes.put("/:id", authMiddleware, checkAdmin, updateSubject);

subjectRoutes.delete("/:id", authMiddleware, checkAdmin, deleteSubject);

subjectRoutes.post(
  "/:subjectId/units",
  authMiddleware,
  checkAdmin,
  createUnit,
);

subjectRoutes.put(
  "/:subjectId/units/:unitId",
  authMiddleware,
  checkAdmin,
  updateUnit,
);

subjectRoutes.delete(
  "/:subjectId/units/:unitId",
  authMiddleware,
  checkAdmin,
  deleteUnit,
);

export default subjectRoutes;
