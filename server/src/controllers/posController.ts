import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// CREATE sale from POS
export const createSaleFromPOS = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            customer_id,
            items,
            totalAmount,
            totalPaid,
            discount = 0,
            note = "",
            user_id
        } = req.body;

        // Start a transaction
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Create the sale
            const sale = await prisma.sales.create({
                data: {
                    totalAmount: parseFloat(totalAmount.toString()),
                    totalPaid: parseFloat(totalPaid?.toString() || "0"),
                    dueDate: new Date(),
                    customer_id: customer_id || null,
                    user_id: user_id || 1, // Fallback to admin user
                    // note: note,
                },
            });

            // 2. Add sale items and update product quantities
            for (const item of items) {
                // Create sale item
                await prisma.salesItems.create({
                    data: {
                        quantity: item.quantity,
                        unitPrice: parseFloat(item.unitPrice.toString()),
                        sales_id: sale.id,
                        product_id: item.product_id,
                    },
                });

                // Update product quantity (decrease stock)
                await prisma.products.update({
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
                await prisma.$executeRaw`
                    INSERT INTO "Transactions" (sale_id, amount, type, created_at)
                    VALUES (${sale.id}, ${totalPaid}, 'payment', NOW())
                `;
            }

            return sale;
        });

        // Get the complete sale with details
        const completeSale = await prisma.sales.findUnique({
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

    } catch (error) {
        console.error("Error creating POS sale:", error);
        res.status(500).json({ 
            message: "Error creating sale",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// GET sales statistics for POS dashboard
export const getPOSStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = await prisma.sales.aggregate({
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
        const topProducts = await prisma.$queryRaw`
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

    } catch (error) {
        console.error("Error fetching POS stats:", error);
        res.status(500).json({message: "Error retrieving POS statistics"});
    }
};