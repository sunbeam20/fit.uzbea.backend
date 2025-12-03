import { Request, Response } from 'express';
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface CreateCustomerBody {
  name: string;
  email?: string;
  phone: string;
  address?: string;
}

interface UpdateCustomerBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Get all customers
export const getAllCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customers.findMany({
      include: {
        Sales: {
          select: {
            id: true,
            totalAmount: true,
            totalPaid: true,
          },
        },
        SalesReturn: {
          select: {
            id: true,
            total_payback: true,
          },
        },
        Exchanges: {
          select: {
            id: true,
            totalPaid: true,
            totalPayback: true,
          },
        },
        Services: {
          select: {
            id: true,
            serviceProductName: true,
            serviceCost: true,
            serviceStatus: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Get single customer by ID
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customers.findUnique({
      where: { id: parseInt(id) },
      include: {
        Sales: {
          include: {
            SalesItems: {
              include: {
                Products: true,
              },
            },
            Users: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        },
        SalesReturn: {
          include: {
            SalesReturnItems: {
              include: {
                Products: true,
              },
            },
            Users: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        },
        Exchanges: {
          include: {
            ExchangeItems: {
              include: {
                oldProduct: true,
                newProduct: true,
              },
            },
            Users: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        },
        Services: {
          include: {
            Users: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Create new customer
export const createCustomer = async (req: Request<{}, {}, CreateCustomerBody>, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      address,
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required fields' });
      return;
    }

    // Check if email already exists
    if (email) {
      const existingCustomer = await prisma.customers.findUnique({
        where: { email },
      });

      if (existingCustomer) {
        res.status(400).json({ error: 'Customer with this email already exists' });
        return;
      }
    }

    const customer = await prisma.customers.create({
      data: {
        name,
        email: email || null,
        phone,
        address: address || null,
      },
      include: {
        Sales: true,
        SalesReturn: true,
        Exchanges: true,
        Services: true,
      },
    });

    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Error creating customer:', error);
    
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Customer with this email or phone already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// Update customer
export const updateCustomer = async (req: Request<{ id: string }, {}, UpdateCustomerBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customers.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check if email is being updated and if it already exists
    if (email && email !== existingCustomer.email) {
      const customerWithEmail = await prisma.customers.findUnique({
        where: { email },
      });

      if (customerWithEmail) {
        res.status(400).json({ error: 'Customer with this email already exists' });
        return;
      }
    }

    const updatedCustomer = await prisma.customers.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
      },
      include: {
        Sales: true,
        SalesReturn: true,
        Exchanges: true,
        Services: true,
      },
    });

    res.json(updatedCustomer);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Customer with this email or phone already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// Delete customer
export const deleteCustomer = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if customer has any related records
    const customerWithRelations = await prisma.customers.findUnique({
      where: { id: parseInt(id) },
      include: {
        Sales: true,
        SalesReturn: true,
        Exchanges: true,
        Services: true,
      },
    });

    if (!customerWithRelations) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check if customer has any sales, returns, exchanges, or services
    const hasRelations = 
      customerWithRelations.Sales.length > 0 ||
      customerWithRelations.SalesReturn.length > 0 ||
      customerWithRelations.Exchanges.length > 0 ||
      customerWithRelations.Services.length > 0;

    if (hasRelations) {
      res.status(400).json({ 
        error: 'Cannot delete customer with existing sales, returns, exchanges, or services. Please delete related records first.' 
      });
      return;
    }

    await prisma.customers.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// Search customers - FIXED VERSION
export const searchCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // Use the correct Prisma query mode
    const customers = await prisma.customers.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive' as const, // Use const assertion
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive' as const, // Use const assertion
            },
          },
          {
            phone: {
              contains: query,
            },
          },
        ],
      },
      include: {
        Sales: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 50, // Limit results
    });

    res.json(customers);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
};

// Get customer statistics
export const getCustomerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalCustomers = await prisma.customers.count();
    
    const customersWithSales = await prisma.customers.count({
      where: {
        Sales: {
          some: {},
        },
      },
    });

    const topCustomers = await prisma.customers.findMany({
      include: {
        Sales: {
          select: {
            totalAmount: true,
          },
        },
      },
      orderBy: {
        Sales: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    const customersWithTotalSales = topCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      totalSales: customer.Sales.length,
      totalRevenue: customer.Sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
    }));

    res.json({
      totalCustomers,
      customersWithSales,
      customersWithoutSales: totalCustomers - customersWithSales,
      topCustomers: customersWithTotalSales,
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ error: 'Failed to fetch customer statistics' });
  }
};

// Get customers with pagination - FIXED VERSION
export const getCustomersWithPagination = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Fixed where clause with proper Prisma types
    const whereClause = search ? {
      OR: [
        {
          name: {
            contains: search as string,
            mode: 'insensitive' as const,
          },
        },
        {
          email: {
            contains: search as string,
            mode: 'insensitive' as const,
          },
        },
        {
          phone: {
            contains: search as string,
          },
        },
      ],
    } : {};

    const [customers, totalCount] = await Promise.all([
      prisma.customers.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              Sales: true,
              SalesReturn: true,
              Exchanges: true,
              Services: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limitNum,
      }),
      prisma.customers.count({ where: whereClause }),
    ]);

    res.json({
      customers,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasNext: pageNum < Math.ceil(totalCount / limitNum),
      hasPrev: pageNum > 1,
    });
  } catch (error) {
    console.error('Error fetching customers with pagination:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};