import express from "express";
import {
  getCurrentUser,
  updateProfile,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
  getRoles,
} from "../controllers/userController";

// Middleware for authentication and authorization
import { authenticate, authorize } from "../controllers/authController";

const router = express.Router();

// ====================== PUBLIC USER PROFILE ROUTES ======================
// These require authentication but not necessarily admin role
router.get("/profile", authenticate, getCurrentUser);
router.put("/profile", authenticate, updateProfile);

// ====================== ADMIN USER MANAGEMENT ROUTES ======================
// All routes below require admin role
router.use(authenticate);
router.use(authorize(["Super Admin"]));

// User management
router.get("/", getAllUsers);
router.get("/stats", getUserStats);
router.get("/roles", getRoles);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.put("/:id/deactivate", deactivateUser);
router.put("/:id/activate", activateUser);

export default router;