import express from "express";
import { authMiddleware, checkAdmin } from "../middleware/auth.middleware.js";
import {
  createCodeSession,
  addCodeSessionEvents,
  endCodeSession,
  getCodeSessionEvents,
} from "../controllers/codeSession.controller.js";

const codeSessionRoutes = express.Router();

codeSessionRoutes.post("/", authMiddleware, createCodeSession);
codeSessionRoutes.post("/:id/events", authMiddleware, addCodeSessionEvents);
codeSessionRoutes.put("/:id/end", authMiddleware, endCodeSession);
codeSessionRoutes.get(
  "/:id/events",
  authMiddleware,
  checkAdmin,
  getCodeSessionEvents,
);

export default codeSessionRoutes;
