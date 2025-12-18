import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// GET all products
export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const products = await prisma.products.findMany({
            include: {
                Categories: true,
                productSerials: true,
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
                productSerials: true,
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

// POST create new product with serial number support - UPDATED
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      specification,
      description,
      quantity,
      purchasePrice,
      wholesalePrice,
      retailPrice,
      warranty, // Product-level warranty if needed
      category_id,
      useIndividualSerials,
      bulkSerial,
      individualSerials,
    } = req.body;

    // Validate serial numbers if individual serials are used
    if (useIndividualSerials) {
      if (!individualSerials || !Array.isArray(individualSerials)) {
        res.status(400).json({ message: "Individual serials array is required" });
        return;
      }

      if (individualSerials.length !== quantity) {
        res.status(400).json({ 
          message: `Number of serials (${individualSerials.length}) must match quantity (${quantity})` 
        });
        return;
      }

      // Check for duplicate serials
      const duplicateSerials = await prisma.productSerials.findMany({
        where: {
          serial: {
            in: individualSerials,
          },
        },
      });

      if (duplicateSerials.length > 0) {
        const duplicates = duplicateSerials.map((s: { serial: any; }) => s.serial);
        res.status(400).json({ 
          message: "Duplicate serial numbers found", 
          duplicates 
        });
        return;
      }
    }

    // Create the product
    const product = await prisma.products.create({
      data: {
        name,
        specification,
        description,
        quantity,
        purchasePrice: parseFloat(purchasePrice),
        wholesalePrice: parseFloat(wholesalePrice),
        retailPrice: parseFloat(retailPrice),
        category_id,
        useIndividualSerials,
      },
    });

    // Create individual serial numbers if enabled
    if (useIndividualSerials && individualSerials) {
      const serialsData = individualSerials.map((serial: any) => ({
        serial,
        product_id: product.id,
        status: "Available" as const,
        warranty: warranty === "Yes" ? "Yes" : "No", // Use product warranty or default to No
      }));

      await prisma.productSerials.createMany({
        data: serialsData,
      });
    }

    // Fetch the complete product with serials
    const completeProduct = await prisma.products.findUnique({
      where: { id: product.id },
      include: {
        Categories: true,
        productSerials: true,
      },
    });

    res.status(201).json(completeProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error creating product" });
  }
};

// Helper function to validate and reserve serials for sale
export const reserveSerialsForSale = async (
  productId: number, 
  quantity: number
): Promise<{
  success: boolean; 
  serials?: string[]; 
  error?: string 
}> => { // Remove "serals: boolean;" - it's a typo
  try {
    // Find available serials
    const availableSerials = await prisma.productSerials.findMany({
      where: {
        product_id: productId,
        status: "Available",
      },
      take: quantity,
    });

    if (availableSerials.length < quantity) {
      return {
        success: false,
        error: `Insufficient available serials. Available: ${availableSerials.length}, Requested: ${quantity}`,
      };
    }

    const serialIds = availableSerials.map(s => s.id);
    const serialNumbers = availableSerials.map(s => s.serial);

    // Mark serials as reserved (or directly as sold)
    await prisma.productSerials.updateMany({
      where: {
        id: {
          in: serialIds,
        },
      },
      data: {
        status: "Sold",
      },
    });

    return {
      success: true,
      serials: serialNumbers,
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
  }>,
  saleId: number
): Promise<void> => {
  for (const item of items) {
    const product = await prisma.products.findUnique({
      where: { id: item.product_id },
    });

    if (!product) continue;

    if (product.useIndividualSerials) {
      // Reserve serials for this sale item
      const result = await reserveSerialsForSale(item.product_id, item.quantity);
      
      if (result.success && result.serials) {
        // Update serials with sale_id
        await prisma.productSerials.updateMany({
          where: {
            serial: {
              in: result.serials,
            },
            product_id: item.product_id,
          },
          data: {
            sale_id: saleId,
          },
        });
      } else {
        throw new Error(`Failed to reserve serials for product ${product.name}: ${result.error}`);
      }
    }
  }
};

// GET product serials
export const getProductSerials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    const whereClause: any = {
      product_id: parseInt(productId),
    };

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    const serials = await prisma.productSerials.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        Sales: {
          include: {
            Customers: true,
          },
        },
      },
    });

    res.json(serials);
  } catch (error) {
    console.error("Error fetching product serials:", error);
    res.status(500).json({ message: "Error retrieving product serials" });
  }
};

// PATCH update serial status
export const updateSerialStatus = async (req: Request, res: Response): Promise<void> => {
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
// PUT update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      specification,
      description,
      quantity,
      purchasePrice,
      wholesalePrice,
      retailPrice,
      warranty,
      category_id,
      useIndividualSerials,
      individualSerials, // Array of objects with serial and warranty
    } = req.body;

    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Product ID:", id);
    console.log("useIndividualSerials:", useIndividualSerials);
    console.log("individualSerials:", individualSerials);
    console.log("Quantity:", quantity);

    // Check if product exists
    const existingProduct = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: { productSerials: true },
    });

    if (!existingProduct) {
      res.status(404).json({ message: "Product not found" });
      return;
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
          quantity,
          purchasePrice: parseFloat(purchasePrice),
          wholesalePrice: parseFloat(wholesalePrice),
          retailPrice: parseFloat(retailPrice),
          category_id,
          useIndividualSerials,
        },
      });

      // Handle serial numbers
      if (useIndividualSerials) {
        // Delete existing serials
        await tx.productSerials.deleteMany({
          where: { product_id: parseInt(id) },
        });

        // Create new serials if provided
        if (individualSerials && Array.isArray(individualSerials)) {
          const serialsData = [];
          
          // Process each serial item
          for (let i = 0; i < individualSerials.length; i++) {
            const item = individualSerials[i];
            
            if (typeof item === 'object' && item !== null) {
              // If it's an object with serial and warranty
              serialsData.push({
                serial: item.serial || null,
                product_id: parseInt(id),
                status: "Available" as const,
                warranty: item.warranty || warranty || "No",
              });
            } else if (typeof item === 'string') {
              // If it's just a string (for backward compatibility)
              serialsData.push({
                serial: item || null,
                product_id: parseInt(id),
                status: "Available" as const,
                warranty: warranty || "No",
              });
            }
          }

          // Validate quantity matches
          if (serialsData.length !== quantity) {
            throw new Error(`Number of serials (${serialsData.length}) must match quantity (${quantity})`);
          }

          // Check for duplicate serials in the new data
          const serialNumbers = serialsData.map(s => s.serial).filter(s => s);
          const uniqueSerials = [...new Set(serialNumbers)];
          
          if (uniqueSerials.length !== serialNumbers.length) {
            throw new Error("Duplicate serial numbers found in the new data");
          }

          // Check for existing serials in database (excluding current product)
          if (serialNumbers.length > 0) {
            const existingSerials = await tx.productSerials.findMany({
              where: {
                serial: {
                  in: serialNumbers,
                },
                product_id: {
                  not: parseInt(id),
                },
              },
            });
            
            if (existingSerials.length > 0) {
              throw new Error(`Serial numbers already exist in other products: ${existingSerials.map(s => s.serial).join(', ')}`);
            }
          }

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
          productSerials: true,
        },
      });

      return fullProduct;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error updating product:", error);
    console.error("Error message:", error.message);
    
    if (error.code) {
      console.error("Prisma error code:", error.code);
      console.error("Prisma error meta:", error.meta);
    }
    
    res.status(500).json({ 
      message: "Error updating product", 
      error: error.message 
    });
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
                        specification: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                ],
            },
            include: {
                Categories: true,
                productSerials: true,
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
                productSerials: true,
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
// export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { barcode } = req.params;
//         console.log("Barcode search for:", barcode);
        
//         const product = await prisma.products.findFirst({
//             where: {
//                 barcode: barcode,
//             },
//             include: {
//                 Categories: true,
//             },
//         });
        
//         if (!product) {
//             console.log("Product not found for barcode:", barcode);
//             res.status(404).json({message: "Product not found"});
//             return;
//         }
        
//         console.log("Found product:", product.name);
//         res.json(product);
//     } catch (error) {
//         console.error("Error fetching product by barcode:", error);
//         res.status(500).json({message: "Error retrieving product"});
//     }
// };

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