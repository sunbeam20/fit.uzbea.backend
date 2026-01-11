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
exports.checkDataPermission = exports.checkPageAccess = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Check page access
const checkPageAccess = (pageName) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }
            const user = yield prisma.users.findUnique({
                where: { id: userId },
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
            // Check user overrides first
            if (user.permissionOverrides) {
                try {
                    const overrides = JSON.parse(user.permissionOverrides);
                    if (overrides.pageAccess && overrides.pageAccess.includes(pageName)) {
                        next();
                        return;
                    }
                }
                catch (e) {
                    console.error("Error parsing permission overrides:", e);
                }
            }
            // Check role permissions
            const hasAccess = ((_c = (_b = user.Roles) === null || _b === void 0 ? void 0 : _b.rolePermissions) === null || _c === void 0 ? void 0 : _c.some((rp) => { var _a; return ((_a = rp.permissions) === null || _a === void 0 ? void 0 : _a.name) === `page_${pageName}` && rp.can_view; })) || false;
            if (hasAccess) {
                next();
            }
            else {
                res.status(403).json({
                    success: false,
                    message: "Access denied to this page"
                });
            }
        }
        catch (error) {
            console.error("Permission check error:", error);
            res.status(500).json({
                success: false,
                message: "Server error checking permissions"
            });
        }
    });
};
exports.checkPageAccess = checkPageAccess;
// Check data permission
const checkDataPermission = (permissionName) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }
            const user = yield prisma.users.findUnique({
                where: { id: userId },
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
            // Check user overrides first
            if (user.permissionOverrides) {
                try {
                    const overrides = JSON.parse(user.permissionOverrides);
                    if (overrides.dataPermissions && overrides.dataPermissions[permissionName]) {
                        next();
                        return;
                    }
                }
                catch (e) {
                    console.error("Error parsing permission overrides:", e);
                }
            }
            // Check role permissions
            const hasPermission = ((_c = (_b = user.Roles) === null || _b === void 0 ? void 0 : _b.rolePermissions) === null || _c === void 0 ? void 0 : _c.some((rp) => { var _a; return ((_a = rp.permissions) === null || _a === void 0 ? void 0 : _a.name) === permissionName && rp.can_view; })) || false;
            if (hasPermission) {
                next();
            }
            else {
                res.status(403).json({
                    success: false,
                    message: "Insufficient data permissions"
                });
            }
        }
        catch (error) {
            console.error("Data permission check error:", error);
            res.status(500).json({
                success: false,
                message: "Server error checking data permissions"
            });
        }
    });
};
exports.checkDataPermission = checkDataPermission;
