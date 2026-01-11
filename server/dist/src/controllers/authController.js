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
exports.authorize = exports.authenticate = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, email, password, password_confirmation } = req.body;
        // Validation
        if (!name || !email || !password || !password_confirmation) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }
        if (password !== password_confirmation) {
            return res.status(400).json({
                message: 'Passwords do not match'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long'
            });
        }
        // Check if user already exists
        const existingUser = yield prisma.users.findFirst({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }
        // Get default role
        const defaultRole = yield prisma.roles.findFirst({
            where: { name: 'Sales' }
        });
        if (!defaultRole) {
            return res.status(500).json({
                message: 'Default role not found'
            });
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = yield prisma.users.create({
            data: {
                userId: yield (0, idGenerator_1.generateId)('users', 'USR'),
                name,
                email,
                password: hashedPassword,
                role_id: defaultRole.id,
                status: 'Active',
            },
            include: {
                Roles: true // This should be 'roles' if you changed it in schema
            }
        });
        // Generate token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: (_a = user.Roles) === null || _a === void 0 ? void 0 : _a.name
        }, JWT_SECRET, { expiresIn: '24h' });
        // Return user data (without password)
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json({
            user: Object.assign(Object.assign({}, userWithoutPassword), { role: (_b = user.Roles) === null || _b === void 0 ? void 0 : _b.name }),
            token,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }
        // Find user
        const user = yield prisma.users.findFirst({
            where: {
                email,
                status: 'Active'
            },
            include: {
                Roles: true // This should be 'roles' if you changed it in schema
            }
        });
        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }
        // Check password
        const isValidPassword = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: (_a = user.Roles) === null || _a === void 0 ? void 0 : _a.name
        }, JWT_SECRET, { expiresIn: '24h' });
        // Return user data (without password)
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json({
            user: Object.assign(Object.assign({}, userWithoutPassword), { role: (_b = user.Roles) === null || _b === void 0 ? void 0 : _b.name }),
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Find user
        const user = yield prisma.users.findFirst({
            where: {
                id: decoded.userId,
                status: 'Active'
            },
            include: {
                Roles: true // This should be 'roles' if you changed it in schema
            }
        });
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        // Return user data (without password)
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json(Object.assign(Object.assign({}, userWithoutPassword), { role: (_b = user.Roles) === null || _b === void 0 ? void 0 : _b.name }));
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(401).json({
            message: 'Invalid token'
        });
    }
});
exports.getMe = getMe;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Since we're using JWT tokens stored client-side, 
    // the logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully' });
});
exports.logout = logout;
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "No token provided"
            });
            return;
        }
        const token = authHeader.replace("Bearer ", "");
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = yield prisma.users.findUnique({
                where: { id: decoded.userId },
                include: { Roles: true }, // This should be 'roles' if you changed it in schema
            });
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: "User not found"
                });
                return;
            }
            // Check if user is active
            if (user.status !== "Active") {
                res.status(403).json({
                    success: false,
                    message: "Account is inactive"
                });
                return;
            }
            req.user = user;
            next();
        }
        catch (jwtError) {
            console.error('JWT error:', jwtError);
            res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
            return;
        }
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during authentication"
        });
    }
});
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        var _a;
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        if (!roles.includes((_a = req.user.Roles) === null || _a === void 0 ? void 0 : _a.name)) {
            res.status(403).json({
                success: false,
                message: "Insufficient permissions"
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
