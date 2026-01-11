"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const userController_1 = require("../controllers/userController");
const authController_2 = require("../controllers/authController");
const router = express_1.default.Router();
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/logout", authController_1.logout);
// Protected routes (require authentication)
router.get("/me", authController_2.authenticate, userController_1.getCurrentUser); // using userController's version
router.put("/profile", authController_2.authenticate, userController_1.updateProfile);
exports.default = router;
