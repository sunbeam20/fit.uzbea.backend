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
exports.generateId = generateId;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
function generateId(entityType, prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the last record for this entity type
        let lastRecord;
        switch (entityType) {
            case "users":
                lastRecord = yield prisma.users.findFirst({
                    orderBy: { id: "desc" },
                    select: { userId: true },
                });
                break;
            case "customers":
                lastRecord = yield prisma.customers.findFirst({
                    orderBy: { id: "desc" },
                    select: { custId: true },
                });
                break;
            case "suppliers":
                lastRecord = yield prisma.suppliers.findFirst({
                    orderBy: { id: "desc" },
                    select: { suppId: true },
                });
                break;
            case "products":
                lastRecord = yield prisma.products.findFirst({
                    orderBy: { id: "desc" },
                    select: { productCode: true },
                });
                break;
            case "sales":
                lastRecord = yield prisma.sales.findFirst({
                    orderBy: { id: "desc" },
                    select: { saleNo: true },
                });
                break;
            case "sales_return":
                lastRecord = yield prisma.salesReturn.findFirst({
                    orderBy: { id: "desc" },
                    select: { returnNo: true },
                });
                break;
            case "exchanges":
                lastRecord = yield prisma.exchanges.findFirst({
                    orderBy: { id: "desc" },
                    select: { exchangeNo: true },
                });
                break;
            case "purchases":
                lastRecord = yield prisma.purchases.findFirst({
                    orderBy: { id: "desc" },
                    select: { purchaseNo: true },
                });
                break;
            case "purchases_return":
                lastRecord = yield prisma.purchasesReturn.findFirst({
                    orderBy: { id: "desc" },
                    select: { returnNo: true },
                });
                break;
            case "services":
                lastRecord = yield prisma.services.findFirst({
                    orderBy: { id: "desc" },
                    select: { serviceNo: true },
                });
                break;
            case "expenses":
                lastRecord = yield prisma.expenses.findFirst({
                    orderBy: { id: "desc" },
                    select: { expenseNo: true },
                });
                break;
            default:
                lastRecord = null;
        }
        if (!lastRecord) {
            return `${prefix}-00001`;
        }
        // Extract number from the ID
        let lastId;
        switch (entityType) {
            case "users":
                lastId = lastRecord.userId;
                break;
            case "customers":
                lastId = lastRecord.custId;
                break;
            case "suppliers":
                lastId = lastRecord.suppId;
                break;
            case "products":
                lastId = lastRecord.productCode;
                break;
            case "sales":
                lastId = lastRecord.saleNo;
                break;
            case "sales_return":
                lastId = lastRecord.returnNo;
                break;
            case "exchanges":
                lastId = lastRecord.exchangeNo;
                break;
            case "purchases":
                lastId = lastRecord.purchaseNo;
                break;
            case "purchases_return":
                lastId = lastRecord.returnNo;
                break;
            case "services":
                lastId = lastRecord.serviceNo;
                break;
            case "expenses":
                lastId = lastRecord.expenseNo;
                break;
            default:
                return `${prefix}-00001`;
        }
        // Extract number and increment
        const match = lastId.match(/(\d+)$/);
        if (!match) {
            return `${prefix}-00001`;
        }
        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        // Format with leading zeros
        return `${prefix}-${nextNumber.toString().padStart(5, "0")}`;
    });
}
