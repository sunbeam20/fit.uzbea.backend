import express from "express";
import { 
  getAllPermissions, 
  getRolePermissions, 
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissionOverrides 
} from '../controllers/permissionController';
import { authenticate, authorize } from "../controllers/authController";

const router = express.Router();
// Permission routes
router.get('/permissions', authenticate, authorize(['Admin']), getAllPermissions);
router.get('/roles/:roleId/permissions', authenticate, authorize(['Admin']), getRolePermissions);
router.put('/roles/permissions', authenticate, authorize(['Admin']), updateRolePermissions);
router.get('/users/:userId/permissions', authenticate, getUserPermissions);
router.put('/users/:userId/permissions', authenticate, authorize(['Admin']), updateUserPermissionOverrides);


export default router;