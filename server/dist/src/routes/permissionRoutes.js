"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permissionController_1 = require("../controllers/permissionController");
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Permission routes
router.get('/permissions', authController_1.authenticate, (0, authController_1.authorize)(['Admin']), permissionController_1.getAllPermissions);
router.get('/roles/:roleId/permissions', authController_1.authenticate, (0, authController_1.authorize)(['Admin']), permissionController_1.getRolePermissions);
router.put('/roles/permissions', authController_1.authenticate, (0, authController_1.authorize)(['Admin']), permissionController_1.updateRolePermissions);
router.get('/users/:userId/permissions', authController_1.authenticate, permissionController_1.getUserPermissions);
router.put('/users/:userId/permissions', authController_1.authenticate, (0, authController_1.authorize)(['Admin']), permissionController_1.updateUserPermissionOverrides);
exports.default = router;
