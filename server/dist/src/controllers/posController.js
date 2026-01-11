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
exports.getPOSStats = exports.createSaleFromPOS = void 0;
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
// CREATE sale from POS
const createSaleFromPOS = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customer_id, items, totalAmount, totalPaid, discount = 0, note = "", user_id } = req.body;
        // Start a transaction
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create the sale
            const sale = yield prisma.sales.create({
                data: {
                    saleNo: yield (0, idGenerator_1.generateId)('sales', 'SALE'),
                    totalAmount: parseFloat(totalAmount.toString()),
                    totalPaid: parseFloat((totalPaid === null || totalPaid === void 0 ? void 0 : totalPaid.toString()) || "0"),
                    totaldiscount: parseFloat(discount.toString()),
                    status: (parseFloat((totalPaid === null || totalPaid === void 0 ? void 0 : totalPaid.toString()) || "0") >= parseFloat(totalAmount.toString())) ? 'Completed' : 'Pending',
                    dueDate: new Date(),
                    customer_id: customer_id || null,
                    user_id: user_id || 1, // Fallback to admin user
                    // note: note,
                },
            });
            // 2. Add sale items and update product quantities
            for (const item of items) {
                // Create sale item
                yield prisma.salesItems.create({
                    data: {
                        quantity: item.quantity,
                        unitPrice: parseFloat(item.unitPrice.toString()),
                        sales_id: sale.id,
                        product_id: item.product_id,
                    },
                });
                // Update product quantity (decrease stock)
                yield prisma.products.update({
                    where: { id: item.product_id },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
            // 3. If there's an advance payment, create a transaction record
            if (totalPaid > 0) {
                yield prisma.$executeRaw `
                    INSERT INTO "Transactions" (sale_id, amount, type, created_at)
                    VALUES (${sale.id}, ${totalPaid}, 'payment', NOW())
                `;
            }
            return sale;
        }));
        // Get the complete sale with details
        const completeSale = yield prisma.sales.findUnique({
            where: { id: result.id },
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
        res.status(201).json({
            message: "Sale created successfully",
            sale: completeSale,
        });
    }
    catch (error) {
        console.error("Error creating POS sale:", error);
        res.status(500).json({
            message: "Error creating sale",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.createSaleFromPOS = createSaleFromPOS;
// GET sales statistics for POS dashboard
const getPOSStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = yield prisma.sales.aggregate({
            where: {
            // createdAt: {
            //     gte: today,
            // },
            },
            _sum: {
                totalAmount: true,
                totalPaid: true,
            },
            _count: true,
        });
        // Top selling products today
        const topProducts = yield prisma.$queryRaw `
            SELECT 
                p.id,
                p.name,
                p.retailPrice,
                SUM(si.quantity) as total_sold,
                SUM(si.quantity * si.unitPrice) as total_revenue
            FROM "SalesItems" si
            JOIN "Products" p ON si.product_id = p.id
            JOIN "Sales" s ON si.sales_id = s.id
            WHERE s.created_at >= ${today}
            GROUP BY p.id, p.name, p.retailPrice
            ORDER BY total_sold DESC
            LIMIT 10
        `;
        res.json({
            today: {
                totalSales: todaySales._count || 0,
                totalAmount: todaySales._sum.totalAmount || 0,
                totalPaid: todaySales._sum.totalPaid || 0,
            },
            topProducts,
        });
    }
    catch (error) {
        console.error("Error fetching POS stats:", error);
        res.status(500).json({ message: "Error retrieving POS statistics" });
    }
});
exports.getPOSStats = getPOSStats;
