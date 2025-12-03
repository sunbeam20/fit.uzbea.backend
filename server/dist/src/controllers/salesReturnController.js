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
exports.deleteSalesReturn = exports.updateSalesReturn = exports.createSalesReturn = exports.getSalesReturnById = exports.getSalesReturns = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// GET all sales returns
const getSalesReturns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const salesReturns = yield prisma.salesReturn.findMany({
            include: {
                SalesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            },
            orderBy: {
                id: 'desc'
            }
        });
        // Transform the data to match frontend interface
        const transformedReturns = salesReturns.map(returnItem => {
            var _a, _b, _c;
            return ({
                id: returnItem.id,
                return_number: `SRN-${returnItem.id.toString().padStart(3, '0')}`, // Generate return number
                original_invoice: `INV-${returnItem.sales_id.toString().padStart(3, '0')}`, // Generate invoice number from sales_id
                customer_name: ((_a = returnItem.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                customer_phone: ((_b = returnItem.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
                customer_address: ((_c = returnItem.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
                date: new Date().toISOString().split('T')[0], // Use current date or add date field to schema
                total_amount: parseFloat(returnItem.total_payback.toString()),
                reason: returnItem.note,
                status: 'completed', // Default status since not in schema
                refund_method: 'Cash', // Default refund method since not in schema
                items: returnItem.SalesReturnItems.map(item => {
                    var _a;
                    return ({
                        id: item.id,
                        product_id: item.product_id,
                        product_name: ((_a = item.Products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                        quantity: item.quantity,
                        price: parseFloat(item.unitPrice.toString()),
                        return_reason: 'Defective' // Default reason since not in schema
                    });
                }),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });
        res.json(transformedReturns);
    }
    catch (error) {
        console.error("Error fetching sales returns:", error);
        res.status(500).json({ message: "Error retrieving sales returns" });
    }
});
exports.getSalesReturns = getSalesReturns;
// GET single sales return by ID
const getSalesReturnById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const salesReturn = yield prisma.salesReturn.findUnique({
            where: { id: parseInt(id) },
            include: {
                SalesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        if (!salesReturn) {
            res.status(404).json({ message: "Sales return not found" });
            return;
        }
        // Transform the data
        const transformedReturn = {
            id: salesReturn.id,
            return_number: `SRN-${salesReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${salesReturn.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = salesReturn.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = salesReturn.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = salesReturn.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(salesReturn.total_payback.toString()),
            reason: salesReturn.note,
            status: 'completed',
            refund_method: 'Cash',
            items: salesReturn.SalesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.product_id,
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
        console.error("Error fetching sales return:", error);
        res.status(500).json({ message: "Error retrieving sales return" });
    }
});
exports.getSalesReturnById = getSalesReturnById;
// POST create new sales return
const createSalesReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { sales_id, user_id, customer_id, total_payback, note, items } = req.body;
        // Validate required fields
        if (!sales_id || !user_id || !customer_id || !total_payback || !items || !Array.isArray(items)) {
            res.status(400).json({
                message: "Missing required fields: sales_id, user_id, customer_id, total_payback, items"
            });
            return;
        }
        // Create sales return
        const newSalesReturn = yield prisma.salesReturn.create({
            data: {
                sales_id: parseInt(sales_id),
                user_id: parseInt(user_id),
                customer_id: parseInt(customer_id),
                total_payback: parseFloat(total_payback),
                note: note || 'No reason provided',
                SalesReturnItems: {
                    create: items.map((item) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unitPrice: item.price
                    }))
                }
            },
            include: {
                SalesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        // Transform the response
        const transformedReturn = {
            id: newSalesReturn.id,
            return_number: `SRN-${newSalesReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${newSalesReturn.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = newSalesReturn.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = newSalesReturn.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = newSalesReturn.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(newSalesReturn.total_payback.toString()),
            reason: newSalesReturn.note,
            status: 'completed',
            refund_method: 'Cash',
            items: newSalesReturn.SalesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.product_id,
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
        console.error("Error creating sales return:", error);
        res.status(500).json({ message: "Error creating sales return" });
    }
});
exports.createSalesReturn = createSalesReturn;
// PUT update sales return
const updateSalesReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const { note, total_payback } = req.body;
        const updatedSalesReturn = yield prisma.salesReturn.update({
            where: { id: parseInt(id) },
            data: {
                note,
                total_payback: total_payback ? parseFloat(total_payback) : undefined
            },
            include: {
                SalesReturnItems: {
                    include: {
                        Products: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        // Transform the response
        const transformedReturn = {
            id: updatedSalesReturn.id,
            return_number: `SRN-${updatedSalesReturn.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${updatedSalesReturn.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = updatedSalesReturn.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = updatedSalesReturn.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = updatedSalesReturn.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: new Date().toISOString().split('T')[0],
            total_amount: parseFloat(updatedSalesReturn.total_payback.toString()),
            reason: updatedSalesReturn.note,
            status: 'completed',
            refund_method: 'Cash',
            items: updatedSalesReturn.SalesReturnItems.map(item => {
                var _a;
                return ({
                    id: item.id,
                    product_id: item.product_id,
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
        console.error("Error updating sales return:", error);
        res.status(500).json({ message: "Error updating sales return" });
    }
});
exports.updateSalesReturn = updateSalesReturn;
// DELETE sales return
const deleteSalesReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First delete related items
        yield prisma.salesReturnItems.deleteMany({
            where: { salesReturn_id: parseInt(id) }
        });
        // Then delete the sales return
        yield prisma.salesReturn.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Sales return deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting sales return:", error);
        res.status(500).json({ message: "Error deleting sales return" });
    }
});
exports.deleteSalesReturn = deleteSalesReturn;
