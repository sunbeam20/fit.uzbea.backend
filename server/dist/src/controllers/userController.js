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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoles = exports.getUserStats = exports.activateUser = exports.deactivateUser = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = exports.updateProfile = exports.getCurrentUser = void 0;
const prisma_1 = require("../../generated/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new prisma_1.PrismaClient();
// Generate user ID
const generateUserId = () => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield prisma.users.count();
    return `USR-${(count + 1).toString().padStart(5, '0')}`;
});
// ====================== USER PROFILE CONTROLLERS ======================
// Get current user profile
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Get token from Authorization header
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Verify token (you might want to reuse your JWT verification logic)
        // For now, let's assume user ID is passed in headers or we have middleware
        const userId = req.headers['x-user-id'] || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
            return;
        }
        const user = yield prisma.users.findUnique({
            where: { id: parseInt(userId) },
            include: {
                Roles: true,
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Remove password from response
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching user profile",
        });
    }
});
exports.getCurrentUser = getCurrentUser;
// Update current user profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.headers['x-user-id'] || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const { name, email, phone, address, currentPassword, newPassword } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Find user
        const user = yield prisma.users.findUnique({
            where: { id: parseInt(userId) },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Prepare update data
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (phone && { phone })), (address && { address }));
        // Handle password change
        if (newPassword) {
            if (!currentPassword) {
                res.status(400).json({
                    success: false,
                    message: "Current password is required to set new password"
                });
                return;
            }
            // Verify current password
            const isValidPassword = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isValidPassword) {
                res.status(400).json({
                    success: false,
                    message: "Current password is incorrect"
                });
                return;
            }
            // Validate new password
            if (newPassword.length < 6) {
                res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long"
                });
                return;
            }
            // Hash new password
            updateData.password = yield bcryptjs_1.default.hash(newPassword, 10);
        }
        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingEmail = yield prisma.users.findFirst({
                where: {
                    email,
                    id: { not: user.id }
                },
            });
            if (existingEmail) {
                res.status(400).json({
                    success: false,
                    message: "Email already in use"
                });
                return;
            }
        }
        // Update user
        const updatedUser = yield prisma.users.update({
            where: { id: parseInt(userId) },
            data: updateData,
            include: {
                Roles: true,
            },
        });
        // Remove password from response
        const { password: _ } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
            message: "Profile updated successfully",
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating profile",
        });
    }
});
exports.updateProfile = updateProfile;
// ====================== USER MANAGEMENT CONTROLLERS (Admin Only) ======================
// Get all users with pagination, search, and filters
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = "1", limit = "10", search = "", role = "all", status = "all" } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where clause
        const where = {};
        if (search && typeof search === "string") {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { userId: { contains: search, mode: "insensitive" } },
            ];
        }
        if (role !== "all") {
            where.Roles = { name: role };
        }
        if (status !== "all") {
            where.status = status;
        }
        // Get users with pagination
        const [users, total] = yield Promise.all([
            prisma.users.findMany({
                where,
                include: {
                    Roles: true,
                },
                skip,
                take: limitNum,
                orderBy: {
                    id: "desc",
                },
            }),
            prisma.users.count({ where }),
        ]);
        // Remove passwords from response
        const usersWithoutPasswords = users.map(user => {
            const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
            return userWithoutPassword;
        });
        res.status(200).json({
            success: true,
            users: usersWithoutPasswords,
            totalCount: total,
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            hasNext: skip + limitNum < total,
            hasPrev: pageNum > 1,
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching users",
        });
    }
});
exports.getAllUsers = getAllUsers;
// Get user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield prisma.users.findUnique({
            where: { id: parseInt(id) },
            include: {
                Roles: true,
                Sales: {
                    take: 5,
                    orderBy: { id: "desc" },
                    select: {
                        id: true,
                        saleNo: true,
                        totalAmount: true,
                        createdAt: true,
                    },
                },
                Purchases: {
                    take: 5,
                    orderBy: { id: "desc" },
                    select: {
                        id: true,
                        purchaseNo: true,
                        totalAmount: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Remove password from response
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Get user by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching user",
        });
    }
});
exports.getUserById = getUserById;
// Create new user (Admin only)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role_id, phone, address, status = "Active" } = req.body;
        // Validate required fields
        if (!name || !email || !password || !role_id) {
            res.status(400).json({
                success: false,
                message: "Name, email, password, and role are required"
            });
            return;
        }
        // Validate password
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
            return;
        }
        // Check if user already exists
        const existingUser = yield prisma.users.findFirst({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
            return;
        }
        // Check if role exists
        const role = yield prisma.roles.findUnique({
            where: { id: role_id },
        });
        if (!role) {
            res.status(400).json({
                success: false,
                message: "Invalid role"
            });
            return;
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = yield prisma.users.create({
            data: Object.assign(Object.assign(Object.assign({ userId: yield generateUserId(), name,
                email, password: hashedPassword, role_id }, (phone && { phone })), (address && { address })), { status }),
            include: {
                Roles: true,
            },
        });
        // Remove password from response
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(201).json({
            success: true,
            user: userWithoutPassword,
            message: "User created successfully",
        });
    }
    catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating user",
        });
    }
});
exports.createUser = createUser;
// Update user (Admin only)
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, role_id, phone, address, status } = req.body;
        // Check if user exists
        const existingUser = yield prisma.users.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Check if email is being changed and if it already exists
        if (email && email !== existingUser.email) {
            const emailExists = yield prisma.users.findFirst({
                where: {
                    email,
                    id: { not: parseInt(id) }
                },
            });
            if (emailExists) {
                res.status(400).json({
                    success: false,
                    message: "Email already in use"
                });
                return;
            }
        }
        // Check if role exists (if being changed)
        if (role_id) {
            const role = yield prisma.roles.findUnique({
                where: { id: role_id },
            });
            if (!role) {
                res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
                return;
            }
        }
        // Update user
        const updatedUser = yield prisma.users.update({
            where: { id: parseInt(id) },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (role_id && { role_id })), (phone && { phone })), (address && { address })), (status && { status })),
            include: {
                Roles: true,
            },
        });
        // Remove password from response
        const { password: _ } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
            message: "User updated successfully",
        });
    }
    catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error updating user",
        });
    }
});
exports.updateUser = updateUser;
// Delete user (Admin only - Hard delete)
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = yield prisma.users.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Check if user has any related records
        const [hasSales, hasPurchases, hasProducts, hasServices] = yield Promise.all([
            prisma.sales.findFirst({
                where: { user_id: parseInt(id) },
                select: { id: true }
            }),
            prisma.purchases.findFirst({
                where: { user_id: parseInt(id) },
                select: { id: true }
            }),
            prisma.products.findFirst({
                where: {
                    OR: [
                        { created_by: parseInt(id) },
                        { updated_by: parseInt(id) }
                    ]
                },
                select: { id: true }
            }),
            prisma.services.findFirst({
                where: { user_id: parseInt(id) },
                select: { id: true }
            }),
        ]);
        if (hasSales || hasPurchases || hasProducts || hasServices) {
            res.status(400).json({
                success: false,
                message: "Cannot delete user with existing records. Deactivate instead."
            });
            return;
        }
        // Delete user
        yield prisma.users.delete({
            where: { id: parseInt(id) },
        });
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error deleting user",
        });
    }
});
exports.deleteUser = deleteUser;
// Deactivate user (Admin only - Soft delete)
const deactivateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = yield prisma.users.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Update user status to Inactive
        const updatedUser = yield prisma.users.update({
            where: { id: parseInt(id) },
            data: { status: "Inactive" },
            include: {
                Roles: true,
            },
        });
        // Remove password from response
        const { password: _ } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
            message: "User deactivated successfully",
        });
    }
    catch (error) {
        console.error("Deactivate user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error deactivating user",
        });
    }
});
exports.deactivateUser = deactivateUser;
// Activate user (Admin only)
const activateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = yield prisma.users.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        // Update user status to Active
        const updatedUser = yield prisma.users.update({
            where: { id: parseInt(id) },
            data: { status: "Active" },
            include: {
                Roles: true,
            },
        });
        // Remove password from response
        const { password: _ } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json({
            success: true,
            user: userWithoutPassword,
            message: "User activated successfully",
        });
    }
    catch (error) {
        console.error("Activate user error:", error);
        res.status(500).json({
            success: false,
            message: "Server error activating user",
        });
    }
});
exports.activateUser = activateUser;
// Get user statistics
const getUserStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalUsers, activeUsers, inactiveUsers, adminUsers, salesUsers] = yield Promise.all([
            prisma.users.count(),
            prisma.users.count({ where: { status: "Active" } }),
            prisma.users.count({ where: { status: "Inactive" } }),
            prisma.users.count({
                where: {
                    Roles: { name: "Admin" }
                }
            }),
            prisma.users.count({
                where: {
                    Roles: { name: "Sales" }
                }
            }),
        ]);
        // Get manager users count if exists
        const managerUsers = yield prisma.users.count({
            where: {
                Roles: { name: "Manager" }
            }
        });
        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                adminUsers,
                salesUsers,
                managerUsers,
                otherUsers: totalUsers - adminUsers - salesUsers - managerUsers,
            },
        });
    }
    catch (error) {
        console.error("Get user stats error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching user statistics",
        });
    }
});
exports.getUserStats = getUserStats;
// Get all roles
const getRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roles = yield prisma.roles.findMany({
            orderBy: {
                id: "asc",
            },
        });
        res.status(200).json({
            success: true,
            roles,
        });
    }
    catch (error) {
        console.error("Get roles error:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching roles",
        });
    }
});
exports.getRoles = getRoles;
