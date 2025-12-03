import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// GET all products
export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const products = await prisma.products.findMany({
            include: {
                Categories: true,
            },
            orderBy: {
                id: "asc",
            },
        });
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({message: "Error retrieving products"});
    }
};

// GET single product by ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const product = await prisma.products.findUnique({
            where: { id: parseInt(id) },
            include: {
                Categories: true,
            },
        });
        
        if (!product) {
            res.status(404).json({message: "Product not found"});
            return;
        }
        
        res.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({message: "Error retrieving product"});
    }
};

// POST create new product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productData = req.body;
        const newProduct = await prisma.products.create({
            data: productData,
            include: {
                Categories: true,
            },
        });
        res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({message: "Error creating product"});
    }
};

// PUT update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const productData = req.body;
        
        const updatedProduct = await prisma.products.update({
            where: { id: parseInt(id) },
            data: productData,
            include: {
                Categories: true,
            },
        });
        
        res.json(updatedProduct);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({message: "Error updating product"});
    }
};

// DELETE product
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        await prisma.products.delete({
            where: { id: parseInt(id) },
        });
        
        res.json({message: "Product deleted successfully"});
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({message: "Error deleting product"});
    }
};