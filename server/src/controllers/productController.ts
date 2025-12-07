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

// SEARCH products for POS - FIXED VERSION
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q } = req.query;
        
        console.log("Search query received:", q);
        
        if (!q || typeof q !== 'string') {
            res.json([]);
            return;
        }

        // Option 1: Use Prisma's findMany (Recommended - safer)
        const products = await prisma.products.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                    {
                        serial: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                    {
                        specification: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                ],
            },
            include: {
                Categories: true,
            },
            orderBy: {
                name: 'asc',
            },
            take: 20,
        });
        
        console.log(`Found ${products.length} products`);
        res.json(products);
        
    } catch (error) {
        console.error("Error searching products:", error);
        // Send detailed error for debugging
        res.status(500).json({
            message: "Error searching products",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }
};

// GET products for POS (frequently sold/recent) - FIXED
export const getProductsPOS = async (req: Request, res: Response): Promise<void> => {
    try {
        const products = await prisma.products.findMany({
            include: {
                Categories: true,
            },
            orderBy: {
                id: 'desc', // Use id since you don't have updatedAt
            },
            take: 30,
        });
        
        res.json(products);
    } catch (error) {
        console.error("Error fetching POS products:", error);
        res.status(500).json({message: "Error retrieving POS products"});
    }
};

// GET product by barcode - FIXED
export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { barcode } = req.params;
        console.log("Barcode search for:", barcode);
        
        const product = await prisma.products.findFirst({
            where: {
                serial: {
                    equals: barcode,
                    mode: 'insensitive' as const,
                },
            },
            include: {
                Categories: true,
            },
        });
        
        if (!product) {
            console.log("Product not found for barcode:", barcode);
            res.status(404).json({message: "Product not found"});
            return;
        }
        
        console.log("Found product:", product.name);
        res.json(product);
    } catch (error) {
        console.error("Error fetching product by barcode:", error);
        res.status(500).json({message: "Error retrieving product"});
    }
};