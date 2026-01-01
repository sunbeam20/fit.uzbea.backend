import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { generateId } from "../utils/idGenerator";

const prisma = new PrismaClient();

// GET all suppliers
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
        const suppliers = await prisma.suppliers.findMany({
            orderBy: {
                id: "asc",
            },
        });
        res.json(suppliers);
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({message: "Error retrieving suppliers"});
    }
};

// GET single supplier by ID
export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const supplier = await prisma.suppliers.findUnique({
            where: { id: parseInt(id) },
        });
        
        if (!supplier) {
            res.status(404).json({message: "Supplier not found"});
            return;
        }
        
        res.json(supplier);
    } catch (error) {
        console.error("Error fetching supplier:", error);
        res.status(500).json({message: "Error retrieving supplier"});
    }
};

// POST create new supplier
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, contactPerson, email, phone, address } = req.body;
        
        // Validate required fields
        if (!name || !phone) {
            res.status(400).json({message: "Name and phone are required fields"});
            return;
        }
        
        const newSupplier = await prisma.suppliers.create({
            data: { 
                suppId: await generateId('suppliers', 'SUP'),
                name,
                email: email || null,
                phone,
                address: address || null
            },
        });
        
        res.status(201).json(newSupplier);
    } catch (error) {
        console.error("Error creating supplier:", error);
        res.status(500).json({message: "Error creating supplier"});
    }
};

// PUT update supplier
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, contactPerson, email, phone, address } = req.body;
        
        const updatedSupplier = await prisma.suppliers.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email: email || null,
                phone,
                address: address || null
            },
        });
        
        res.json(updatedSupplier);
    } catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({message: "Error updating supplier"});
    }
};

// DELETE supplier
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        // Check if supplier exists
        const supplier = await prisma.suppliers.findUnique({
            where: { id: parseInt(id) },
        });
        
        if (!supplier) {
            res.status(404).json({message: "Supplier not found"});
            return;
        }
        
        // Check if supplier has purchases
        const purchases = await prisma.purchases.findFirst({
            where: { supplier_id: parseInt(id) },
        });
        
        if (purchases) {
            res.status(400).json({message: "Cannot delete supplier with existing purchases"});
            return;
        }
        
        await prisma.suppliers.delete({
            where: { id: parseInt(id) },
        });
        
        res.json({message: "Supplier deleted successfully"});
    } catch (error) {
        console.error("Error deleting supplier:", error);
        res.status(500).json({message: "Error deleting supplier"});
    }
};