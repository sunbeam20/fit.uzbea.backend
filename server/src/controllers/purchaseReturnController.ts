import { Request, Response } from 'express';
import { PrismaClient } from "../../generated/prisma";
import { generateId } from '../utils/idGenerator';

const prisma = new PrismaClient();

// GET all purchase returns
export const getPurchaseReturns = async (req: Request, res: Response) => {
  try {
    const purchaseReturns = await prisma.purchasesReturn.findMany({
      include: {
        PurchasesReturnItems: {
          include: {
            Products: true
          }
        },
        Suppliers: true,
        Purchases: true,
        Users: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Transform the data to match frontend interface
    const transformedReturns = purchaseReturns.map(returnItem => ({
      id: returnItem.id,
      return_number: `PRN-${returnItem.id.toString().padStart(3, '0')}`,
      original_invoice: `PUR-${returnItem.purchase_id.toString().padStart(3, '0')}`,
      supplier_name: returnItem.Suppliers?.name || 'N/A',
      supplier_phone: returnItem.Suppliers?.phone || '',
      supplier_address: returnItem.Suppliers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(returnItem.totalPaid.toString()),
      reason: returnItem.note,
      status: 'completed',
      refund_method: 'Credit Note',
      items: returnItem.PurchasesReturnItems.map(item => ({
        id: item.id,
        product_id: item.products_id,
        product_name: item.Products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        return_reason: 'Defective'
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json(transformedReturns);
  } catch (error) {
    console.error("Error fetching purchase returns:", error);
    res.status(500).json({ message: "Error retrieving purchase returns" });
  }
};

// GET single purchase return by ID
export const getPurchaseReturnById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const purchaseReturn = await prisma.purchasesReturn.findUnique({
      where: { id: parseInt(id) },
      include: {
        PurchasesReturnItems: {
          include: {
            Products: true
          }
        },
        Suppliers: true,
        Purchases: true,
        Users: true
      }
    });

    if (!purchaseReturn) {
      res.status(404).json({ message: "Purchase return not found" });
      return;
    }

    // Transform the data
    const transformedReturn = {
      id: purchaseReturn.id,
      return_number: `PRN-${purchaseReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `PUR-${purchaseReturn.purchase_id.toString().padStart(3, '0')}`,
      supplier_name: purchaseReturn.Suppliers?.name || 'N/A',
      supplier_phone: purchaseReturn.Suppliers?.phone || '',
      supplier_address: purchaseReturn.Suppliers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(purchaseReturn.totalPaid.toString()),
      reason: purchaseReturn.note,
      status: 'completed',
      refund_method: 'Credit Note',
      items: purchaseReturn.PurchasesReturnItems.map(item => ({
        id: item.id,
        product_id: item.products_id,
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
    console.error("Error fetching purchase return:", error);
    res.status(500).json({ message: "Error retrieving purchase return" });
  }
};

// POST create new purchase return
export const createPurchaseReturn = async (req: Request, res: Response) => {
  try {
    const { 
      purchase_id, 
      user_id, 
      supplier_id, 
      totalPaid, 
      note, 
      items 
    } = req.body;

    // Validate required fields
    if (!purchase_id || !user_id || !supplier_id || !totalPaid || !items || !Array.isArray(items)) {
      res.status(400).json({ 
        message: "Missing required fields: purchase_id, user_id, supplier_id, totalPaid, items" 
      });
      return;
    }

    // Create purchase return
    const newPurchaseReturn = await prisma.purchasesReturn.create({
      data: {
        returnNo: await generateId('purchasesReturn', 'PRN'),
        purchase_id: parseInt(purchase_id),
        user_id: parseInt(user_id),
        supplier_id: parseInt(supplier_id),
        totalPaid: parseFloat(totalPaid),
        note: note || 'No reason provided',
        PurchasesReturnItems: {
          create: items.map((item: any) => ({
            products_id: item.product_id,
            quantity: item.quantity,
            unitPrice: item.price
          }))
        }
      },
      include: {
        PurchasesReturnItems: {
          include: {
            Products: true
          }
        },
        Suppliers: true,
        Purchases: true,
        Users: true
      }
    });

    // Transform the response
    const transformedReturn = {
      id: newPurchaseReturn.id,
      return_number: `PRN-${newPurchaseReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `PUR-${newPurchaseReturn.purchase_id.toString().padStart(3, '0')}`,
      supplier_name: newPurchaseReturn.Suppliers?.name || 'N/A',
      supplier_phone: newPurchaseReturn.Suppliers?.phone || '',
      supplier_address: newPurchaseReturn.Suppliers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(newPurchaseReturn.totalPaid.toString()),
      reason: newPurchaseReturn.note,
      status: 'completed',
      refund_method: 'Credit Note',
      items: newPurchaseReturn.PurchasesReturnItems.map(item => ({
        id: item.id,
        product_id: item.products_id,
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
    console.error("Error creating purchase return:", error);
    res.status(500).json({ message: "Error creating purchase return" });
  }
};

// PUT update purchase return
export const updatePurchaseReturn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note, totalPaid } = req.body;

    const updatedPurchaseReturn = await prisma.purchasesReturn.update({
      where: { id: parseInt(id) },
      data: {
        note,
        totalPaid: totalPaid ? parseFloat(totalPaid) : undefined
      },
      include: {
        PurchasesReturnItems: {
          include: {
            Products: true
          }
        },
        Suppliers: true,
        Purchases: true,
        Users: true
      }
    });

    // Transform the response
    const transformedReturn = {
      id: updatedPurchaseReturn.id,
      return_number: `PRN-${updatedPurchaseReturn.id.toString().padStart(3, '0')}`,
      original_invoice: `PUR-${updatedPurchaseReturn.purchase_id.toString().padStart(3, '0')}`,
      supplier_name: updatedPurchaseReturn.Suppliers?.name || 'N/A',
      supplier_phone: updatedPurchaseReturn.Suppliers?.phone || '',
      supplier_address: updatedPurchaseReturn.Suppliers?.address || '',
      date: new Date().toISOString().split('T')[0],
      total_amount: parseFloat(updatedPurchaseReturn.totalPaid.toString()),
      reason: updatedPurchaseReturn.note,
      status: 'completed',
      refund_method: 'Credit Note',
      items: updatedPurchaseReturn.PurchasesReturnItems.map(item => ({
        id: item.id,
        product_id: item.products_id,
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
    console.error("Error updating purchase return:", error);
    res.status(500).json({ message: "Error updating purchase return" });
  }
};

// DELETE purchase return
export const deletePurchaseReturn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First delete related items
    await prisma.purchasesReturnItems.deleteMany({
      where: { purchaseReturn_id: parseInt(id) }
    });

    // Then delete the purchase return
    await prisma.purchasesReturn.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Purchase return deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase return:", error);
    res.status(500).json({ message: "Error deleting purchase return" });
  }
};