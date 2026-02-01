import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";
import { generateId } from "../utils/idGenerator";

const prisma = new PrismaClient();

// GET all products
export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await prisma.products.findMany({
      include: {
        Categories: true,
        productSerials: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error retrieving products" });
  }
};

// GET single product by ID
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: {
        Categories: true,
        productSerials: {
          include: {
            supplier: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            userId: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
            userId: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Error retrieving product" });
  }
};

// POST create new product with serial number support
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      specification,
      description,
      quantity,
      category_id,
      supplier_id,
      useIndividualSerials,
      serials, // Array of objects with serial data including pricing
      userId,
    } = req.body;

    console.log("=== CREATE PRODUCT REQUEST ===");
    console.log("Request body:", req.body);

    // Validate required fields
    if (!name || !category_id) {
      res.status(400).json({ 
        message: "Name and category are required",
        required: ["name", "category_id"]
      });
      return;
    }

    // Validate serial numbers if individual serials are used
    if (useIndividualSerials) {
      if (!serials || !Array.isArray(serials)) {
        res.status(400).json({ 
          message: "Serials array is required for serialized products" 
        });
        return;
      }

      if (serials.length === 0) {
        res.status(400).json({ 
          message: "At least one serial is required for serialized products" 
        });
        return;
      }

      // Check for duplicate serials
      const serialNumbers = serials
        .map((s: any) => s.serial)
        .filter((s: string) => s && s.trim() !== "");

      const uniqueSerials = [...new Set(serialNumbers)];
      if (uniqueSerials.length !== serialNumbers.length) {
        res.status(400).json({
          message: "Duplicate serial numbers found in the request",
        });
        return;
      }

      // Check if serials already exist in database
      const existingSerials = await prisma.productSerials.findMany({
        where: {
          serial: {
            in: serialNumbers,
          },
        },
      });

      if (existingSerials.length > 0) {
        const duplicates = existingSerials.map((s) => s.serial);
        res.status(400).json({
          message: "Some serial numbers already exist in the system",
          duplicates,
        });
        return;
      }

      // Validate each serial has required pricing fields
      for (const serial of serials) {
        if (!serial.serial || !serial.serial.trim()) {
          res.status(400).json({
            message: "Each serial must have a serial number",
          });
          return;
        }
        
        if (typeof serial.purchasePrice === 'undefined' || 
            typeof serial.wholesalePrice === 'undefined' || 
            typeof serial.retailPrice === 'undefined') {
          res.status(400).json({
            message: "Each serial must have purchasePrice, wholesalePrice, and retailPrice",
          });
          return;
        }
        
        if (!serial.productType) {
          res.status(400).json({
            message: "Each serial must have a productType (New or PreOwned)",
          });
          return;
        }
      }
    } else {
      // For non-serialized products, quantity must be provided
      if (!quantity || quantity < 0) {
        res.status(400).json({ 
          message: "Quantity is required for non-serialized products" 
        });
        return;
      }
    }

    // Generate product code
    const productCode = await generateId('products', 'PRD');

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create the product (without pricing information)
      const product = await tx.products.create({
        data: {
          productCode,
          name,
          specification,
          description,
          quantity: useIndividualSerials ? serials.length : quantity,
          useIndividualSerials,
          status: "Active",
          category_id: parseInt(category_id),
          created_by: userId ? parseInt(userId) : undefined,
          updated_by: userId ? parseInt(userId) : undefined,
        },
      });

      // Create individual serial numbers if enabled
      if (useIndividualSerials && serials && serials.length > 0) {
        const serialsData = serials.map((item: any) => ({
          serial: item.serial,
          product_id: product.id,
          status: "Available",
          warranty: item.warranty || "No",
          purchasePrice: parseFloat(item.purchasePrice),
          wholesalePrice: parseFloat(item.wholesalePrice),
          retailPrice: parseFloat(item.retailPrice),
          productType: item.productType || "New",
          supplier_id: item.supplier_id || (supplier_id ? parseInt(supplier_id) : undefined),
        }));

        await tx.productSerials.createMany({
          data: serialsData,
        });
      }

      // Fetch the complete product with serials
      const completeProduct = await tx.products.findUnique({
        where: { id: product.id },
        include: {
          Categories: true,
          productSerials: {
            include: {
              supplier: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              userId: true,
            },
          },
        },
      });

      return completeProduct;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ 
      message: "Error creating product",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Helper function to validate and reserve serials for sale
export const reserveSerialsForSale = async (
  productId: number,
  quantity: number
): Promise<{
  success: boolean;
  serials?: { 
    id: number; 
    serial: string;
    retailPrice: any; // Decimal type
  }[];
  error?: string;
}> => {
  try {
    // Find available serials with pricing information
    const availableSerials = await prisma.productSerials.findMany({
      where: {
        product_id: productId,
        status: "Available",
      },
      take: quantity,
      select: {
        id: true,
        serial: true,
        retailPrice: true,
      }
    });

    if (availableSerials.length < quantity) {
      return {
        success: false,
        error: `Insufficient available serials. Available: ${availableSerials.length}, Requested: ${quantity}`,
      };
    }

    return {
      success: true,
      serials: availableSerials,
    };
  } catch (error) {
    console.error("Error reserving serials:", error);
    return {
      success: false,
      error: "Error reserving serial numbers",
    };
  }
};

// Updated sales creation to handle serial numbers
export const createSaleWithSerials = async (
  items: Array<{
    product_id: number;
    quantity: number;
    unitPrice: number;
    serials?: string[]; // Optional array of specific serials to use
  }>,
  saleId: number,
  salesItemId: number
): Promise<{
  success: boolean;
  error?: string;
  soldSerials?: Array<{
    serialId: number;
    serial: string;
    soldPrice: any;
  }>;
}> => {
  try {
    const soldSerials: Array<{
      serialId: number;
      serial: string;
      soldPrice: any;
    }> = [];

    for (const item of items) {
      const product = await prisma.products.findUnique({
        where: { id: item.product_id },
      });

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      if (product.useIndividualSerials) {
        let serialsToUse;

        // If specific serials are provided, use those
        if (item.serials && item.serials.length > 0) {
          if (item.serials.length !== item.quantity) {
            throw new Error(
              `Number of provided serials (${item.serials.length}) must match quantity (${item.quantity}) for product ${product.name}`
            );
          }

          serialsToUse = await prisma.productSerials.findMany({
            where: {
              product_id: item.product_id,
              serial: {
                in: item.serials,
              },
              status: "Available",
            },
            select: {
              id: true,
              serial: true,
              retailPrice: true,
            },
          });

          if (serialsToUse.length !== item.quantity) {
            throw new Error(
              `Some of the provided serials are not available for product ${product.name}`
            );
          }
        } else {
          // Reserve available serials
          const result = await reserveSerialsForSale(item.product_id, item.quantity);
          if (!result.success || !result.serials) {
            throw new Error(
              `Failed to reserve serials for product ${product.name}: ${result.error}`
            );
          }
          serialsToUse = result.serials;
        }

        // Create SalesItemSerials records with sold price
        for (const serial of serialsToUse) {
          await prisma.salesItemSerials.create({
            data: {
              salesItem_id: salesItemId,
              serial_id: serial.id,
              soldPrice: serial.retailPrice, // Use the serial's retail price as sold price
              soldAt: new Date(),
            },
          });

          // Update ProductSerials status to "Sold"
          await prisma.productSerials.update({
            where: { id: serial.id },
            data: { status: "Sold" },
          });

          soldSerials.push({
            serialId: serial.id,
            serial: serial.serial,
            soldPrice: serial.retailPrice,
          });
        }
      } else {
        // For non-serialized products, just update the product quantity
        await prisma.products.update({
          where: { id: product.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }
    }

    return { success: true, soldSerials };
  } catch (error) {
    console.error("Error creating sale with serials:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// GET product serials
export const getProductSerials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    const whereClause: any = {
      product_id: parseInt(productId),
    };

    if (status && typeof status === "string") {
      whereClause.status = status;
    }

    const serials = await prisma.productSerials.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        supplier: true,
        SalesItemSerials: {
          include: {
            SalesItems: {
              include: {
                Sales: {
                  include: {
                    Customers: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Transform the data for easier frontend consumption
    const transformedSerials = serials.map(serial => {
      const saleInfo = serial.SalesItemSerials[0]?.SalesItems?.Sales;
      
      return {
        ...serial,
        saleInfo: saleInfo ? {
          saleNo: saleInfo.saleNo,
          customerName: saleInfo.Customers?.name,
          saleDate: saleInfo.createdAt,
          soldPrice: serial.SalesItemSerials[0]?.soldPrice,
        } : null,
      };
    });

    res.json(transformedSerials);
  } catch (error) {
    console.error("Error fetching product serials:", error);
    res.status(500).json({ message: "Error retrieving product serials" });
  }
};

// GET available serials by product ID and status
export const getAvailableSerials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status = "Available" } = req.query;

    const serials = await prisma.productSerials.findMany({
      where: {
        product_id: parseInt(productId),
      },
      orderBy: {
        serial: "asc",
      },
      include: {
        supplier: true,
      },
    });

    res.json(serials);
  } catch (error) {
    console.error("Error fetching available serials:", error);
    res.status(500).json({ message: "Error retrieving available serials" });
  }
};

// PATCH update serial status
export const updateSerialStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { serialId } = req.params;
    const { status, note } = req.body;

    const updatedSerial = await prisma.productSerials.update({
      where: { id: parseInt(serialId) },
      data: {
        status,
      },
    });

    res.json(updatedSerial);
  } catch (error) {
    console.error("Error updating serial status:", error);
    res.status(500).json({ message: "Error updating serial status" });
  }
};

// PUT update product
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      specification,
      description,
      quantity,
      category_id,
      useIndividualSerials,
      serials, // Array of serial objects with pricing
      supplier_id,
      userId,
    } = req.body;

    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Product ID:", id);
    console.log("useIndividualSerials:", useIndividualSerials);
    console.log("serials:", serials);

    // Check if product exists
    const existingProduct = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: { productSerials: true },
    });

    if (!existingProduct) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Validate for serialized products
    if (useIndividualSerials) {
      if (!serials || !Array.isArray(serials)) {
        res.status(400).json({ 
          message: "Serials array is required for serialized products" 
        });
        return;
      }

      // Validate each serial
      for (const serial of serials) {
        if (!serial.serial || !serial.serial.trim()) {
          res.status(400).json({
            message: "Each serial must have a serial number",
          });
          return;
        }
        
        if (typeof serial.purchasePrice === 'undefined' || 
            typeof serial.wholesalePrice === 'undefined' || 
            typeof serial.retailPrice === 'undefined') {
          res.status(400).json({
            message: "Each serial must have purchasePrice, wholesalePrice, and retailPrice",
          });
          return;
        }
        
        if (!serial.productType) {
          res.status(400).json({
            message: "Each serial must have a productType (New or PreOwned)",
          });
          return;
        }
      }

      // Check for duplicate serials in the new data (excluding empty serials)
      const serialNumbers = serials
        .map((s: any) => s.serial)
        .filter((s: string) => s && s.trim() !== "");
      
      const uniqueSerials = [...new Set(serialNumbers)];
      if (uniqueSerials.length !== serialNumbers.length) {
        res.status(400).json({ 
          message: "Duplicate serial numbers found in the request" 
        });
        return;
      }

      // Check for existing serials in other products
      if (serialNumbers.length > 0) {
        const existingSerials = await prisma.productSerials.findMany({
          where: {
            serial: {
              in: serialNumbers,
            },
            product_id: {
              not: parseInt(id), // Exclude current product
            },
          },
        });

        if (existingSerials.length > 0) {
          const duplicates = existingSerials.map(s => s.serial);
          res.status(400).json({
            message: "Some serial numbers already exist in other products",
            duplicates,
          });
          return;
        }
      }
    }

    // Use transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update the product basic info
      const updatedProduct = await tx.products.update({
        where: { id: parseInt(id) },
        data: {
          name,
          specification,
          description,
          quantity: useIndividualSerials ? serials.length : quantity,
          useIndividualSerials,
          category_id: category_id ? parseInt(category_id) : undefined,
          updated_by: userId ? parseInt(userId) : undefined,
        },
      });

      // Handle serial numbers
      if (useIndividualSerials) {
        // Delete existing serials
        await tx.productSerials.deleteMany({
          where: { product_id: parseInt(id) },
        });

        // Create new serials
        if (serials && serials.length > 0) {
          const serialsData = serials.map((item: any) => ({
            serial: item.serial,
            product_id: parseInt(id),
            status: item.status || "Available",
            warranty: item.warranty || "No",
            purchasePrice: parseFloat(item.purchasePrice),
            wholesalePrice: parseFloat(item.wholesalePrice),
            retailPrice: parseFloat(item.retailPrice),
            productType: item.productType || "New",
            supplier_id: item.supplier_id || (supplier_id ? parseInt(supplier_id) : undefined),
          }));

          await tx.productSerials.createMany({
            data: serialsData,
          });
        }
      } else {
        // Delete existing serials if switching from individual to non-serialized
        if (existingProduct.useIndividualSerials) {
          await tx.productSerials.deleteMany({
            where: { product_id: parseInt(id) },
          });
        }
      }

      // Fetch the updated product with relations
      const fullProduct = await tx.products.findUnique({
        where: { id: parseInt(id) },
        include: {
          Categories: true,
          productSerials: {
            include: {
              supplier: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              userId: true,
            },
          },
          updater: {
            select: {
              id: true,
              name: true,
              email: true,
              userId: true,
            },
          },
        },
      });

      return fullProduct;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error updating product:", error);
    
    res.status(500).json({
      message: "Error updating product",
      error: error.message,
    });
  }
};

// DELETE product (soft delete)
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Soft delete - mark as Unavailable
    await prisma.products.update({
      where: { id: parseInt(id) },
      data: {
        status: "Unavailable",
        updated_by: userId || null,
      },
    });

    res.json({ message: "Product marked as unavailable successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
};

// SEARCH products for POS
export const searchProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.query;

    console.log("Search query received:", query);

    if (!query || typeof query !== "string") {
      res.json([]);
      return;
    }

    const products = await prisma.products.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            specification: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            productCode: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            productSerials: {
              some: {
                serial: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        ],
      },
      include: {
        Categories: true,
        productSerials: {
          where: {
            status: "Available",
          },
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 20,
    });

    console.log(`Found ${products.length} products`);
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({
      message: "Error searching products",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// GET products for POS (frequently sold/recent)
export const getProductsPOS = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await prisma.products.findMany({
      where: {
        quantity: {
          gt: 0,
        },
        status: "Active",
      },
      include: {
        Categories: true,
        productSerials: {
          where: {
            status: "Available",
          },
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 30,
    });

    res.json(products);
  } catch (error) {
    console.error("Error fetching POS products:", error);
    res.status(500).json({ message: "Error retrieving POS products" });
  }
};

// Scan barcode (search by serial number)
export const scanBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;

    // First try to find by serial number
    const serial = await prisma.productSerials.findFirst({
      where: {
        serial: barcode,
        status: "Available",
      },
      include: {
        Products: {
          include: {
            Categories: true,
            productSerials: {
              where: {
                status: "Available",
              },
            },
          },
        },
        supplier: true,
      },
    });

    if (serial) {
      res.json(serial.Products);
      return;
    }

    // If not found by serial, try by product code
    const product = await prisma.products.findFirst({
      where: {
        OR: [
          { productCode: barcode },
          { 
            productSerials: {
              some: {
                serial: barcode,
              },
            },
          },
        ],
      },
      include: {
        Categories: true,
        productSerials: {
          where: {
            status: "Available",
          },
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
        barcode,
      });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({
      message: 'Failed to scan barcode',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// GET product sales history
export const getProductSales = async (
  req: Request,
  res: Response
): Promise<void> => {
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
          },
        },
        Products: true,
        salesItemSerials: {
          include: {
            ProductSerials: true,
          },
        },
      },
      orderBy: {
        Sales: {
          createdAt: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedSales = sales.flatMap((item) => {
      if (item.salesItemSerials.length > 0) {
        // For serialized products
        return item.salesItemSerials.map((serialItem) => ({
          id: serialItem.id,
          date: item.Sales?.createdAt || new Date(),
          quantity: 1,
          price: serialItem.soldPrice || item.unitPrice,
          total: parseFloat((serialItem.soldPrice || item.unitPrice).toString()),
          customer: item.Sales?.Customers?.name,
          invoiceNumber: item.Sales?.saleNo,
          status: item.Sales?.status || "completed",
          serial: serialItem.ProductSerials?.serial,
        }));
      } else {
        // For non-serialized products
        return [{
          id: item.id,
          date: item.Sales?.createdAt || new Date(),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * parseFloat(item.unitPrice.toString()),
          customer: item.Sales?.Customers?.name,
          invoiceNumber: item.Sales?.saleNo,
          status: item.Sales?.status || "completed",
        }];
      }
    });

    res.json(formattedSales);
  } catch (error) {
    console.error("Error fetching product sales:", error);
    res.status(500).json({ message: "Error retrieving product sales" });
  }
};

// GET product purchase history
export const getProductPurchases = async (
  req: Request,
  res: Response
): Promise<void> => {
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
          },
        },
        Products: true,
        purchaseItemSerials: {
          include: {
            ProductSerials: true,
          },
        },
      },
      orderBy: {
        Purchases: {
          createdAt: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedPurchases = purchases.flatMap((item) => {
      if (item.purchaseItemSerials.length > 0) {
        // For serialized products
        return item.purchaseItemSerials.map((serialItem) => ({
          id: serialItem.id,
          date: item.Purchases?.createdAt || new Date(),
          quantity: 1,
          price: serialItem.purchasedPrice || item.unitPrice,
          total: parseFloat((serialItem.purchasedPrice || item.unitPrice).toString()),
          supplier: item.Purchases?.Suppliers?.name,
          invoiceNumber: item.Purchases?.purchaseNo,
          status: "completed",
          serial: serialItem.ProductSerials?.serial,
        }));
      } else {
        // For non-serialized products
        return [{
          id: item.id,
          date: item.Purchases?.createdAt || new Date(),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * parseFloat(item.unitPrice.toString()),
          supplier: item.Purchases?.Suppliers?.name,
          invoiceNumber: item.Purchases?.purchaseNo,
          status: "completed",
        }];
      }
    });

    res.json(formattedPurchases);
  } catch (error) {
    console.error("Error fetching product purchases:", error);
    res.status(500).json({ message: "Error retrieving product purchases" });
  }
};

// GET product sales returns history
export const getProductSalesReturns = async (
  req: Request,
  res: Response
): Promise<void> => {
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
          },
        },
        Products: true,
        salesReturnItemSerials: {
          include: {
            ProductSerials: true,
          },
        },
      },
      orderBy: {
        SalesReturn: {
          createdAt: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedReturns = salesReturns.flatMap((item) => {
      if (item.salesReturnItemSerials.length > 0) {
        // For serialized products
        return item.salesReturnItemSerials.map((serialItem) => ({
          id: serialItem.id,
          date: item.SalesReturn?.createdAt || new Date(),
          quantity: 1,
          price: serialItem.returnedPrice || item.unitPrice,
          total: parseFloat((serialItem.returnedPrice || item.unitPrice).toString()),
          customer: item.SalesReturn?.Customers?.name,
          invoiceNumber: item.SalesReturn?.returnNo,
          status: "completed",
          serial: serialItem.ProductSerials?.serial,
        }));
      } else {
        // For non-serialized products
        return [{
          id: item.id,
          date: item.SalesReturn?.createdAt || new Date(),
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * parseFloat(item.unitPrice.toString()),
          customer: item.SalesReturn?.Customers?.name,
          invoiceNumber: item.SalesReturn?.returnNo,
          status: "completed",
        }];
      }
    });

    res.json(formattedReturns);
  } catch (error) {
    console.error("Error fetching product sales returns:", error);
    res.status(500).json({ message: "Error retrieving product sales returns" });
  }
};

// GET product exchanges history
export const getProductExchanges = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Query for exchanges where product is either old or new product
    const exchanges = await prisma.exchangesItems.findMany({
      where: {
        OR: [{ oldProduct_id: parseInt(id) }, { newProduct_id: parseInt(id) }],
      },
      include: {
        Exchanges: {
          include: {
            Customers: true,
          },
        },
        oldProduct: true,
        newProduct: true,
        exchangeItemSerials: {
          include: {
            OldProductSerials: true,
            NewProductSerials: true,
          },
        },
      },
      orderBy: {
        Exchanges: {
          createdAt: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedExchanges = exchanges.flatMap((item) => {
      if (item.exchangeItemSerials.length > 0) {
        // For serialized products
        return item.exchangeItemSerials.map((serialItem) => {
          const isOldProduct = item.oldProduct_id === parseInt(id);
          const relevantSerial = isOldProduct 
            ? serialItem.OldProductSerials 
            : serialItem.NewProductSerials;
          
          return {
            id: serialItem.id,
            date: item.Exchanges?.createdAt || new Date(),
            quantity: 1,
            total: parseFloat((serialItem.exchangePrice || item.unitPrice).toString()),
            customer: item.Exchanges?.Customers?.name,
            invoiceNumber: item.Exchanges?.exchangeNo,
            status: "completed",
            isOldProduct,
            oldProductName: item.oldProduct?.name,
            newProductName: item.newProduct?.name,
          };
        });
      } else {
        // For non-serialized products
        return [{
          id: item.id,
          date: item.Exchanges?.createdAt || new Date(),
          quantity: item.quantity,
          price: parseFloat(item.unitPrice.toString()),
          total: item.quantity * parseFloat(item.unitPrice.toString()),
          customer: item.Exchanges?.Customers?.name,
          invoiceNumber: item.Exchanges?.exchangeNo,
          status: "completed",
          isOldProduct: item.oldProduct_id === parseInt(id),
          oldProductName: item.oldProduct?.name,
          newProductName: item.newProduct?.name,
        }];
      }
    });

    res.json(formattedExchanges);
  } catch (error) {
    console.error("Error fetching product exchanges:", error);
    res.status(500).json({ message: "Error retrieving product exchanges" });
  }
};