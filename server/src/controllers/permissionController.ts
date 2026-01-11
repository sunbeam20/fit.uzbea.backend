import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// Get all permissions
export const getAllPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.permissions.findMany({
      orderBy: { id: 'asc' }
    });
    
    res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching permissions"
    });
  }
};

// Get role permissions
export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;
    
    const roleWithPermissions = await prisma.roles.findUnique({
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
  } catch (error) {
    console.error("Get role permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching role permissions"
    });
  }
};

// role permissions
export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role_id, permissions } = req.body;
    
    // Delete existing permissions for this role
    await prisma.rolePermissions.deleteMany({
      where: { role_id }
    });
    
    // Create new permissions
    const newPermissions = await prisma.rolePermissions.createMany({
      data: permissions.map((p: any) => ({
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
  } catch (error) {
    console.error("Update role permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating role permissions"
    });
  }
};

// Get user permissions (role + overrides)
export const getUserPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.users.findUnique({
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
    const rolePermissions = user.Roles?.rolePermissions || [];
    
    // Get user overrides (if any)
    let userOverrides = null;
    if (user.permissionOverrides) {
      try {
        userOverrides = JSON.parse(user.permissionOverrides as string);
      } catch (e) {
        console.error("Error parsing permissionOverrides:", e);
      }
    }
    
    res.status(200).json({
      success: true,
      rolePermissions,
      userOverrides
    });
  } catch (error) {
    console.error("Get user permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user permissions"
    });
  }
};

// user permission overrides
export const updateUserPermissionOverrides = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { overrides } = req.body;
    
    const user = await prisma.users.findUnique({
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
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(userId) },
      data: {
        permissionOverrides: JSON.stringify(overrides)
      }
    });
    
    res.status(200).json({
      success: true,
      message: "User permission overrides updated successfully"
    });
  } catch (error) {
    console.error("Update user permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user permissions"
    });
  }
};