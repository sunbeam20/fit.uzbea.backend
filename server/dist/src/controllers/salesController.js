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
exports.getSalesByDateRange = exports.getSalesStats = exports.deleteSale = exports.updateSale = exports.createSale = exports.getSaleById = exports.getAllSales = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
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
                            },
                        },
                    },
                },
            },
            orderBy: {
            // created_at: 'desc',
            },
        });
        res.json(sales);
    }
    catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
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
                            },
                        },
                    },
                },
            },
        });
        if (!sale) {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        res.json(sale);
    }
    catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ error: 'Failed to fetch sale' });
    }
});
exports.getSaleById = getSaleById;
// Create new sale
const createSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customer_id, user_id, totalAmount, totalPaid, dueDate, items, } = req.body;
        // Validate required fields
        if (!customer_id || !user_id || !totalAmount || !items || !items.length) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Start transaction to ensure data consistency
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Create the sale
            const sale = yield prisma.sales.create({
                data: {
                    totalAmount,
                    totalPaid: totalPaid || 0,
                    dueDate: new Date(dueDate),
                    customer_id: parseInt(customer_id),
                    user_id: parseInt(user_id),
                },
            });
            // Create sale items and update product quantities
            const saleItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                // Create sale item
                const saleItem = yield prisma.salesItems.create({
                    data: {
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        sales_id: sale.id,
                        product_id: item.product_id,
                    },
                });
                // Update product quantity
                yield prisma.products.update({
                    where: { id: item.product_id },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });
                return saleItem;
            })));
            return { sale, saleItems };
        }));
        // Fetch the complete sale with relations
        const completeSale = yield prisma.sales.findUnique({
            where: { id: result.sale.id },
            include: {
                Customers: true,
                Users: true,
                SalesItems: {
                    include: {
                        Products: true,
                    },
                },
            },
        });
        res.status(201).json(completeSale);
    }
    catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
});
exports.createSale = createSale;
// Update sale
const updateSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { totalPaid, dueDate, customer_id, user_id } = req.body;
        const updatedSale = yield prisma.sales.update({
            where: { id: parseInt(id) },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (totalPaid !== undefined && { totalPaid })), (dueDate && { dueDate: new Date(dueDate) })), (customer_id && { customer_id: parseInt(customer_id) })), (user_id && { user_id: parseInt(user_id) })),
            include: {
                Customers: true,
                Users: true,
                SalesItems: {
                    include: {
                        Products: true,
                    },
                },
            },
        });
        res.json(updatedSale);
    }
    catch (error) {
        console.error('Error updating sale:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to update sale' });
    }
});
exports.updateSale = updateSale;
// Delete sale
const deleteSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Start transaction to ensure data consistency
        yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // First, get all sale items to restore product quantities
            const saleItems = yield prisma.salesItems.findMany({
                where: { sales_id: parseInt(id) },
                include: {
                    Products: true,
                },
            });
            // Restore product quantities
            yield Promise.all(saleItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                yield prisma.products.update({
                    where: { id: item.product_id },
                    data: {
                        quantity: {
                            increment: item.quantity,
                        },
                    },
                });
            })));
            // Delete sale items
            yield prisma.salesItems.deleteMany({
                where: { sales_id: parseInt(id) },
            });
            // Delete the sale
            yield prisma.sales.delete({
                where: { id: parseInt(id) },
            });
        }));
        res.json({ message: 'Sale deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting sale:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Sale not found' });
            return;
        }
        res.status(500).json({ error: 'Failed to delete sale' });
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
        res.json({
            totalSales,
            totalRevenue: totalRevenueValue,
            totalPaid: totalPaidValue,
            pendingSales,
            completedSales,
            totalDue: totalRevenueValue - totalPaidValue,
        });
    }
    catch (error) {
        console.error('Error fetching sales stats:', error);
        res.status(500).json({ error: 'Failed to fetch sales statistics' });
    }
});
exports.getSalesStats = getSalesStats;
// Get sales by date range
const getSalesByDateRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({ error: 'Start date and end date are required' });
            return;
        }
        // Check what date fields are available in your Sales model
        // Adjust the where clause based on your actual schema
        const sales = yield prisma.sales.findMany({
            where: {
            // Use the appropriate date field from your schema
            // If you have a 'date' field, use that instead
            // created_at: {
            //   gte: new Date(startDate as string),
            //   lte: new Date(endDate as string),
            // },
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
                    },
                },
            },
            orderBy: {
                id: 'desc', // Use id if created_at doesn't work
            },
        });
        res.json(sales);
    }
    catch (error) {
        console.error('Error fetching sales by date range:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});
exports.getSalesByDateRange = getSalesByDateRange;
