import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Types
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role_id: number;
  phone?: string;
  address?: string;
  status?: "Active" | "Inactive";
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  role_id?: number;
  phone?: string;
  address?: string;
  status?: "Active" | "Inactive";
}

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Generate user ID
const generateUserId = async (): Promise<string> => {
  const count = await prisma.users.count();
  return `USR-${(count + 1).toString().padStart(5, '0')}`;
};

// ====================== USER PROFILE CONTROLLERS ======================

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
      return;
    }

    // Verify token (you might want to reuse your JWT verification logic)
    // For now, let's assume user ID is passed in headers or we have middleware
    const userId = req.headers['x-user-id'] || (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId as string) },
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
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    });
  }
};

// Update current user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] || (req as any).user?.id;
    const { name, email, phone, address, currentPassword, newPassword }: UpdateProfileRequest = req.body;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
      return;
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId as string) },
    });

    if (!user) {
      res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
      return;
    }

    // Prepare update data
    const updateData: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
    };

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
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
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
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingEmail = await prisma.users.findFirst({
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
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(userId as string) },
      data: updateData,
      include: {
        Roles: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
};

// ====================== USER MANAGEMENT CONTROLLERS (Admin Only) ======================

// Get all users with pagination, search, and filters
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = "1", 
      limit = "10", 
      search = "", 
      role = "all", 
      status = "all" 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { userId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role !== "all") {
      where.Roles = { name: role as string };
    }

    if (status !== "all") {
      where.status = status;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
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
      const { password: _, ...userWithoutPassword } = user;
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
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
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
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
    });
  }
};

// Create new user (Admin only)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role_id, phone, address, status = "Active" }: CreateUserRequest = req.body;

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
    const existingUser = await prisma.users.findFirst({
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
    const role = await prisma.roles.findUnique({
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        userId: await generateUserId(),
        name,
        email,
        password: hashedPassword,
        role_id,
        ...(phone && { phone }),
        ...(address && { address }),
        status,
      },
      include: {
        Roles: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      user: userWithoutPassword,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating user",
    });
  }
};

// Update user (Admin only)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role_id, phone, address, status }: UpdateUserRequest = req.body;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
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
      const emailExists = await prisma.users.findFirst({
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
      const role = await prisma.roles.findUnique({
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
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role_id && { role_id }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(status && { status }),
      },
      include: {
        Roles: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user",
    });
  }
};

// Delete user (Admin only - Hard delete)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
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
    const [hasSales, hasPurchases, hasProducts, hasServices] = await Promise.all([
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
    await prisma.users.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
};

// Deactivate user (Admin only - Soft delete)
export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
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
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Inactive" },
      include: {
        Roles: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deactivating user",
    });
  }
};

// Activate user (Admin only)
export const activateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
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
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Active" },
      include: {
        Roles: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: "User activated successfully",
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error activating user",
    });
  }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalUsers, activeUsers, inactiveUsers, adminUsers, salesUsers] = await Promise.all([
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
    const managerUsers = await prisma.users.count({ 
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
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user statistics",
    });
  }
};

// Get all roles
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.roles.findMany({
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching roles",
    });
  }
};