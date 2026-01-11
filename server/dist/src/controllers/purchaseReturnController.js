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
exports.deletePurchaseReturn = exports.updatePurchaseReturn = exports.createPurchaseReturn = exports.getPurchaseReturnById = exports.getPurchaseReturns = void 0;
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
// GET all purchase returns
const getPurchaseReturns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchaseReturns = yield prisma.purchasesReturn.findMany({
            include: {
                PurchasesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Suppliers: true,
                Purchases: true,
                Users: true
            },
            orderBy: {
                id: 'desc'
            }
        });
        // Transform the data to match frontend interface
        const transformedReturns = purchaseReturns.map(returnItem => {
            var _a, _b, _c;
            return ({
                id: returnItem.id,
                return_number: `PRN-${returnItem.id.toString().padStart(3, '0')}`,
                original_invoice: `PUR-${returnItem.purchase_id.toString().padStart(3, '0')}`,
                supplier_name: ((_a = returnItem.Suppliers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                supplier_phone: ((_b = returnItem.Suppliers) === null || _b === void 0 ? void 0 : _b.phone) || '',
                supplier_address: ((_c = returnItem.Suppliers) === null || _c === void 0 ? void 0 : _c.address) || '',
                date: new Date().toISOString().split('T')[0],
                total_amount: parseFloat(returnItem.totalPaid.toString()),
                reason: returnItem.note,
                status: 'completed',
                refund_method: 'Credit Note',
                items: returnItem.PurchasesReturnItems.map(item => {
                    var _a;
                    return ({
                        id: item.id,
                        product_id: item.products_id,
                        product_name: ((_a = item.Products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                        quantity: item.quantity,
                        price: parseFloat(item.unitPrice.toString()),
                        return_reason: 'Defective'
                    });
                }),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });
        res.json(transformedReturns);
    }
    catch (error) {
        console.error("Error fetching purchase returns:", error);
        res.status(500).json({ message: "Error retrieving purchase returns" });
    }
});
exports.getPurchaseReturns = getPurchaseReturns;
// GET single purchase return by ID
const getPurchaseReturnById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const purchaseReturn = yield prisma.purchasesReturn.findUnique({
            where: { id: parseInt(id) },
            include: {
                PurchasesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Suppliers: true,
                Purchases: true,
                Users: true
            }
        });
        if (!purchaseReturn) {
            res.status(404).json({ message: "Purchase return not found" });
            return;
        }
        // Transform the data
        const transformedReturn = {
            id: purchaseReturn.id,
            return_number: `PRN-${purchaseReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `PUR-${purchaseReturn.purchase_id.toString().padStart(3, '0')}`,
            supplier_name: ((_a = purchaseReturn.Suppliers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            supplier_phone: ((_b = purchaseReturn.Suppliers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            supplier_address: ((_c = purchaseReturn.Suppliers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(purchaseReturn.totalPaid.toString()),
            reason: purchaseReturn.note,
            status: 'completed',
            refund_method: 'Credit Note',
            items: purchaseReturn.PurchasesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.products_id,
                    product_name: ((_a = item.Products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    quantity: item.quantity,
                    price: parseFloat(item.unitPrice.toString()),
                    return_reason: 'Defective'
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedReturn);
    }
    catch (error) {
        console.error("Error fetching purchase return:", error);
        res.status(500).json({ message: "Error retrieving purchase return" });
    }
});
exports.getPurchaseReturnById = getPurchaseReturnById;
// POST create new purchase return
const createPurchaseReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { purchase_id, user_id, supplier_id, totalPaid, note, items } = req.body;
        // Validate required fields
        if (!purchase_id || !user_id || !supplier_id || !totalPaid || !items || !Array.isArray(items)) {
            res.status(400).json({
                message: "Missing required fields: purchase_id, user_id, supplier_id, totalPaid, items"
            });
            return;
        }
        // Create purchase return
        const newPurchaseReturn = yield prisma.purchasesReturn.create({
            data: {
                returnNo: yield (0, idGenerator_1.generateId)('purchasesReturn', 'PRN'),
                purchase_id: parseInt(purchase_id),
                user_id: parseInt(user_id),
                supplier_id: parseInt(supplier_id),
                totalPaid: parseFloat(totalPaid),
                note: note || 'No reason provided',
                PurchasesReturnItems: {
                    create: items.map((item) => ({
                        products_id: item.product_id,
                        quantity: item.quantity,
                        unitPrice: item.price
                    }))
                }
            },
            include: {
                PurchasesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Suppliers: true,
                Purchases: true,
                Users: true
            }
        });
        // Transform the response
        const transformedReturn = {
            id: newPurchaseReturn.id,
            return_number: `PRN-${newPurchaseReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `PUR-${newPurchaseReturn.purchase_id.toString().padStart(3, '0')}`,
            supplier_name: ((_a = newPurchaseReturn.Suppliers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            supplier_phone: ((_b = newPurchaseReturn.Suppliers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            supplier_address: ((_c = newPurchaseReturn.Suppliers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(newPurchaseReturn.totalPaid.toString()),
            reason: newPurchaseReturn.note,
            status: 'completed',
            refund_method: 'Credit Note',
            items: newPurchaseReturn.PurchasesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.products_id,
                    product_name: ((_a = item.Products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    quantity: item.quantity,
                    price: parseFloat(item.unitPrice.toString()),
                    return_reason: 'Defective'
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.status(201).json(transformedReturn);
    }
    catch (error) {
        console.error("Error creating purchase return:", error);
        res.status(500).json({ message: "Error creating purchase return" });
    }
});
exports.createPurchaseReturn = createPurchaseReturn;
// PUT update purchase return
const updatePurchaseReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const { note, totalPaid } = req.body;
        const updatedPurchaseReturn = yield prisma.purchasesReturn.update({
            where: { id: parseInt(id) },
            data: {
                note,
                totalPaid: totalPaid ? parseFloat(totalPaid) : undefined
            },
            include: {
                PurchasesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Suppliers: true,
                Purchases: true,
                Users: true
            }
        });
        // Transform the response
        const transformedReturn = {
            id: updatedPurchaseReturn.id,
            return_number: `PRN-${updatedPurchaseReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `PUR-${updatedPurchaseReturn.purchase_id.toString().padStart(3, '0')}`,
            supplier_name: ((_a = updatedPurchaseReturn.Suppliers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            supplier_phone: ((_b = updatedPurchaseReturn.Suppliers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            supplier_address: ((_c = updatedPurchaseReturn.Suppliers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(updatedPurchaseReturn.totalPaid.toString()),
            reason: updatedPurchaseReturn.note,
            status: 'completed',
            refund_method: 'Credit Note',
            items: updatedPurchaseReturn.PurchasesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.products_id,
                    product_name: ((_a = item.Products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    quantity: item.quantity,
                    price: parseFloat(item.unitPrice.toString()),
                    return_reason: 'Defective'
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedReturn);
    }
    catch (error) {
        console.error("Error updating purchase return:", error);
        res.status(500).json({ message: "Error updating purchase return" });
    }
});
exports.updatePurchaseReturn = updatePurchaseReturn;
// DELETE purchase return
const deletePurchaseReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First delete related items
        yield prisma.purchasesReturnItems.deleteMany({
            where: { purchaseReturn_id: parseInt(id) }
        });
        // Then delete the purchase return
        yield prisma.purchasesReturn.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Purchase return deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting purchase return:", error);
        res.status(500).json({ message: "Error deleting purchase return" });
    }
});
exports.deletePurchaseReturn = deletePurchaseReturn;
