import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  executeRun,
  submitPractical,
} from "../controllers/executeCode.controller.js";

const executeRoutes = express.Router();

executeRoutes.post("/run", authMiddleware, executeRun);
executeRoutes.post("/submit", authMiddleware, submitPractical);

export default executeRoutes;
