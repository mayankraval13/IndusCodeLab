import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getAllSubmissions, getAllSubmissionsForProblem, getAllTheSubmissionsForProblem } from '../controllers/submission.controller.js';

const submissionRoutes = express.Router();

submissionRoutes.get('/get-all-submissions', authMiddleware, getAllSubmissions);
submissionRoutes.get('/get-all-submissions/:problemId', authMiddleware, getAllSubmissionsForProblem);
submissionRoutes.get('/get-submissions-count/:problemId', authMiddleware, getAllTheSubmissionsForProblem);

export default submissionRoutes;