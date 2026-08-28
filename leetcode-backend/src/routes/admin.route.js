import express from "express";
import {
  createFaculty,
  getAdminOverview,
  listUsers,
  updateUserRole,
} from "../controllers/admin.controller.js";
import {
  addBatchMember,
  createBatch,
  deleteBatch,
  enrollByRange,
  getAllBatches,
  getBatchById,
  removeBatchMember,
  updateBatch,
} from "../controllers/batch.controller.js";
import {
  createOffering,
  deleteOffering,
  getAllOfferings,
} from "../controllers/offering.controller.js";
import { authMiddleware, checkAdmin } from "../middleware/auth.middleware.js";

const adminRoutes = express.Router();

// Applied to the whole router rather than per route, so a new admin endpoint
// cannot accidentally ship without the guard.
adminRoutes.use(authMiddleware, checkAdmin);

adminRoutes.get("/overview", getAdminOverview);

adminRoutes.get("/users", listUsers);
adminRoutes.post("/users/faculty", createFaculty);
adminRoutes.patch("/users/:id/role", updateUserRole);

adminRoutes.get("/batches", getAllBatches);
adminRoutes.post("/batches", createBatch);
adminRoutes.get("/batches/:id", getBatchById);
adminRoutes.patch("/batches/:id", updateBatch);
adminRoutes.delete("/batches/:id", deleteBatch);

adminRoutes.post("/batches/:id/enroll-range", enrollByRange);
adminRoutes.post("/batches/:id/members", addBatchMember);
adminRoutes.delete("/batches/:id/members/:userId", removeBatchMember);

adminRoutes.get("/offerings", getAllOfferings);
adminRoutes.post("/offerings", createOffering);
adminRoutes.delete("/offerings/:id", deleteOffering);

export default adminRoutes;
