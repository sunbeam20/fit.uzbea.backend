import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

// Check page access
export const checkPageAccess = (pageName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required"
        });
        return;
      }
      
      const user = await prisma.users.findUnique({
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
          const overrides = JSON.parse(user.permissionOverrides as string);
          if (overrides.pageAccess && overrides.pageAccess.includes(pageName)) {
            next();
            return;
          }
        } catch (e) {
          console.error("Error parsing permission overrides:", e);
        }
      }
      
      // Check role permissions
      const hasAccess = user.Roles?.rolePermissions?.some((rp: any) => 
        rp.permissions?.name === `page_${pageName}` && rp.can_view
      ) || false;
      
      if (hasAccess) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: "Access denied to this page"
        });
      }
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        message: "Server error checking permissions"
      });
    }
  };
};

// Check data permission
export const checkDataPermission = (permissionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required"
        });
        return;
      }
      
      const user = await prisma.users.findUnique({
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
          const overrides = JSON.parse(user.permissionOverrides as string);
          if (overrides.dataPermissions && overrides.dataPermissions[permissionName]) {
            next();
            return;
          }
        } catch (e) {
          console.error("Error parsing permission overrides:", e);
        }
      }
      
      // Check role permissions
      const hasPermission = user.Roles?.rolePermissions?.some((rp: any) => 
        rp.permissions?.name === permissionName && rp.can_view
      ) || false;
      
      if (hasPermission) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: "Insufficient data permissions"
        });
      }
    } catch (error) {
      console.error("Data permission check error:", error);
      res.status(500).json({
        success: false,
        message: "Server error checking data permissions"
      });
    }
  };
};