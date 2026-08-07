import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { executeRun } from "../controllers/executeCode.controller.js";

const executeRoutes = express.Router();

executeRoutes.post("/run", authMiddleware, executeRun);

export default executeRoutes;
