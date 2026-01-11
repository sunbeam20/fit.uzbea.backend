"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
// Middleware for authentication and authorization
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// ====================== PUBLIC USER PROFILE ROUTES ======================
// These require authentication but not necessarily admin role
router.get("/profile", authController_1.authenticate, userController_1.getCurrentUser);
router.put("/profile", authController_1.authenticate, userController_1.updateProfile);
// ====================== ADMIN USER MANAGEMENT ROUTES ======================
// All routes below require admin role
router.use(authController_1.authenticate);
router.use((0, authController_1.authorize)(["Super Admin"]));
// User management
router.get("/", userController_1.getAllUsers);
router.get("/stats", userController_1.getUserStats);
router.get("/roles", userController_1.getRoles);
router.get("/:id", userController_1.getUserById);
router.post("/", userController_1.createUser);
router.put("/:id", userController_1.updateUser);
router.delete("/:id", userController_1.deleteUser);
router.put("/:id/deactivate", userController_1.deactivateUser);
router.put("/:id/activate", userController_1.activateUser);
exports.default = router;
