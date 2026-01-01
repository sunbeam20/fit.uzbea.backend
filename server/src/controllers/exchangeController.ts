import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { generateId } from '../utils/idGenerator';

const prisma = new PrismaClient();

// Helper function to convert Decimal to number
const toNumber = (value: any): number => {
  return parseFloat(value.toString());
};

// GET all exchanges
export const getExchanges = async (req: Request, res: Response) => {
  try {
    const exchanges = await prisma.exchanges.findMany({
      include: {
        ExchangeItems: {
          include: {
            oldProduct: true,
            newProduct: true
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
    const transformedExchanges = exchanges.map(exchange => {
      const totalPaid = toNumber(exchange.totalPaid);
      const totalPayback = toNumber(exchange.totalPayback);
      const netAmount = totalPaid - totalPayback;

      return {
        id: exchange.id,
        exchange_number: `EXC-${exchange.id.toString().padStart(3, '0')}`,
        original_invoice: `INV-${exchange.sales_id.toString().padStart(3, '0')}`,
        customer_name: exchange.Customers?.name || 'N/A',
        customer_phone: exchange.Customers?.phone || '',
        customer_address: exchange.Customers?.address || '',
        date: exchange.Sales?.dueDate ? exchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        total_paid: totalPaid,
        total_payback: totalPayback,
        net_amount: netAmount,
        reason: exchange.note,
        status: 'completed',
        items: exchange.ExchangeItems.map(item => ({
          id: item.id,
          old_product_id: item.oldProduct_id,
          old_product_name: item.oldProduct?.name || 'Unknown Product',
          new_product_id: item.newProduct_id,
          new_product_name: item.newProduct?.name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: toNumber(item.unitPrice),
          note: item.note
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    res.json(transformedExchanges);
  } catch (error) {
    console.error("Error fetching exchanges:", error);
    res.status(500).json({ message: "Error retrieving exchanges" });
  }
};

// GET single exchange by ID
export const getExchangeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exchange = await prisma.exchanges.findUnique({
      where: { id: parseInt(id) },
      include: {
        ExchangeItems: {
          include: {
            oldProduct: true,
            newProduct: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    if (!exchange) {
      res.status(404).json({ message: "Exchange not found" });
      return;
    }

    // Transform the data
    const totalPaid = toNumber(exchange.totalPaid);
    const totalPayback = toNumber(exchange.totalPayback);
    const netAmount = totalPaid - totalPayback;

    const transformedExchange = {
      id: exchange.id,
      exchange_number: `EXC-${exchange.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${exchange.sales_id.toString().padStart(3, '0')}`,
      customer_name: exchange.Customers?.name || 'N/A',
      customer_phone: exchange.Customers?.phone || '',
      customer_address: exchange.Customers?.address || '',
      date: exchange.Sales?.dueDate ? exchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      total_paid: totalPaid,
      total_payback: totalPayback,
      net_amount: netAmount,
      reason: exchange.note,
      status: 'completed',
      items: exchange.ExchangeItems.map(item => ({
        id: item.id,
        old_product_id: item.oldProduct_id,
        old_product_name: item.oldProduct?.name || 'Unknown Product',
        new_product_id: item.newProduct_id,
        new_product_name: item.newProduct?.name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: toNumber(item.unitPrice),
        note: item.note
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedExchange);
  } catch (error) {
    console.error("Error fetching exchange:", error);
    res.status(500).json({ message: "Error retrieving exchange" });
  }
};

// POST create new exchange
export const createExchange = async (req: Request, res: Response) => {
  try {
    const { 
      sales_id, 
      user_id, 
      customer_id, 
      totalPaid, 
      totalPayback, 
      note, 
      items 
    } = req.body;

    // Validate required fields
    if (!sales_id || !user_id || !customer_id || !totalPaid || !totalPayback || !items || !Array.isArray(items)) {
      res.status(400).json({ 
        message: "Missing required fields: sales_id, user_id, customer_id, totalPaid, totalPayback, items" 
      });
      return;
    }

    // Create exchange
    const newExchange = await prisma.exchanges.create({
      data: {
        exchangeNo: await generateId('exchanges', 'EXC'),
        sales_id: parseInt(sales_id),
        user_id: parseInt(user_id),
        customer_id: parseInt(customer_id),
        totalPaid: parseFloat(totalPaid),
        totalPayback: parseFloat(totalPayback),
        note: note || 'No reason provided',
        ExchangeItems: {
          create: items.map((item: any) => ({
            oldProduct_id: item.old_product_id,
            newProduct_id: item.new_product_id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            note: item.note || ''
          }))
        }
      },
      include: {
        ExchangeItems: {
          include: {
            oldProduct: true,
            newProduct: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    // Transform the response
    const totalPaidNum = toNumber(newExchange.totalPaid);
    const totalPaybackNum = toNumber(newExchange.totalPayback);
    const netAmount = totalPaidNum - totalPaybackNum;

    const transformedExchange = {
      id: newExchange.id,
      exchange_number: `EXC-${newExchange.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${newExchange.sales_id.toString().padStart(3, '0')}`,
      customer_name: newExchange.Customers?.name || 'N/A',
      customer_phone: newExchange.Customers?.phone || '',
      customer_address: newExchange.Customers?.address || '',
      date: newExchange.Sales?.dueDate ? newExchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      total_paid: totalPaidNum,
      total_payback: totalPaybackNum,
      net_amount: netAmount,
      reason: newExchange.note,
      status: 'completed',
      items: newExchange.ExchangeItems.map(item => ({
        id: item.id,
        old_product_id: item.oldProduct_id,
        old_product_name: item.oldProduct?.name || 'Unknown Product',
        new_product_id: item.newProduct_id,
        new_product_name: item.newProduct?.name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: toNumber(item.unitPrice),
        note: item.note
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json(transformedExchange);
  } catch (error) {
    console.error("Error creating exchange:", error);
    res.status(500).json({ message: "Error creating exchange" });
  }
};

// PUT update exchange
export const updateExchange = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note, totalPaid, totalPayback } = req.body;

    const updatedExchange = await prisma.exchanges.update({
      where: { id: parseInt(id) },
      data: {
        note,
        totalPaid: totalPaid ? parseFloat(totalPaid) : undefined,
        totalPayback: totalPayback ? parseFloat(totalPayback) : undefined
      },
      include: {
        ExchangeItems: {
          include: {
            oldProduct: true,
            newProduct: true
          }
        },
        Customers: true,
        Sales: true,
        Users: true
      }
    });

    // Transform the response
    const totalPaidNum = toNumber(updatedExchange.totalPaid);
    const totalPaybackNum = toNumber(updatedExchange.totalPayback);
    const netAmount = totalPaidNum - totalPaybackNum;

    const transformedExchange = {
      id: updatedExchange.id,
      exchange_number: `EXC-${updatedExchange.id.toString().padStart(3, '0')}`,
      original_invoice: `INV-${updatedExchange.sales_id.toString().padStart(3, '0')}`,
      customer_name: updatedExchange.Customers?.name || 'N/A',
      customer_phone: updatedExchange.Customers?.phone || '',
      customer_address: updatedExchange.Customers?.address || '',
      date: updatedExchange.Sales?.dueDate ? updatedExchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      total_paid: totalPaidNum,
      total_payback: totalPaybackNum,
      net_amount: netAmount,
      reason: updatedExchange.note,
      status: 'completed',
      items: updatedExchange.ExchangeItems.map(item => ({
        id: item.id,
        old_product_id: item.oldProduct_id,
        old_product_name: item.oldProduct?.name || 'Unknown Product',
        new_product_id: item.newProduct_id,
        new_product_name: item.newProduct?.name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: toNumber(item.unitPrice),
        note: item.note
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedExchange);
  } catch (error) {
    console.error("Error updating exchange:", error);
    res.status(500).json({ message: "Error updating exchange" });
  }
};

// DELETE exchange
export const deleteExchange = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First delete related items
    await prisma.exchangesItems.deleteMany({
      where: { exchangeId: parseInt(id) }
    });

    // Then delete the exchange
    await prisma.exchanges.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Exchange deleted successfully" });
  } catch (error) {
    console.error("Error deleting exchange:", error);
    res.status(500).json({ message: "Error deleting exchange" });
  }
};