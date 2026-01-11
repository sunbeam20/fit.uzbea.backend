import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma";
import { generateId } from "../utils/idGenerator";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const register = async (req: Request, res: Response) => {
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
    const existingUser = await prisma.users.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    // Get default role
    const defaultRole = await prisma.roles.findFirst({
      where: { name: 'Sales' }
    });

    if (!defaultRole) {
      return res.status(500).json({
        message: 'Default role not found'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        userId: await generateId('users', 'USR'),
        name,
        email,
        password: hashedPassword,
        role_id: defaultRole.id,
        status: 'Active',
      },
      include: {
        Roles: true  // This should be 'roles' if you changed it in schema
      }
    });

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.Roles?.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        role: user.Roles?.name
      },
      token,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await prisma.users.findFirst({
      where: { 
        email,
        status: 'Active'
      },
      include: {
        Roles: true  // This should be 'roles' if you changed it in schema
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.Roles?.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        role: user.Roles?.name
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Find user
    const user = await prisma.users.findFirst({
      where: { 
        id: decoded.userId,
        status: 'Active'
      },
      include: {
        Roles: true  // This should be 'roles' if you changed it in schema
      }
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      role: user.Roles?.name
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({
      message: 'Invalid token'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  // Since we're using JWT tokens stored client-side, 
  // the logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
};

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        include: { Roles: true },  // This should be 'roles' if you changed it in schema
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
    } catch (jwtError: any) {
      console.error('JWT error:', jwtError);
      res.status(401).json({ 
        success: false,
        message: "Invalid or expired token" 
      });
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during authentication" 
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
      return;
    }

    if (!roles.includes(req.user.Roles?.name)) {
      res.status(403).json({ 
        success: false,
        message: "Insufficient permissions" 
      });
      return;
    }

    next();
  };
};
