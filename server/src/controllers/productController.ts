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
        productSerials: true,
        supplier: true,
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
        productSerials: true,
        supplier: true,
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

// POST create new product with serial number support - FIXED
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
      purchasePrice,
      wholesalePrice,
      retailPrice,
      warranty, // Product-level warranty if needed
      productType,
      category_id,
      supplier_id,
      useIndividualSerials,
      bulkSerial,
      individualSerials, // Array of objects with serial and warranty: [{serial: "ABC123", warranty: "Yes"}, ...]
      userId,
    } = req.body;

    // Validate serial numbers if individual serials are used
    if (useIndividualSerials) {
      if (!individualSerials || !Array.isArray(individualSerials)) {
        res
          .status(400)
          .json({ message: "Individual serials array is required" });
        return;
      }

      if (individualSerials.length !== quantity) {
        res.status(400).json({
          message: `Number of serials (${individualSerials.length}) must match quantity (${quantity})`,
        });
        return;
      }

      // Extract serial numbers from objects
      const serialNumbers = individualSerials
        .map((s: any) => s.serial) // Extract serial string from each object
        .filter((s: string) => s && s.trim() !== ""); // Filter out empty/null serials

      // Check for duplicate serials only if we have serial numbers
      if (serialNumbers.length > 0) {
        const duplicateSerials = await prisma.productSerials.findMany({
          where: {
            serial: {
              in: serialNumbers, // Now passing array of strings, not objects
            },
          },
        });

        if (duplicateSerials.length > 0) {
          const duplicates = duplicateSerials.map(
            (s: { serial: any }) => s.serial
          );
          res.status(400).json({
            message: "Duplicate serial numbers found",
            duplicates,
          });
          return;
        }
      }
    }

    // Create the product
    const product = await prisma.products.create({
      data: {
        productCode: await generateId('products', 'PRD'),
        name,
        specification,
        description,
        quantity,
        purchasePrice: parseFloat(purchasePrice),
        wholesalePrice: parseFloat(wholesalePrice),
        retailPrice: parseFloat(retailPrice),
        productType: productType || "New",
        category_id,
        supplier_id,
        useIndividualSerials,
        created_by: userId || null,
        status: "Active",
      },
    });

    // Create individual serial numbers if enabled
    if (useIndividualSerials && individualSerials) {
      const serialsData = individualSerials.map((item: any) => ({
        serial: item.serial || null, // Extract serial from object
        product_id: product.id,
        status: "Available" as const,
        warranty: item.warranty || warranty || "No", // Use item warranty or fallback
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
  serials?: { id: number; serial: string }[];
  error?: string;
}> => {
  try {
    // Find available serials
    const availableSerials = await prisma.productSerials.findMany({
      where: {
        product_id: productId,
        status: "Available",
      },
      take: quantity,
      select: {
        id: true,
        serial: true,
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
  }>,
  saleId: number,
  salesItemId: number // Add this parameter
): Promise<void> => {
  for (const item of items) {
    const product = await prisma.products.findUnique({
      where: { id: item.product_id },
    });

    if (!product) continue;

    if (product.useIndividualSerials) {
      // Reserve serials for this sale item
      const result = await reserveSerialsForSale(
        item.product_id,
        item.quantity
      );

      if (result.success && result.serials) {
        // Create SalesItemSerials records (junction table)
        const salesItemSerialsData = result.serials.map(serial => ({
          salesItem_id: salesItemId,
          serial_id: serial.id,
        }));

        await prisma.salesItemSerials.createMany({
          data: salesItemSerialsData,
        });

        // Update ProductSerials status to "Sold"
        const serialIds = result.serials.map(s => s.id);
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
      } else {
        throw new Error(
          `Failed to reserve serials for product ${product.name}: ${result.error}`
        );
      }
    }
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
        // Include the junction table to get sales info
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
        } : null,
      };
    });

    res.json(transformedSerials);
  } catch (error) {
    console.error("Error fetching product serials:", error);
    res.status(500).json({ message: "Error retrieving product serials" });
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

// PUT update product - FIXED
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
      purchasePrice,
      wholesalePrice,
      retailPrice,
      warranty,
      productType,
      category_id,
      useIndividualSerials,
      individualSerials, // Array of objects with serial and warranty: [{serial: "ABC123", warranty: "Yes"}, ...]
      supplier_id,
      userId,
    } = req.body;

    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Product ID:", id);
    console.log("useIndividualSerials:", useIndividualSerials);
    console.log("individualSerials:", individualSerials);
    console.log("Quantity:", quantity);
    console.log("Product Type:", productType);

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
          productType: productType || "New",
          category_id,
          useIndividualSerials,
          supplier_id,
          updated_by: userId || null,
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

            if (typeof item === "object" && item !== null) {
              // If it's an object with serial and warranty
              serialsData.push({
                serial: item.serial || null,
                product_id: parseInt(id),
                status: "Available" as const,
                warranty: item.warranty || warranty || "No",
              });
            } else if (typeof item === "string") {
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
            throw new Error(
              `Number of serials (${serialsData.length}) must match quantity (${quantity})`
            );
          }

          // Check for duplicate serials in the new data
          const serialNumbers = serialsData
            .map((s) => s.serial)
            .filter((s) => s);
          const uniqueSerials = [...new Set(serialNumbers)];

          if (uniqueSerials.length !== serialNumbers.length) {
            throw new Error("Duplicate serial numbers found in the new data");
          }

          // Check for existing serials in database (excluding current product)
          if (serialNumbers.length > 0) {
            const existingSerials = await tx.productSerials.findMany({
              where: {
                serial: {
                  in: serialNumbers, // Fixed: now array of strings
                },
                product_id: {
                  not: parseInt(id),
                },
              },
            });

            if (existingSerials.length > 0) {
              throw new Error(
                `Serial numbers already exist in other products: ${existingSerials
                  .map((s) => s.serial)
                  .join(", ")}`
              );
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
    const userId = (req as any).user?.id; // Assuming you have user in request

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
        ],
      },
      include: {
        Categories: true,
        productSerials: true,
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
      stack: error instanceof Error ? error.stack : undefined,
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
      },
      include: {
        Categories: true,
        productSerials: true,
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

// Scan barcode
// export const scanBarcode = async (req: Request, res: Response) => {
//   try {
//     const { barcode } = req.params;

//     const product = await prisma.products.findFirst({
//       where: {
//         barcode: barcode
//       },
//       include: {
//         Categories: true
//       }
//     });

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: product
//     });
//   } catch (error) {
//     console.error('Scan barcode error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to scan barcode',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// };

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
      },
      orderBy: {
        Sales: {
          id: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedSales = sales.map((item) => ({
      id: item.id,
      date: item.Sales?.dueDate || new Date(),
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.quantity * parseFloat(item.unitPrice.toString()),
      customer: item.Sales?.Customers?.name,
      invoiceNumber: `SALE-${item.Sales?.id}`,
      status: "completed",
    }));

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
      },
      orderBy: {
        Purchases: {
          id: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedPurchases = purchases.map((item) => ({
      id: item.id,
      date: item.Purchases?.dueDate || new Date(),
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.quantity * parseFloat(item.unitPrice.toString()),
      supplier: item.Purchases?.Suppliers?.name,
      invoiceNumber: `PUR-${item.Purchases?.id}`,
      status: "completed",
    }));

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
      },
      orderBy: {
        SalesReturn: {
          id: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedReturns = salesReturns.map((item) => ({
      id: item.id,
      date: new Date(),
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.quantity * parseFloat(item.unitPrice.toString()),
      customer: item.SalesReturn?.Customers?.name,
      invoiceNumber: `RET-${item.SalesReturn?.id}`,
      status: "completed",
    }));

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
      },
      orderBy: {
        Exchanges: {
          id: "desc",
        },
      },
    });

    // Transform the data for frontend
    const formattedExchanges = exchanges.map((item) => ({
      id: item.id,
      date: new Date(),
      quantity: item.quantity,
      price: parseFloat(item.unitPrice.toString()),
      total: item.quantity * parseFloat(item.unitPrice.toString()),
      customer: item.Exchanges?.Customers?.name,
      invoiceNumber: `EXC-${item.Exchanges?.id}`,
      status: "completed",
      // Additional info for display
      isOldProduct: item.oldProduct_id === parseInt(id),
      oldProductName: item.oldProduct?.name,
      newProductName: item.newProduct?.name,
    }));

    res.json(formattedExchanges);
  } catch (error) {
    console.error("Error fetching product exchanges:", error);
    res.status(500).json({ message: "Error retrieving product exchanges" });
  }
};
