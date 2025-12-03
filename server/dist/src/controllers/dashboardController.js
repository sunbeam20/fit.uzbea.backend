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
exports.getDashboardMetrics = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const getDashboardMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const popularProducts = yield prisma.products.findMany({
            take: 2,
            orderBy: {
                quantity: "desc",
            },
        });
        const saleSummary = yield prisma.sales.findMany({
            take: 1,
            orderBy: {
                totalAmount: "desc",
            },
        });
        const purchaseSummary = yield prisma.purchases.findMany({
            take: 1,
            orderBy: {
                totalAmount: "desc",
            },
        });
        const exchangeSummary = yield prisma.exchanges.findMany({
            take: 1,
            orderBy: {
                totalPayback: "desc",
            },
        });
        const serviceSummary = yield prisma.services.findMany({
            take: 1,
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
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving dashboard metrics" });
    }
});
exports.getDashboardMetrics = getDashboardMetrics;
