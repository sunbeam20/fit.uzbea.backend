import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma";

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
      where: { name: 'user' }
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
        name,
        email,
        password: hashedPassword,
        role_id: defaultRole.id,
        status: 'Active',
      },
      include: {
        Roles: true
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
        Roles: true
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
        Roles: true
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