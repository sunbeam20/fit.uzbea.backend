import express from "express";
import { register, login, logout, getMe } from "../controllers/authController";
import { getCurrentUser, updateProfile } from "../controllers/userController";
import { authenticate } from "../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Protected routes (require authentication)
router.get("/me", authenticate, getCurrentUser); // using userController's version
router.put("/profile", authenticate, updateProfile);

export default router;