import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";


const prisma = new PrismaClient();

export const getDashboardMetrics = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const popularProducts = await prisma.products.findMany({
            take: 5,
            orderBy: {
                quantity: "desc",
            },
        });
        const saleSummary = await prisma.sales.findMany({
            take: 1,
            orderBy: {
                totalAmount: "desc",
            },
        });
        const purchaseSummary = await prisma.purchases.findMany({
            take: 1,
            orderBy: {
                totalAmount: "desc",
            },
        });
        const exchangeSummary = await prisma.exchanges.findMany({
            take: 1,
            orderBy: {
                totalPayback: "desc",
            },
        });
        const serviceSummary = await prisma.services.findMany({
            take: 2,
            orderBy: {
                serviceCost: "desc",
            },
        });

        res.json({
            popularProducts,
            saleSummary,
            purchaseSummary,
            exchangeSummary,
            serviceSummary,
        })
    } catch (error) {
        res.status(500).json({message: "Error retrieving dashboard metrics"});
    }
}