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
exports.getPurchaseStatistics = exports.getPurchasesBySupplier = exports.deletePurchase = exports.updatePurchase = exports.createPurchase = exports.getPurchaseById = exports.getAllPurchases = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Get all purchases with related data
const getAllPurchases = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchases = yield prisma.purchases.findMany({
            include: {
                Suppliers: true,
                Users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                PurchasesItems: {
                    include: {
                        Products: true,
                    },
                },
            },
            orderBy: {
                id: 'desc',
            },
        });
        res.json({
            success: true,
            data: purchases,
        });
    }
    catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchases',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getAllPurchases = getAllPurchases;
// Get single purchase by ID
const getPurchaseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const purchase = yield prisma.purchases.findUnique({
            where: {
                id: parseInt(id),
            },
            include: {
                Suppliers: true,
                Users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                PurchasesItems: {
                    include: {
                        Products: true,
                    },
                },
            },
        });
        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase not found',
            });
        }
        res.json({
            success: true,
            data: purchase,
        });
    }
    catch (error) {
        console.error('Error fetching purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getPurchaseById = getPurchaseById;
// Create new purchase
const createPurchase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { totalAmount, totalPaid, dueDate, note, supplier_id, user_id, items, } = req.body;
        // Validate required fields
        if (!totalAmount || !supplier_id || !user_id || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: totalAmount, supplier_id, user_id, and items array are required',
            });
        }
        // Start transaction to ensure data consistency
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create the purchase
            const purchase = yield tx.purchases.create({
                data: {
                    totalAmount: parseFloat(totalAmount),
                    totalPaid: parseFloat(totalPaid || 0),
                    dueDate: new Date(dueDate),
                    note: note || '',
                    supplier_id: parseInt(supplier_id),
                    user_id: parseInt(user_id),
                },
            });
            // Create purchase items
            const purchaseItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const { product_id, quantity, unitPrice } = item;
                // Update product quantity
                yield tx.products.update({
                    where: { id: parseInt(product_id) },
                    data: {
                        quantity: {
                            increment: parseInt(quantity),
                        },
                    },
                });
                return tx.purchasesItems.create({
                    data: {
                        quantity: parseInt(quantity),
                        unitPrice: parseFloat(unitPrice),
                        purchase_id: purchase.id,
                        product_id: parseInt(product_id),
                    },
                    include: {
                        Products: true,
                    },
                });
            })));
            return {
                purchase,
                items: purchaseItems,
            };
        }));
        res.status(201).json({
            success: true,
            message: 'Purchase created successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error creating purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create purchase',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.createPurchase = createPurchase;
// Update purchase
const updatePurchase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { totalAmount, totalPaid, dueDate, note, supplier_id, items, } = req.body;
        // Check if purchase exists
        const existingPurchase = yield prisma.purchases.findUnique({
            where: { id: parseInt(id) },
            include: { PurchasesItems: true },
        });
        if (!existingPurchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase not found',
            });
        }
        // Start transaction
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update purchase
            const updatedPurchase = yield tx.purchases.update({
                where: { id: parseInt(id) },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (totalAmount && { totalAmount: parseFloat(totalAmount) })), (totalPaid && { totalPaid: parseFloat(totalPaid) })), (dueDate && { dueDate: new Date(dueDate) })), (note !== undefined && { note })), (supplier_id && { supplier_id: parseInt(supplier_id) })),
            });
            // If items are provided, update them
            if (items && Array.isArray(items)) {
                // First, revert old quantities
                yield Promise.all(existingPurchase.PurchasesItems.map((oldItem) => __awaiter(void 0, void 0, void 0, function* () {
                    yield tx.products.update({
                        where: { id: oldItem.product_id },
                        data: {
                            quantity: {
                                decrement: oldItem.quantity,
                            },
                        },
                    });
                })));
                // Delete old items
                yield tx.purchasesItems.deleteMany({
                    where: { purchase_id: parseInt(id) },
                });
                // Create new items with updated quantities
                const newItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                    const { product_id, quantity, unitPrice } = item;
                    // Update product quantity with new values
                    yield tx.products.update({
                        where: { id: parseInt(product_id) },
                        data: {
                            quantity: {
                                increment: parseInt(quantity),
                            },
                        },
                    });
                    return tx.purchasesItems.create({
                        data: {
                            quantity: parseInt(quantity),
                            unitPrice: parseFloat(unitPrice),
                            purchase_id: parseInt(id),
                            product_id: parseInt(product_id),
                        },
                        include: {
                            Products: true,
                        },
                    });
                })));
                return {
                    purchase: updatedPurchase,
                    items: newItems,
                };
            }
            return {
                purchase: updatedPurchase,
                items: existingPurchase.PurchasesItems,
            };
        }));
        res.json({
            success: true,
            message: 'Purchase updated successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error updating purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update purchase',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.updatePurchase = updatePurchase;
// Delete purchase
const deletePurchase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if purchase exists
        const existingPurchase = yield prisma.purchases.findUnique({
            where: { id: parseInt(id) },
            include: { PurchasesItems: true },
        });
        if (!existingPurchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase not found',
            });
        }
        // Start transaction to revert product quantities
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Revert product quantities
            yield Promise.all(existingPurchase.PurchasesItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                yield tx.products.update({
                    where: { id: item.product_id },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });
            })));
            // Delete purchase items first (due to foreign key constraints)
            yield tx.purchasesItems.deleteMany({
                where: { purchase_id: parseInt(id) },
            });
            // Delete the purchase
            yield tx.purchases.delete({
                where: { id: parseInt(id) },
            });
        }));
        res.json({
            success: true,
            message: 'Purchase deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete purchase',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.deletePurchase = deletePurchase;
// Get purchases by supplier
const getPurchasesBySupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { supplierId } = req.params;
        const purchases = yield prisma.purchases.findMany({
            where: {
                supplier_id: parseInt(supplierId),
            },
            include: {
                Suppliers: true,
                Users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                PurchasesItems: {
                    include: {
                        Products: true,
                    },
                },
            },
            orderBy: {
                id: 'desc',
            },
        });
        res.json({
            success: true,
            data: purchases,
        });
    }
    catch (error) {
        console.error('Error fetching purchases by supplier:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchases by supplier',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getPurchasesBySupplier = getPurchasesBySupplier;
// Get purchase statistics
// Get purchase statistics
const getPurchaseStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalPurchases = yield prisma.purchases.count();
        const totalAmount = yield prisma.purchases.aggregate({
            _sum: {
                totalAmount: true,
            },
        });
        const totalPaid = yield prisma.purchases.aggregate({
            _sum: {
                totalPaid: true,
            },
        });
        // Convert Decimal to number for arithmetic operations
        const totalAmountNum = totalAmount._sum.totalAmount ? Number(totalAmount._sum.totalAmount) : 0;
        const totalPaidNum = totalPaid._sum.totalPaid ? Number(totalPaid._sum.totalPaid) : 0;
        const totalDue = totalAmountNum - totalPaidNum;
        // Get recent purchases
        const recentPurchases = yield prisma.purchases.findMany({
            take: 5,
            orderBy: {
                id: 'desc',
            },
            include: {
                Suppliers: true,
            },
        });
        res.json({
            success: true,
            data: {
                totalPurchases,
                totalAmount: totalAmountNum,
                totalPaid: totalPaidNum,
                totalDue,
                recentPurchases,
            },
        });
    }
    catch (error) {
        console.error('Error fetching purchase statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase statistics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getPurchaseStatistics = getPurchaseStatistics;
