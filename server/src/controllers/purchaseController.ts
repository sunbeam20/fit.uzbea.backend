import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { generateId } from "../utils/idGenerator";

const prisma = new PrismaClient();
// Get all purchases with related data
export const getAllPurchases = async (req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchases.findMany({
      include: {
        Suppliers: true,
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        PurchasesItems: {
          include: {
            Products: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get single purchase by ID
export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchases.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        Suppliers: true,
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        PurchasesItems: {
          include: {
            Products: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Create new purchase
export const createPurchase = async (req: Request, res: Response) => {
  try {
    const {
      totalAmount,
      totalPaid,
      dueDate,
      note,
      supplier_id,
      user_id,
      items,
    } = req.body;

    // Validate required fields
    if (
      !totalAmount ||
      !supplier_id ||
      !user_id ||
      !items ||
      !Array.isArray(items)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: totalAmount, supplier_id, user_id, and items array are required",
      });
    }

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the purchase
      const purchase = await tx.purchases.create({
        data: {
          purchaseNo: await generateId("purchases", "PUR"),
          totalAmount: parseFloat(totalAmount),
          totalPaid: parseFloat(totalPaid || 0),
          dueDate: new Date(dueDate),
          note: note || "",
          supplier_id: parseInt(supplier_id),
          user_id: parseInt(user_id),
        },
      });

      // Create purchase items
      const purchaseItems = await Promise.all(
        items.map(async (item: any) => {
          const { product_id, quantity, unitPrice } = item;

          // Update product quantity
          await tx.products.update({
            where: { id: parseInt(product_id) },
            data: {
              quantity: {
                increment: parseInt(quantity),
              },
            },
          });

          return tx.purchasesItems.create({
            data: {
              quantity: parseInt(quantity),
              unitPrice: parseFloat(unitPrice),
              purchase_id: purchase.id,
              product_id: parseInt(product_id),
            },
            include: {
              Products: true,
            },
          });
        })
      );

      return {
        purchase,
        items: purchaseItems,
      };
    });

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create purchase",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update purchase
export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalAmount, totalPaid, dueDate, note, supplier_id, items } =
      req.body;

    // Check if purchase exists
    const existingPurchase = await prisma.purchases.findUnique({
      where: { id: parseInt(id) },
      include: { PurchasesItems: true },
    });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update purchase
      const updatedPurchase = await tx.purchases.update({
        where: { id: parseInt(id) },
        data: {
          ...(totalAmount && { totalAmount: parseFloat(totalAmount) }),
          ...(totalPaid && { totalPaid: parseFloat(totalPaid) }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(note !== undefined && { note }),
          ...(supplier_id && { supplier_id: parseInt(supplier_id) }),
        },
      });

      // If items are provided, update them
      if (items && Array.isArray(items)) {
        // First, revert old quantities
        await Promise.all(
          existingPurchase.PurchasesItems.map(async (oldItem) => {
            await tx.products.update({
              where: { id: oldItem.product_id },
              data: {
                quantity: {
                  decrement: oldItem.quantity,
                },
              },
            });
          })
        );

        // Delete old items
        await tx.purchasesItems.deleteMany({
          where: { purchase_id: parseInt(id) },
        });

        // Create new items with updated quantities
        const newItems = await Promise.all(
          items.map(async (item: any) => {
            const { product_id, quantity, unitPrice } = item;

            // Update product quantity with new values
            await tx.products.update({
              where: { id: parseInt(product_id) },
              data: {
                quantity: {
                  increment: parseInt(quantity),
                },
              },
            });

            return tx.purchasesItems.create({
              data: {
                quantity: parseInt(quantity),
                unitPrice: parseFloat(unitPrice),
                purchase_id: parseInt(id),
                product_id: parseInt(product_id),
              },
              include: {
                Products: true,
              },
            });
          })
        );

        return {
          purchase: updatedPurchase,
          items: newItems,
        };
      }

      return {
        purchase: updatedPurchase,
        items: existingPurchase.PurchasesItems,
      };
    });

    res.json({
      success: true,
      message: "Purchase updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update purchase",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Delete purchase
export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if purchase exists
    const existingPurchase = await prisma.purchases.findUnique({
      where: { id: parseInt(id) },
      include: { PurchasesItems: true },
    });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // Start transaction to revert product quantities
    await prisma.$transaction(async (tx) => {
      // Revert product quantities
      await Promise.all(
        existingPurchase.PurchasesItems.map(async (item) => {
          await tx.products.update({
            where: { id: item.product_id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        })
      );

      // Delete purchase items first (due to foreign key constraints)
      await tx.purchasesItems.deleteMany({
        where: { purchase_id: parseInt(id) },
      });

      // Delete the purchase
      await tx.purchases.delete({
        where: { id: parseInt(id) },
      });
    });

    res.json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete purchase",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get purchases by supplier
export const getPurchasesBySupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    const purchases = await prisma.purchases.findMany({
      where: {
        supplier_id: parseInt(supplierId),
      },
      include: {
        Suppliers: true,
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        PurchasesItems: {
          include: {
            Products: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases by supplier:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases by supplier",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get purchase statistics
// Get purchase statistics
export const getPurchaseStatistics = async (req: Request, res: Response) => {
  try {
    const totalPurchases = await prisma.purchases.count();
    const totalAmount = await prisma.purchases.aggregate({
      _sum: {
        totalAmount: true,
      },
    });
    const totalPaid = await prisma.purchases.aggregate({
      _sum: {
        totalPaid: true,
      },
    });

    // Convert Decimal to number for arithmetic operations
    const totalAmountNum = totalAmount._sum.totalAmount
      ? Number(totalAmount._sum.totalAmount)
      : 0;
    const totalPaidNum = totalPaid._sum.totalPaid
      ? Number(totalPaid._sum.totalPaid)
      : 0;
    const totalDue = totalAmountNum - totalPaidNum;

    // Get recent purchases
    const recentPurchases = await prisma.purchases.findMany({
      take: 5,
      orderBy: {
        id: "desc",
      },
      include: {
        Suppliers: true,
      },
    });

    res.json({
      success: true,
      data: {
        totalPurchases,
        totalAmount: totalAmountNum,
        totalPaid: totalPaidNum,
        totalDue,
        recentPurchases,
      },
    });
  } catch (error) {
    console.error("Error fetching purchase statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Search purchases
export const searchPurchases = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    console.log("Purchase search query received:", query);

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    const purchases = await prisma.purchases.findMany({
      where: {
        OR: [
          {
            purchaseNo: {
              // ← ADD THIS: Search by purchase number
              contains: query,
              mode: "insensitive",
            },
          },
          {
            Suppliers: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            Suppliers: {
              phone: {
                contains: query,
              },
            },
          },
        ],
      },
      include: {
        Suppliers: true,
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        PurchasesItems: {
          include: {
            Products: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 20,
    });

    console.log(`Found ${purchases.length} purchases`);
    res.json(purchases); // Just return the array, not wrapped in { success, data }
  } catch (error) {
    console.error("Search purchases error:", error);
    res.status(500).json({
      error: "Failed to search purchases",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
