"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPermissionOverrides = exports.getUserPermissions = exports.updateRolePermissions = exports.getRolePermissions = exports.getAllPermissions = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Get all permissions
const getAllPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const permissions = yield prisma.permissions.findMany({
            orderBy: { id: 'asc' }
        });
        res.status(200).json({
            success: true,
            permissions
        });
    }
    catch (error) {
        console.error("Get permissions error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching permissions"
        });
    }
});
exports.getAllPermissions = getAllPermissions;
// Get role permissions
const getRolePermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roleId } = req.params;
        const roleWithPermissions = yield prisma.roles.findUnique({
            where: { id: parseInt(roleId) },
            include: {
                rolePermissions: {
                    include: {
                        Permissions: true
                    }
                }
            }
        });
        if (!roleWithPermissions) {
            res.status(404).json({
                success: false,
                message: "Role not found"
            });
            return;
        }
        res.status(200).json({
            success: true,
            role: roleWithPermissions
        });
    }
    catch (error) {
        console.error("Get role permissions error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching role permissions"
        });
    }
});
exports.getRolePermissions = getRolePermissions;
// role permissions
const updateRolePermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role_id, permissions } = req.body;
        // Delete existing permissions for this role
        yield prisma.rolePermissions.deleteMany({
            where: { role_id }
        });
        // Create new permissions
        const newPermissions = yield prisma.rolePermissions.createMany({
            data: permissions.map((p) => ({
                role_id,
                permission_id: p.permission_id,
                can_view: p.can_view || false,
                can_create: p.can_create || false,
                can_edit: p.can_edit || false,
                can_delete: p.can_delete || false
            }))
        });
        res.status(200).json({
            success: true,
            message: "Role permissions updated successfully"
        });
    }
    catch (error) {
        console.error("Update role permissions error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating role permissions"
        });
    }
});
exports.updateRolePermissions = updateRolePermissions;
// Get user permissions (role + overrides)
const getUserPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        const user = yield prisma.users.findUnique({
            where: { id: parseInt(userId) },
            include: {
                Roles: {
                    include: {
                        rolePermissions: {
                            include: {
                                Permissions: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Get role permissions
        const rolePermissions = ((_a = user.Roles) === null || _a === void 0 ? void 0 : _a.rolePermissions) || [];
        // Get user overrides (if any)
        let userOverrides = null;
        if (user.permissionOverrides) {
            try {
                userOverrides = JSON.parse(user.permissionOverrides);
            }
            catch (e) {
                console.error("Error parsing permissionOverrides:", e);
            }
        }
        res.status(200).json({
            success: true,
            rolePermissions,
            userOverrides
        });
    }
    catch (error) {
        console.error("Get user permissions error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching user permissions"
        });
    }
});
exports.getUserPermissions = getUserPermissions;
// user permission overrides
const updateUserPermissionOverrides = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { overrides } = req.body;
        const user = yield prisma.users.findUnique({
            where: { id: parseInt(userId) }
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Update user with permission overrides
        const updatedUser = yield prisma.users.update({
            where: { id: parseInt(userId) },
            data: {
                permissionOverrides: JSON.stringify(overrides)
            }
        });
        res.status(200).json({
            success: true,
            message: "User permission overrides updated successfully"
        });
    }
    catch (error) {
        console.error("Update user permissions error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating user permissions"
        });
    }
});
exports.updateUserPermissionOverrides = updateUserPermissionOverrides;
