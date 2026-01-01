import { Request, Response } from 'express';
import { PrismaClient } from "../../generated/prisma";
import { generateId } from '../utils/idGenerator';

const prisma = new PrismaClient();

// GET all sales returns
export const getSalesReturns = async (req: Request, res: Response) => {
  try {
    const salesReturns = await prisma.salesReturn.findMany({
      include: {
        SalesReturnItems: {
          include: {
            Products: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Transform the data to match frontend interface
    const transformedReturns = salesReturns.map(returnItem => ({
      id: returnItem.id,
      return_number: `SRN-${returnItem.id.toString().padStart(3, '0')}`, // Generate return number
      original_invoice: `INV-${returnItem.sales_id.toString().padStart(3, '0')}`, // Generate invoice number from sales_id
      customer_name: returnItem.Customers?.name || 'N/A',
      customer_phone: returnItem.Customers?.phone || '',
      customer_address: returnItem.Customers?.address || '',
      date: new Date().toISOString().split('T')[0], // Use current date or add date field to schema
      total_amount: parseFloat(returnItem.total_payback.toString()),
      reason: returnItem.note,
      status: 'completed', // Default status since not in schema
      refund_method: 'Cash', // Default refund method since not in schema
      items: returnItem.SalesReturnItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.Products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        return_reason: 'Defective' // Default reason since not in schema
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json(transformedReturns);
  } catch (error) {
    console.error("Error fetching sales returns:", error);
    res.status(500).json({ message: "Error retrieving sales returns" });
  }
};

// GET single sales return by ID
export const getSalesReturnById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id: parseInt(id) },
      include: {
        SalesReturnItems: {
          include: {
            Products: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    if (!salesReturn) {
      res.status(404).json({ message: "Sales return not found" });
      return;
    }

    // Transform the data
    const transformedReturn = {
      id: salesReturn.id,
      return_number: `SRN-${salesReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${salesReturn.sales_id.toString().padStart(3, '0')}`,
      customer_name: salesReturn.Customers?.name || 'N/A',
      customer_phone: salesReturn.Customers?.phone || '',
      customer_address: salesReturn.Customers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(salesReturn.total_payback.toString()),
      reason: salesReturn.note,
      status: 'completed',
      refund_method: 'Cash',
      items: salesReturn.SalesReturnItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.Products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        return_reason: 'Defective'
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedReturn);
  } catch (error) {
    console.error("Error fetching sales return:", error);
    res.status(500).json({ message: "Error retrieving sales return" });
  }
};

// POST create new sales return
export const createSalesReturn = async (req: Request, res: Response) => {
  try {
    const { 
      sales_id, 
      user_id, 
      customer_id, 
      total_payback, 
      note, 
      items 
    } = req.body;

    // Validate required fields
    if (!sales_id || !user_id || !customer_id || !total_payback || !items || !Array.isArray(items)) {
      res.status(400).json({ 
        message: "Missing required fields: sales_id, user_id, customer_id, total_payback, items" 
      });
      return;
    }

    // Create sales return
    const newSalesReturn = await prisma.salesReturn.create({
      data: {
        returnNo: await generateId('salesReturn', 'SRN'),
        sales_id: parseInt(sales_id),
        user_id: parseInt(user_id),
        customer_id: parseInt(customer_id),
        total_payback: parseFloat(total_payback),
        note: note || 'No reason provided',
        SalesReturnItems: {
          create: items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unitPrice: item.price
          }))
        }
      },
      include: {
        SalesReturnItems: {
          include: {
            Products: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    // Transform the response
    const transformedReturn = {
      id: newSalesReturn.id,
      return_number: `SRN-${newSalesReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${newSalesReturn.sales_id.toString().padStart(3, '0')}`,
      customer_name: newSalesReturn.Customers?.name || 'N/A',
      customer_phone: newSalesReturn.Customers?.phone || '',
      customer_address: newSalesReturn.Customers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(newSalesReturn.total_payback.toString()),
      reason: newSalesReturn.note,
      status: 'completed',
      refund_method: 'Cash',
      items: newSalesReturn.SalesReturnItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.Products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        return_reason: 'Defective'
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json(transformedReturn);
  } catch (error) {
    console.error("Error creating sales return:", error);
    res.status(500).json({ message: "Error creating sales return" });
  }
};

// PUT update sales return
export const updateSalesReturn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note, total_payback } = req.body;

    const updatedSalesReturn = await prisma.salesReturn.update({
      where: { id: parseInt(id) },
      data: {
        note,
        total_payback: total_payback ? parseFloat(total_payback) : undefined
      },
      include: {
        SalesReturnItems: {
          include: {
            Products: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    // Transform the response
    const transformedReturn = {
      id: updatedSalesReturn.id,
      return_number: `SRN-${updatedSalesReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${updatedSalesReturn.sales_id.toString().padStart(3, '0')}`,
      customer_name: updatedSalesReturn.Customers?.name || 'N/A',
      customer_phone: updatedSalesReturn.Customers?.phone || '',
      customer_address: updatedSalesReturn.Customers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(updatedSalesReturn.total_payback.toString()),
      reason: updatedSalesReturn.note,
      status: 'completed',
      refund_method: 'Cash',
      items: updatedSalesReturn.SalesReturnItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.Products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        return_reason: 'Defective'
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedReturn);
  } catch (error) {
    console.error("Error updating sales return:", error);
    res.status(500).json({ message: "Error updating sales return" });
  }
};

// DELETE sales return
export const deleteSalesReturn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First delete related items
    await prisma.salesReturnItems.deleteMany({
      where: { salesReturn_id: parseInt(id) }
    });

    // Then delete the sales return
    await prisma.salesReturn.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Sales return deleted successfully" });
  } catch (error) {
    console.error("Error deleting sales return:", error);
    res.status(500).json({ message: "Error deleting sales return" });
  }
};