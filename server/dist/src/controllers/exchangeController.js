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
exports.deleteExchange = exports.updateExchange = exports.createExchange = exports.getExchangeById = exports.getExchanges = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Helper function to convert Decimal to number
const toNumber = (value) => {
    return parseFloat(value.toString());
};
// GET all exchanges
const getExchanges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exchanges = yield prisma.exchanges.findMany({
            include: {
                ExchangeItems: {
                    include: {
                        oldProduct: true,
                        newProduct: true
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
        const transformedExchanges = exchanges.map(exchange => {
            var _a, _b, _c, _d;
            const totalPaid = toNumber(exchange.totalPaid);
            const totalPayback = toNumber(exchange.totalPayback);
            const netAmount = totalPaid - totalPayback;
            return {
                id: exchange.id,
                exchange_number: `EXC-${exchange.id.toString().padStart(3, '0')}`,
                original_invoice: `INV-${exchange.sales_id.toString().padStart(3, '0')}`,
                customer_name: ((_a = exchange.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                customer_phone: ((_b = exchange.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
                customer_address: ((_c = exchange.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
                date: ((_d = exchange.Sales) === null || _d === void 0 ? void 0 : _d.dueDate) ? exchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                total_paid: totalPaid,
                total_payback: totalPayback,
                net_amount: netAmount,
                reason: exchange.note,
                status: 'completed',
                items: exchange.ExchangeItems.map(item => {
                    var _a, _b;
                    return ({
                        id: item.id,
                        old_product_id: item.oldProduct_id,
                        old_product_name: ((_a = item.oldProduct) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                        new_product_id: item.newProduct_id,
                        new_product_name: ((_b = item.newProduct) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Product',
                        quantity: item.quantity,
                        unit_price: toNumber(item.unitPrice),
                        note: item.note
                    });
                }),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        });
        res.json(transformedExchanges);
    }
    catch (error) {
        console.error("Error fetching exchanges:", error);
        res.status(500).json({ message: "Error retrieving exchanges" });
    }
});
exports.getExchanges = getExchanges;
// GET single exchange by ID
const getExchangeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const exchange = yield prisma.exchanges.findUnique({
            where: { id: parseInt(id) },
            include: {
                ExchangeItems: {
                    include: {
                        oldProduct: true,
                        newProduct: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        if (!exchange) {
            res.status(404).json({ message: "Exchange not found" });
            return;
        }
        // Transform the data
        const totalPaid = toNumber(exchange.totalPaid);
        const totalPayback = toNumber(exchange.totalPayback);
        const netAmount = totalPaid - totalPayback;
        const transformedExchange = {
            id: exchange.id,
            exchange_number: `EXC-${exchange.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${exchange.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = exchange.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = exchange.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = exchange.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: ((_d = exchange.Sales) === null || _d === void 0 ? void 0 : _d.dueDate) ? exchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            total_paid: totalPaid,
            total_payback: totalPayback,
            net_amount: netAmount,
            reason: exchange.note,
            status: 'completed',
            items: exchange.ExchangeItems.map(item => {
                var _a, _b;
                return ({
                    id: item.id,
                    old_product_id: item.oldProduct_id,
                    old_product_name: ((_a = item.oldProduct) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    new_product_id: item.newProduct_id,
                    new_product_name: ((_b = item.newProduct) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Product',
                    quantity: item.quantity,
                    unit_price: toNumber(item.unitPrice),
                    note: item.note
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedExchange);
    }
    catch (error) {
        console.error("Error fetching exchange:", error);
        res.status(500).json({ message: "Error retrieving exchange" });
    }
});
exports.getExchangeById = getExchangeById;
// POST create new exchange
const createExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { sales_id, user_id, customer_id, totalPaid, totalPayback, note, items } = req.body;
        // Validate required fields
        if (!sales_id || !user_id || !customer_id || !totalPaid || !totalPayback || !items || !Array.isArray(items)) {
            res.status(400).json({
                message: "Missing required fields: sales_id, user_id, customer_id, totalPaid, totalPayback, items"
            });
            return;
        }
        // Create exchange
        const newExchange = yield prisma.exchanges.create({
            data: {
                sales_id: parseInt(sales_id),
                user_id: parseInt(user_id),
                customer_id: parseInt(customer_id),
                totalPaid: parseFloat(totalPaid),
                totalPayback: parseFloat(totalPayback),
                note: note || 'No reason provided',
                ExchangeItems: {
                    create: items.map((item) => ({
                        oldProduct_id: item.old_product_id,
                        newProduct_id: item.new_product_id,
                        quantity: item.quantity,
                        unitPrice: parseFloat(item.unit_price),
                        note: item.note || ''
                    }))
                }
            },
            include: {
                ExchangeItems: {
                    include: {
                        oldProduct: true,
                        newProduct: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        // Transform the response
        const totalPaidNum = toNumber(newExchange.totalPaid);
        const totalPaybackNum = toNumber(newExchange.totalPayback);
        const netAmount = totalPaidNum - totalPaybackNum;
        const transformedExchange = {
            id: newExchange.id,
            exchange_number: `EXC-${newExchange.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${newExchange.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = newExchange.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = newExchange.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = newExchange.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: ((_d = newExchange.Sales) === null || _d === void 0 ? void 0 : _d.dueDate) ? newExchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            total_paid: totalPaidNum,
            total_payback: totalPaybackNum,
            net_amount: netAmount,
            reason: newExchange.note,
            status: 'completed',
            items: newExchange.ExchangeItems.map(item => {
                var _a, _b;
                return ({
                    id: item.id,
                    old_product_id: item.oldProduct_id,
                    old_product_name: ((_a = item.oldProduct) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    new_product_id: item.newProduct_id,
                    new_product_name: ((_b = item.newProduct) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Product',
                    quantity: item.quantity,
                    unit_price: toNumber(item.unitPrice),
                    note: item.note
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.status(201).json(transformedExchange);
    }
    catch (error) {
        console.error("Error creating exchange:", error);
        res.status(500).json({ message: "Error creating exchange" });
    }
});
exports.createExchange = createExchange;
// PUT update exchange
const updateExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const { note, totalPaid, totalPayback } = req.body;
        const updatedExchange = yield prisma.exchanges.update({
            where: { id: parseInt(id) },
            data: {
                note,
                totalPaid: totalPaid ? parseFloat(totalPaid) : undefined,
                totalPayback: totalPayback ? parseFloat(totalPayback) : undefined
            },
            include: {
                ExchangeItems: {
                    include: {
                        oldProduct: true,
                        newProduct: true
                    }
                },
                Customers: true,
                Sales: true,
                Users: true
            }
        });
        // Transform the response
        const totalPaidNum = toNumber(updatedExchange.totalPaid);
        const totalPaybackNum = toNumber(updatedExchange.totalPayback);
        const netAmount = totalPaidNum - totalPaybackNum;
        const transformedExchange = {
            id: updatedExchange.id,
            exchange_number: `EXC-${updatedExchange.id.toString().padStart(3, '0')}`,
            original_invoice: `INV-${updatedExchange.sales_id.toString().padStart(3, '0')}`,
            customer_name: ((_a = updatedExchange.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
            customer_phone: ((_b = updatedExchange.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = updatedExchange.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            date: ((_d = updatedExchange.Sales) === null || _d === void 0 ? void 0 : _d.dueDate) ? updatedExchange.Sales.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            total_paid: totalPaidNum,
            total_payback: totalPaybackNum,
            net_amount: netAmount,
            reason: updatedExchange.note,
            status: 'completed',
            items: updatedExchange.ExchangeItems.map(item => {
                var _a, _b;
                return ({
                    id: item.id,
                    old_product_id: item.oldProduct_id,
                    old_product_name: ((_a = item.oldProduct) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    new_product_id: item.newProduct_id,
                    new_product_name: ((_b = item.newProduct) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Product',
                    quantity: item.quantity,
                    unit_price: toNumber(item.unitPrice),
                    note: item.note
                });
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedExchange);
    }
    catch (error) {
        console.error("Error updating exchange:", error);
        res.status(500).json({ message: "Error updating exchange" });
    }
});
exports.updateExchange = updateExchange;
// DELETE exchange
const deleteExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // First delete related items
        yield prisma.exchangesItems.deleteMany({
            where: { exchangeId: parseInt(id) }
        });
        // Then delete the exchange
        yield prisma.exchanges.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Exchange deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting exchange:", error);
        res.status(500).json({ message: "Error deleting exchange" });
    }
});
exports.deleteExchange = deleteExchange;
