import express from "express";
import {
  changePassword,
  check,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";
import { authMiddlewareAllowPasswordChange } from "../middleware/auth.middleware.js";
const authRoutes = express.Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", authMiddlewareAllowPasswordChange, logout);
authRoutes.get("/check", authMiddlewareAllowPasswordChange, check);
authRoutes.post(
  "/change-password",
  authMiddlewareAllowPasswordChange,
  changePassword
);

export default authRoutes;
