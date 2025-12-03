import { Request, Response } from 'express';
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface SaleItem {
  product_id: number;
  quantity: number;
  unitPrice: number;
}

interface CreateSaleBody {
  customer_id: number;
  user_id: number;
  totalAmount: number;
  totalPaid?: number;
  dueDate: string;
  items: SaleItem[];
}

interface UpdateSaleBody {
  totalPaid?: number;
  dueDate?: string;
  customer_id?: number;
  user_id?: number;
}

// Get all sales with related data
export const getAllSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const sales = await prisma.sales.findMany({
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                retailPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        // created_at: 'desc',
      },
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

// Get single sale by ID
export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const sale = await prisma.sales.findUnique({
      where: { id: parseInt(id) },
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                retailPrice: true,
                wholesalePrice: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
};

// Create new sale
export const createSale = async (req: Request<{}, {}, CreateSaleBody>, res: Response): Promise<void> => {
  try {
    const {
      customer_id,
      user_id,
      totalAmount,
      totalPaid,
      dueDate,
      items,
    } = req.body;

    // Validate required fields
    if (!customer_id || !user_id || !totalAmount || !items || !items.length) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Create the sale
      const sale = await prisma.sales.create({
        data: {
          totalAmount,
          totalPaid: totalPaid || 0,
          dueDate: new Date(dueDate),
          customer_id: parseInt(customer_id as any),
          user_id: parseInt(user_id as any),
        },
      });

      // Create sale items and update product quantities
      const saleItems = await Promise.all(
        items.map(async (item) => {
          // Create sale item
          const saleItem = await prisma.salesItems.create({
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sales_id: sale.id,
              product_id: item.product_id,
            },
          });

          // Update product quantity
          await prisma.products.update({
            where: { id: item.product_id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          return saleItem;
        })
      );

      return { sale, saleItems };
    });

    // Fetch the complete sale with relations
    const completeSale = await prisma.sales.findUnique({
      where: { id: result.sale.id },
      include: {
        Customers: true,
        Users: true,
        SalesItems: {
          include: {
            Products: true,
          },
        },
      },
    });

    res.status(201).json(completeSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
};

// Update sale
export const updateSale = async (req: Request<{ id: string }, {}, UpdateSaleBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalPaid, dueDate, customer_id, user_id } = req.body;

    const updatedSale = await prisma.sales.update({
      where: { id: parseInt(id) },
      data: {
        ...(totalPaid !== undefined && { totalPaid }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(customer_id && { customer_id: parseInt(customer_id as any) }),
        ...(user_id && { user_id: parseInt(user_id as any) }),
      },
      include: {
        Customers: true,
        Users: true,
        SalesItems: {
          include: {
            Products: true,
          },
        },
      },
    });

    res.json(updatedSale);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update sale' });
  }
};

// Delete sale
export const deleteSale = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Start transaction to ensure data consistency
    await prisma.$transaction(async (prisma) => {
      // First, get all sale items to restore product quantities
      const saleItems = await prisma.salesItems.findMany({
        where: { sales_id: parseInt(id) },
        include: {
          Products: true,
        },
      });

      // Restore product quantities
      await Promise.all(
        saleItems.map(async (item) => {
          await prisma.products.update({
            where: { id: item.product_id },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        })
      );

      // Delete sale items
      await prisma.salesItems.deleteMany({
        where: { sales_id: parseInt(id) },
      });

      // Delete the sale
      await prisma.sales.delete({
        where: { id: parseInt(id) },
      });
    });

    res.json({ message: 'Sale deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete sale' });
  }
};

// Get sales statistics
export const getSalesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalSales = await prisma.sales.count();
    
    const totalRevenue = await prisma.sales.aggregate({
      _sum: {
        totalAmount: true,
      },
    });

    const totalPaid = await prisma.sales.aggregate({
      _sum: {
        totalPaid: true,
      },
    });

    const pendingSales = await prisma.sales.count({
      where: {
        totalPaid: {
          lt: prisma.sales.fields.totalAmount,
        },
      },
    });

    const completedSales = await prisma.sales.count({
      where: {
        totalPaid: {
          gte: prisma.sales.fields.totalAmount,
        },
      },
    });

    // Convert Decimal to number for arithmetic operations
    const totalRevenueValue = Number(totalRevenue._sum.totalAmount) || 0;
    const totalPaidValue = Number(totalPaid._sum.totalPaid) || 0;

    res.json({
      totalSales,
      totalRevenue: totalRevenueValue,
      totalPaid: totalPaidValue,
      pendingSales,
      completedSales,
      totalDue: totalRevenueValue - totalPaidValue,
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
};

// Get sales by date range
export const getSalesByDateRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    // Check what date fields are available in your Sales model
    // Adjust the where clause based on your actual schema
    const sales = await prisma.sales.findMany({
      where: {
        // Use the appropriate date field from your schema
        // If you have a 'date' field, use that instead
        // created_at: {
        //   gte: new Date(startDate as string),
        //   lte: new Date(endDate as string),
        // },
      },
      include: {
        Customers: {
          select: {
            name: true,
            phone: true,
          },
        },
        Users: {
          select: {
            name: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc', // Use id if created_at doesn't work
      },
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by date range:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};