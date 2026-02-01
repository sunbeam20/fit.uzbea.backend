import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface SaleItem {
  product_id: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  serials?: string[]; // Array of serial numbers for serialized products
}

interface CreateSaleBody {
  customer_id: number;
  user_id: number;
  totalAmount: number;
  totalPaid?: number;
  totaldiscount?: number;
  dueDate?: string;
  items: SaleItem[];
}

interface UpdateSaleBody {
  totalPaid?: number;
  dueDate?: string;
  customer_id?: number;
  user_id?: number;
  totaldiscount?: number;
}

// Helper function to generate sale number
async function generateSaleNumber(): Promise<string> {
  // Get the last sale number
  const lastSale = await prisma.sales.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      saleNo: true,
    },
  });

  if (!lastSale || !lastSale.saleNo) {
    return "S-00001";
  }

  // Extract number and increment
  const match = lastSale.saleNo.match(/S-(\d+)/);
  if (!match) {
    return "S-00001";
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;

  // Format with leading zeros
  return `S-${nextNumber.toString().padStart(5, "0")}`;
}

// Helper function to get product's retail price based on whether it's serialized
async function getProductRetailPrice(productId: number): Promise<number> {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    include: {
      productSerials: {
        where: { status: "Available" },
        take: 1,
      },
    },
  });

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  if (product.useIndividualSerials) {
    // For serialized products, get retail price from available serial
    const availableSerial = product.productSerials[0];
    if (!availableSerial) {
      throw new Error(`No available serials for product ID ${productId}`);
    }
    return Number(availableSerial.retailPrice);
  } else {
    // For non-serialized products, we need to return a default price
    // Since we removed pricing from products, we should get it from somewhere else
    // For now, we'll return 0 and handle validation in createSale
    return 0;
  }
}

// Get all sales with related data
export const getAllSales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sales = await prisma.sales.findMany({
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                useIndividualSerials: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    serial: true,
                    status: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
};

// Get single sale by ID
export const getSaleById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await prisma.sales.findUnique({
      where: { id: parseInt(id) },
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                useIndividualSerials: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    serial: true,
                    status: true,
                    warranty: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
};

// Create new sale
export const createSale = async (
  req: Request<{}, {}, CreateSaleBody>,
  res: Response
): Promise<void> => {
  try {
    const {
      customer_id,
      user_id,
      totalAmount,
      totalPaid,
      totaldiscount,
      dueDate,
      items,
    } = req.body;

    console.log("=== CREATE SALE REQUEST ===");
    console.log("Request body:", req.body);

    // Validate required fields
    if (!customer_id || !user_id || !totalAmount || !items || !items.length) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Generate sale number
    const saleNo = await generateSaleNumber();

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Validate customer exists
      const customer = await tx.customers.findUnique({
        where: { id: customer_id },
      });

      if (!customer) {
        throw new Error(`Customer with ID ${customer_id} not found`);
      }

      // Validate user exists
      const user = await tx.users.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        throw new Error(`User with ID ${user_id} not found`);
      }

      // Validate all products and check quantities/serials
      const productValidations = await Promise.all(
        items.map(async (item) => {
          const product = await tx.products.findUnique({
            where: { id: item.product_id },
          });

          if (!product) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }

          if (product.status !== "Active") {
            throw new Error(`Product ${product.name} is not active`);
          }

          if (product.useIndividualSerials) {
            // For serialized products
            if (!item.serials || item.serials.length === 0) {
              throw new Error(
                `Serial numbers are required for product ${product.name}`
              );
            }

            // Check if quantity matches number of serials
            if (item.quantity !== item.serials.length) {
              throw new Error(
                `Quantity (${item.quantity}) must match number of serials (${item.serials.length}) for product ${product.name}`
              );
            }

            // Check if all serials exist and are available for this product
            const serialPromises = item.serials.map(async (serial) => {
              const productSerial = await tx.productSerials.findFirst({
                where: {
                  serial,
                  product_id: product.id,
                  status: "Available",
                },
              });

              if (!productSerial) {
                throw new Error(
                  `Serial ${serial} not found or not available for product ${product.name}`
                );
              }

              // Validate price matches serial's retail price
              if (Number(item.unitPrice) !== Number(productSerial.retailPrice)) {
                console.warn(`Price mismatch for serial ${serial}. Item price: ${item.unitPrice}, Serial retail price: ${productSerial.retailPrice}`);
                // We'll still allow it, but log a warning
              }

              return productSerial;
            });

            const serials = await Promise.all(serialPromises);

            // Check for duplicate serials in the request
            const uniqueSerials = new Set(item.serials);
            if (uniqueSerials.size !== item.serials.length) {
              throw new Error(
                `Duplicate serial numbers found for product ${product.name}`
              );
            }

            return {
              product,
              item,
              serials,
            };
          } else {
            // For non-serialized products, check quantity
            if (product.quantity < item.quantity) {
              throw new Error(
                `Insufficient quantity for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
              );
            }

            // For non-serialized products, we can't validate price since it's not in the product table
            // We'll accept the provided price
            console.log(`Non-serialized product ${product.name}: accepting provided price ${item.unitPrice}`);

            return {
              product,
              item,
              serials: null,
            };
          }
        })
      );

      // Calculate total amount from items to validate against provided totalAmount
      const calculatedTotal = productValidations.reduce((total, validation) => {
        const itemTotal = validation.item.quantity * validation.item.unitPrice;
        return total + itemTotal - (validation.item.discount || 0);
      }, 0);

      // Validate calculated total matches provided totalAmount (with some tolerance)
      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        console.warn(`Total amount mismatch. Calculated: ${calculatedTotal}, Provided: ${totalAmount}`);
        // We'll continue but use the calculated total
      }

      // Create the sale
      const sale = await tx.sales.create({
        data: {
          saleNo,
          totalAmount: calculatedTotal, // Use calculated total
          totalPaid: totalPaid || 0,
          totaldiscount: totaldiscount || 0,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: (totalPaid || 0) >= calculatedTotal ? "Completed" : "Pending",
          customer_id,
          user_id,
        },
      });

      // Create sale items and update product quantities/serials
      const saleItems = await Promise.all(
        productValidations.map(async (validation) => {
          const { product, item, serials } = validation;

          // Create sale item
          const saleItem = await tx.salesItems.create({
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              sales_id: sale.id,
              product_id: product.id,
            },
          });

          if (product.useIndividualSerials && serials) {
            // For serialized products
            // 1. Update each serial status to 'Sold' and record sold price
            // 2. Create SalesItemSerials records linking SalesItems to ProductSerials
            await Promise.all(
              serials.map(async (serial) => {
                // Update serial status
                await tx.productSerials.update({
                  where: { id: serial.id },
                  data: {
                    status: "Sold",
                    updatedAt: new Date(),
                  },
                });

                // Create SalesItemSerials record with sold price
                await tx.salesItemSerials.create({
                  data: {
                    salesItem_id: saleItem.id,
                    serial_id: serial.id,
                    soldPrice: item.unitPrice, // Record the actual sold price
                    soldAt: new Date(),
                  },
                });
              })
            );

            // Update product quantity (decrement by number of serials sold)
            await tx.products.update({
              where: { id: product.id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
                updatedAt: new Date(),
              },
            });
          } else {
            // For non-serialized products, decrement quantity
            await tx.products.update({
              where: { id: product.id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
                updatedAt: new Date(),
              },
            });
          }

          return {
            saleItem,
            serials: serials ? serials.map((s) => s.serial) : null,
          };
        })
      );

      return {
        sale,
        saleItems,
        calculatedTotal,
      };
    });

    // Fetch the complete sale with relations
    const completeSale = await prisma.sales.findUnique({
      where: { id: result.sale.id },
      include: {
        Customers: true,
        Users: true,
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                productCode: true,
                useIndividualSerials: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    id: true,
                    serial: true,
                    status: true,
                    warranty: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(201).json(completeSale);
  } catch (error: any) {
    console.error("Error creating sale:", error);
    res.status(400).json({
      error: "Failed to create sale",
      message: error.message,
    });
  }
};

// Create sale from POS (simplified version)
export const createSaleFromPOS = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      customer_id,
      items,
      totalAmount,
      totalPaid = 0,
      discount = 0,
    } = req.body;

    console.log("=== CREATE SALE FROM POS REQUEST ===");
    console.log("Request body:", req.body);

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Items are required" });
      return;
    }

    // Get default user (POS user) or use provided user_id
    const posUser = await prisma.users.findFirst({
      where: { email: "sales@example.com" }, // Default POS user
    });

    if (!posUser) {
      res.status(400).json({ error: "POS user not found" });
      return;
    }

    const user_id = posUser.id;

    // Generate sale number
    const saleNo = await generateSaleNumber();

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Validate customer if provided
      if (customer_id) {
        const customer = await tx.customers.findUnique({
          where: { id: customer_id },
        });
        if (!customer) {
          throw new Error(`Customer with ID ${customer_id} not found`);
        }
      }

      // Process items
      const processedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await tx.products.findUnique({
            where: { id: item.product_id },
            include: {
              productSerials: {
                where: { status: "Available" },
              },
            },
          });

          if (!product) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }

          if (product.useIndividualSerials) {
            // For serialized products, get available serials
            const availableSerials = product.productSerials.slice(0, item.quantity);
            if (availableSerials.length < item.quantity) {
              throw new Error(
                `Insufficient available serials for ${product.name}. Available: ${availableSerials.length}, Requested: ${item.quantity}`
              );
            }

            const serials = availableSerials.map(s => s.serial);
            const unitPrice = availableSerials[0]?.retailPrice || item.unitPrice;

            return {
              ...item,
              serials,
              unitPrice: Number(unitPrice),
              product,
              availableSerials,
            };
          } else {
            // For non-serialized products
            if (product.quantity < item.quantity) {
              throw new Error(
                `Insufficient quantity for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
              );
            }
            return {
              ...item,
              product,
            };
          }
        })
      );

      // Calculate total from processed items
      const calculatedTotal = processedItems.reduce((total, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const itemDiscount = item.discount?.type === 'percentage' 
          ? itemTotal * (item.discount.value / 100)
          : item.discount?.value || 0;
        return total + itemTotal - itemDiscount;
      }, 0);

      // Create the sale
      const sale = await tx.sales.create({
        data: {
          saleNo,
          totalAmount: calculatedTotal,
          totalPaid: totalPaid || 0,
          totaldiscount: discount || 0,
          dueDate: null,
          status: "Completed", // POS sales are usually completed immediately
          customer_id: customer_id || null,
          user_id,
        },
      });

      // Create sale items
      const saleItems = await Promise.all(
        processedItems.map(async (item) => {
          const saleItem = await tx.salesItems.create({
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount?.value || 0,
              sales_id: sale.id,
              product_id: item.product_id,
            },
          });

          if (item.product.useIndividualSerials && item.availableSerials) {
            // Update serials and create SalesItemSerials
            await Promise.all(
              item.availableSerials.map(async (serial: { id: any; }) => {
                await tx.productSerials.update({
                  where: { id: serial.id },
                  data: {
                    status: "Sold",
                    updatedAt: new Date(),
                  },
                });

                await tx.salesItemSerials.create({
                  data: {
                    salesItem_id: saleItem.id,
                    serial_id: serial.id,
                    soldPrice: item.unitPrice,
                    soldAt: new Date(),
                  },
                });
              })
            );

            // Update product quantity
            await tx.products.update({
              where: { id: item.product_id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            // Update product quantity for non-serialized
            await tx.products.update({
              where: { id: item.product_id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            });
          }

          return saleItem;
        })
      );

      return { sale, saleItems };
    });

    // Fetch complete sale
    const completeSale = await prisma.sales.findUnique({
      where: { id: result.sale.id },
      include: {
        Customers: true,
        Users: true,
        SalesItems: {
          include: {
            Products: true,
            salesItemSerials: {
              include: {
                ProductSerials: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(completeSale);
  } catch (error: any) {
    console.error("Error creating sale from POS:", error);
    res.status(400).json({
      error: "Failed to create sale",
      message: error.message,
    });
  }
};

// Update sale
export const updateSale = async (
  req: Request<{ id: string }, {}, UpdateSaleBody>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalPaid, dueDate, customer_id, user_id, totaldiscount } =
      req.body;

    // Validate sale exists
    const existingSale = await prisma.sales.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSale) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    // Validate customer if provided
    if (customer_id) {
      const customer = await prisma.customers.findUnique({
        where: { id: customer_id },
      });

      if (!customer) {
        res
          .status(400)
          .json({ error: `Customer with ID ${customer_id} not found` });
        return;
      }
    }

    // Validate user if provided
    if (user_id) {
      const user = await prisma.users.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        res.status(400).json({ error: `User with ID ${user_id} not found` });
        return;
      }
    }

    // Update sale status based on payment
    let status = existingSale.status;
    // if (totalPaid !== undefined) {
    //   status = totalPaid >= existingSale.totalAmount ? "Completed" : "Pending";
    // }

    const updatedSale = await prisma.sales.update({
      where: { id: parseInt(id) },
      data: {
        ...(totalPaid !== undefined && { totalPaid }),
        ...(totaldiscount !== undefined && { totaldiscount }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(customer_id && { customer_id }),
        ...(user_id && { user_id }),
        status,
      },
      include: {
        Customers: true,
        Users: true,
        SalesItems: {
          include: {
            Products: true,
            salesItemSerials: {
              include: {
                ProductSerials: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedSale);
  } catch (error: any) {
    console.error("Error updating sale:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Sale not found" });
      return;
    }
    res.status(500).json({ error: "Failed to update sale" });
  }
};

// Delete sale
export const deleteSale = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Start transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // First, get the sale with all items and serials
      const sale = await tx.sales.findUnique({
        where: { id: parseInt(id) },
        include: {
          SalesItems: {
            include: {
              Products: true,
              salesItemSerials: {
                include: {
                  ProductSerials: true,
                },
              },
            },
          },
        },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      // Restore product quantities and serial statuses
      await Promise.all(
        sale.SalesItems.map(async (salesItem) => {
          const product = salesItem.Products;

          // Check if product exists
          if (!product) {
            console.warn(
              `Product not found for SalesItem ${salesItem.id}, skipping restoration`
            );
            return;
          }

          if (product.useIndividualSerials) {
            // For serialized products
            // 1. Restore each serial status to 'Available'
            // 2. Delete SalesItemSerials records
            await Promise.all(
              salesItem.salesItemSerials.map(async (salesItemSerial) => {
                // Restore serial status
                await tx.productSerials.update({
                  where: { id: salesItemSerial.serial_id },
                  data: {
                    status: "Available",
                    updatedAt: new Date(),
                  },
                });
              })
            );

            // Restore product quantity
            await tx.products.update({
              where: { id: product.id },
              data: {
                quantity: {
                  increment: salesItem.quantity,
                },
                updatedAt: new Date(),
              },
            });
          } else {
            // For non-serialized products, restore quantity
            await tx.products.update({
              where: { id: product.id },
              data: {
                quantity: {
                  increment: salesItem.quantity,
                },
                updatedAt: new Date(),
              },
            });
          }

          // Delete SalesItemSerials
          await tx.salesItemSerials.deleteMany({
            where: { salesItem_id: salesItem.id },
          });
        })
      );

      // Delete sale items
      await tx.salesItems.deleteMany({
        where: { sales_id: parseInt(id) },
      });

      // Delete the sale
      await tx.sales.delete({
        where: { id: parseInt(id) },
      });
    });

    res.json({ message: "Sale deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting sale:", error);
    if (error.message === "Sale not found") {
      res.status(404).json({ error: "Sale not found" });
      return;
    }
    res.status(500).json({ error: "Failed to delete sale" });
  }
};

// Get sales statistics
export const getSalesStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const totalSales = await prisma.sales.count();

    const totalRevenue = await prisma.sales.aggregate({
      _sum: {
        totalAmount: true,
      },
    });

    const totalPaid = await prisma.sales.aggregate({
      _sum: {
        totalPaid: true,
      },
    });

    const totalDiscount = await prisma.sales.aggregate({
      _sum: {
        totaldiscount: true,
      },
    });

    const pendingSales = await prisma.sales.count({
      where: {
        totalPaid: {
          lt: prisma.sales.fields.totalAmount,
        },
      },
    });

    const completedSales = await prisma.sales.count({
      where: {
        totalPaid: {
          gte: prisma.sales.fields.totalAmount,
        },
      },
    });

    // Convert Decimal to number for arithmetic operations
    const totalRevenueValue = Number(totalRevenue._sum.totalAmount) || 0;
    const totalPaidValue = Number(totalPaid._sum.totalPaid) || 0;
    const totalDiscountValue = Number(totalDiscount._sum.totaldiscount) || 0;

    res.json({
      totalSales,
      totalRevenue: totalRevenueValue,
      totalPaid: totalPaidValue,
      totalDiscount: totalDiscountValue,
      pendingSales,
      completedSales,
      totalDue: totalRevenueValue - totalPaidValue,
      netRevenue: totalRevenueValue - totalDiscountValue,
    });
  } catch (error) {
    console.error("Error fetching sales stats:", error);
    res.status(500).json({ error: "Failed to fetch sales statistics" });
  }
};

// Get sales by date range
export const getSalesByDateRange = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: "Start date and end date are required" });
      return;
    }

    const sales = await prisma.sales.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        Customers: {
          select: {
            name: true,
            phone: true,
          },
        },
        Users: {
          select: {
            name: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                name: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    serial: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales by date range:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
};

// Search sales
export const searchSales = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    const sales = await prisma.sales.findMany({
      where: {
        OR: [
          {
            saleNo: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            Customers: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            Customers: {
              phone: {
                contains: query,
              },
            },
          },
          {
            SalesItems: {
              some: {
                Products: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
          {
            SalesItems: {
              some: {
                salesItemSerials: {
                  some: {
                    ProductSerials: {
                      serial: {
                        contains: query,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                useIndividualSerials: true,
                productCode: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    id: true,
                    serial: true,
                    status: true,
                    warranty: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        id: "desc",
      },
      take: 20,
    });

    res.json(sales);
  } catch (error) {
    console.error("Search sales error:", error);
    res.status(500).json({
      error: "Failed to search sales",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get sale by invoice number
export const getSaleByInvoice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { invoiceNumber } = req.params;

    const sale = await prisma.sales.findFirst({
      where: {
        saleNo: invoiceNumber,
      },
      include: {
        Customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        SalesItems: {
          include: {
            Products: {
              select: {
                id: true,
                name: true,
                specification: true,
                useIndividualSerials: true,
              },
            },
            salesItemSerials: {
              include: {
                ProductSerials: {
                  select: {
                    id: true,
                    serial: true,
                    status: true,
                    warranty: true,
                    retailPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error("Error fetching sale by invoice:", error);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
};