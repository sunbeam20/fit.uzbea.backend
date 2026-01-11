"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSales = exports.getSalesByDateRange = exports.getSalesStats = exports.deleteSale = exports.updateSale = exports.createSale = exports.getSaleById = exports.getAllSales = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Helper function to generate sale number
function generateSaleNumber() {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the last sale number
        const lastSale = yield prisma.sales.findFirst({
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
    });
}
// Get all sales with related data
const getAllSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sales = yield prisma.sales.findMany({
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
                                retailPrice: true,
                                useIndividualSerials: true,
                            },
                        },
                        salesItemSerials: {
                            include: {
                                ProductSerials: {
                                    select: {
                                        serial: true,
                                        status: true,
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
    }
    catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).json({ error: "Failed to fetch sales" });
    }
});
exports.getAllSales = getAllSales;
// Get single sale by ID
const getSaleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const sale = yield prisma.sales.findUnique({
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
                                retailPrice: true,
                                wholesalePrice: true,
                                purchasePrice: true,
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
    }
    catch (error) {
        console.error("Error fetching sale:", error);
        res.status(500).json({ error: "Failed to fetch sale" });
    }
});
exports.getSaleById = getSaleById;
// Create new sale
const createSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customer_id, user_id, totalAmount, totalPaid, totaldiscount, dueDate, items, } = req.body;
        // Validate required fields
        if (!customer_id || !user_id || !totalAmount || !items || !items.length) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        // Generate sale number
        const saleNo = yield generateSaleNumber();
        // Start transaction to ensure data consistency
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Validate customer exists
            const customer = yield tx.customers.findUnique({
                where: { id: customer_id },
            });
            if (!customer) {
                throw new Error(`Customer with ID ${customer_id} not found`);
            }
            // Validate user exists
            const user = yield tx.users.findUnique({
                where: { id: user_id },
            });
            if (!user) {
                throw new Error(`User with ID ${user_id} not found`);
            }
            // Validate all products and check quantities/serials
            const productValidations = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const product = yield tx.products.findUnique({
                    where: { id: item.product_id },
                });
                if (!product) {
                    throw new Error(`Product with ID ${item.product_id} not found`);
                }
                if (product.status !== "Active") {
                    throw new Error(`Product ${product.name} is not active`);
                }
                // Validate price matches retail price
                if (Number(item.unitPrice) !== Number(product.retailPrice)) {
                    throw new Error(`Unit price for ${product.name} does not match retail price`);
                }
                if (product.useIndividualSerials) {
                    // For serialized products
                    if (!item.serials || item.serials.length === 0) {
                        throw new Error(`Serial numbers are required for product ${product.name}`);
                    }
                    // Check if quantity matches number of serials
                    if (item.quantity !== item.serials.length) {
                        throw new Error(`Quantity (${item.quantity}) must match number of serials (${item.serials.length}) for product ${product.name}`);
                    }
                    // Check if all serials exist and are available for this product
                    const serialPromises = item.serials.map((serial) => __awaiter(void 0, void 0, void 0, function* () {
                        const productSerial = yield tx.productSerials.findFirst({
                            where: {
                                serial,
                                product_id: product.id,
                                status: "Available",
                            },
                        });
                        if (!productSerial) {
                            throw new Error(`Serial ${serial} not found or not available for product ${product.name}`);
                        }
                        return productSerial;
                    }));
                    const serials = yield Promise.all(serialPromises);
                    // Check for duplicate serials in the request
                    const uniqueSerials = new Set(item.serials);
                    if (uniqueSerials.size !== item.serials.length) {
                        throw new Error(`Duplicate serial numbers found for product ${product.name}`);
                    }
                    return {
                        product,
                        item,
                        serials,
                    };
                }
                else {
                    // For non-serialized products, check quantity
                    if (product.quantity < item.quantity) {
                        throw new Error(`Insufficient quantity for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
                    }
                    return {
                        product,
                        item,
                        serials: null,
                    };
                }
            })));
            // Create the sale
            const sale = yield tx.sales.create({
                data: {
                    saleNo,
                    totalAmount,
                    totalPaid: totalPaid || 0,
                    totaldiscount: totaldiscount || 0,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    status: (totalPaid || 0) >= totalAmount ? "Completed" : "Pending",
                    customer_id,
                    user_id,
                },
            });
            // Create sale items and update product quantities/serials
            const saleItems = yield Promise.all(productValidations.map((validation) => __awaiter(void 0, void 0, void 0, function* () {
                const { product, item, serials } = validation;
                // Create sale item
                const saleItem = yield tx.salesItems.create({
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
                    // 1. Update each serial status to 'Sold'
                    // 2. Create SalesItemSerials records linking SalesItems to ProductSerials
                    yield Promise.all(serials.map((serial) => __awaiter(void 0, void 0, void 0, function* () {
                        // Update serial status
                        yield tx.productSerials.update({
                            where: { id: serial.id },
                            data: {
                                status: "Sold",
                                updatedAt: new Date(),
                            },
                        });
                        // Create SalesItemSerials record
                        yield tx.salesItemSerials.create({
                            data: {
                                salesItem_id: saleItem.id,
                                serial_id: serial.id,
                            },
                        });
                    })));
                }
                else {
                    // For non-serialized products, decrement quantity
                    yield tx.products.update({
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
            })));
            return {
                sale,
                saleItems,
            };
        }));
        // Fetch the complete sale with relations
        const completeSale = yield prisma.sales.findUnique({
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
                                retailPrice: true,
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json(completeSale);
    }
    catch (error) {
        console.error("Error creating sale:", error);
        res.status(400).json({
            error: "Failed to create sale",
            message: error.message,
        });
    }
});
exports.createSale = createSale;
// Update sale
const updateSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { totalPaid, dueDate, customer_id, user_id, totaldiscount } = req.body;
        // Validate sale exists
        const existingSale = yield prisma.sales.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingSale) {
            res.status(404).json({ error: "Sale not found" });
            return;
        }
        // Validate customer if provided
        if (customer_id) {
            const customer = yield prisma.customers.findUnique({
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
            const user = yield prisma.users.findUnique({
                where: { id: user_id },
            });
            if (!user) {
                res.status(400).json({ error: `User with ID ${user_id} not found` });
                return;
            }
        }
        const updatedSale = yield prisma.sales.update({
            where: { id: parseInt(id) },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (totalPaid !== undefined && { totalPaid })), (totaldiscount !== undefined && { totaldiscount })), (dueDate && { dueDate: new Date(dueDate) })), (customer_id && { customer_id })), (user_id && { user_id })),
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
    }
    catch (error) {
        console.error("Error updating sale:", error);
        if (error.code === "P2025") {
            res.status(404).json({ error: "Sale not found" });
            return;
        }
        res.status(500).json({ error: "Failed to update sale" });
    }
});
exports.updateSale = updateSale;
// Delete sale
const deleteSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Start transaction to ensure data consistency
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // First, get the sale with all items and serials
            const sale = yield tx.sales.findUnique({
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
            yield Promise.all(sale.SalesItems.map((salesItem) => __awaiter(void 0, void 0, void 0, function* () {
                const product = salesItem.Products;
                // Check if product exists (should always exist, but TypeScript needs this check)
                if (!product) {
                    console.warn(`Product not found for SalesItem ${salesItem.id}, skipping restoration`);
                    return;
                }
                if (product.useIndividualSerials) {
                    // For serialized products
                    // 1. Restore each serial status to 'Available'
                    // 2. Delete SalesItemSerials records
                    yield Promise.all(salesItem.salesItemSerials.map((salesItemSerial) => __awaiter(void 0, void 0, void 0, function* () {
                        // Restore serial status
                        yield tx.productSerials.update({
                            where: { id: salesItemSerial.serial_id },
                            data: {
                                status: "Available",
                                updatedAt: new Date(),
                            },
                        });
                    })));
                }
                else {
                    // For non-serialized products, restore quantity
                    yield tx.products.update({
                        where: { id: product.id },
                        data: {
                            quantity: {
                                increment: salesItem.quantity,
                            },
                            updatedAt: new Date(),
                        },
                    });
                }
                // Delete SalesItemSerials (if not cascading)
                yield tx.salesItemSerials.deleteMany({
                    where: { salesItem_id: salesItem.id },
                });
            })));
            // Delete sale items
            yield tx.salesItems.deleteMany({
                where: { sales_id: parseInt(id) },
            });
            // Delete the sale
            yield tx.sales.delete({
                where: { id: parseInt(id) },
            });
        }));
        res.json({ message: "Sale deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting sale:", error);
        if (error.message === "Sale not found") {
            res.status(404).json({ error: "Sale not found" });
            return;
        }
        res.status(500).json({ error: "Failed to delete sale" });
    }
});
exports.deleteSale = deleteSale;
// Get sales statistics
const getSalesStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalSales = yield prisma.sales.count();
        const totalRevenue = yield prisma.sales.aggregate({
            _sum: {
                totalAmount: true,
            },
        });
        const totalPaid = yield prisma.sales.aggregate({
            _sum: {
                totalPaid: true,
            },
        });
        const totalDiscount = yield prisma.sales.aggregate({
            _sum: {
                totaldiscount: true,
            },
        });
        const pendingSales = yield prisma.sales.count({
            where: {
                totalPaid: {
                    lt: prisma.sales.fields.totalAmount,
                },
            },
        });
        const completedSales = yield prisma.sales.count({
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
    }
    catch (error) {
        console.error("Error fetching sales stats:", error);
        res.status(500).json({ error: "Failed to fetch sales statistics" });
    }
});
exports.getSalesStats = getSalesStats;
// Get sales by date range
const getSalesByDateRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({ error: "Start date and end date are required" });
            return;
        }
        const sales = yield prisma.sales.findMany({
            where: {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
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
                                retailPrice: true,
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
    }
    catch (error) {
        console.error("Error fetching sales by date range:", error);
        res.status(500).json({ error: "Failed to fetch sales" });
    }
});
exports.getSalesByDateRange = getSalesByDateRange;
// Search sales
const searchSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        if (!query || typeof query !== "string") {
            return res.status(400).json({
                error: "Search query is required",
            });
        }
        const sales = yield prisma.sales.findMany({
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
                                retailPrice: true,
                                wholesalePrice: true,
                                purchasePrice: true,
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
    }
    catch (error) {
        console.error("Search sales error:", error);
        res.status(500).json({
            error: "Failed to search sales",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.searchSales = searchSales;
