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

// GET product sales history
export const getProductSales = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const sales = await prisma.salesItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                Sales: {
                    include: {
                        Customers: true,
                    }
                },
                Products: true,
            },
            orderBy: {
                Sales: {
                    id: 'desc',
                }
            },
        });
        
        // Transform the data for frontend
        const formattedSales = sales.map(item => ({
            id: item.id,
            date: item.Sales?.dueDate || new Date(),
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.quantity * parseFloat(item.unitPrice.toString()),
            customer: item.Sales?.Customers?.name,
            invoiceNumber: `SALE-${item.Sales?.id}`,
            status: 'completed',
        }));
        
        res.json(formattedSales);
    } catch (error) {
        console.error("Error fetching product sales:", error);
        res.status(500).json({message: "Error retrieving product sales"});
    }
};

// GET product purchase history
export const getProductPurchases = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const purchases = await prisma.purchasesItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                Purchases: {
                    include: {
                        Suppliers: true,
                    }
                },
                Products: true,
            },
            orderBy: {
                Purchases: {
                    id: 'desc',
                }
            },
        });
        
        // Transform the data for frontend
        const formattedPurchases = purchases.map(item => ({
            id: item.id,
            date: item.Purchases?.dueDate || new Date(),
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.quantity * parseFloat(item.unitPrice.toString()),
            supplier: item.Purchases?.Suppliers?.name,
            invoiceNumber: `PUR-${item.Purchases?.id}`,
            status: 'completed',
        }));
        
        res.json(formattedPurchases);
    } catch (error) {
        console.error("Error fetching product purchases:", error);
        res.status(500).json({message: "Error retrieving product purchases"});
    }
};

// GET product sales returns history
export const getProductSalesReturns = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const salesReturns = await prisma.salesReturnItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                SalesReturn: {
                    include: {
                        Customers: true,
                    }
                },
                Products: true,
            },
            orderBy: {
                SalesReturn: {
                    id: 'desc',
                }
            },
        });
        
        // Transform the data for frontend
        const formattedReturns = salesReturns.map(item => ({
            id: item.id,
            date: new Date(), // You might want to add a date field to SalesReturn model
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.quantity * parseFloat(item.unitPrice.toString()),
            customer: item.SalesReturn?.Customers?.name,
            invoiceNumber: `RET-${item.SalesReturn?.id}`,
            status: 'completed',
        }));
        
        res.json(formattedReturns);
    } catch (error) {
        console.error("Error fetching product sales returns:", error);
        res.status(500).json({message: "Error retrieving product sales returns"});
    }
};

// GET product exchanges history
export const getProductExchanges = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        // Query for exchanges where product is either old or new product
        const exchanges = await prisma.exchangesItems.findMany({
            where: {
                OR: [
                    { oldProduct_id: parseInt(id) },
                    { newProduct_id: parseInt(id) },
                ],
            },
            include: {
                Exchanges: {
                    include: {
                        Customers: true,
                    }
                },
                oldProduct: true,
                newProduct: true,
            },
            orderBy: {
                Exchanges: {
                    id: 'desc',
                }
            },
        });
        
        // Transform the data for frontend
        const formattedExchanges = exchanges.map(item => ({
            id: item.id,
            date: new Date(), // You might want to add a date field to Exchanges model
            quantity: item.quantity,
            price: parseFloat(item.unitPrice.toString()),
            total: item.quantity * parseFloat(item.unitPrice.toString()),
            customer: item.Exchanges?.Customers?.name,
            invoiceNumber: `EXC-${item.Exchanges?.id}`,
            status: 'completed',
            // Additional info for display
            isOldProduct: item.oldProduct_id === parseInt(id),
            oldProductName: item.oldProduct?.name,
            newProductName: item.newProduct?.name,
        }));
        
        res.json(formattedExchanges);
    } catch (error) {
        console.error("Error fetching product exchanges:", error);
        res.status(500).json({message: "Error retrieving product exchanges"});
    }
};