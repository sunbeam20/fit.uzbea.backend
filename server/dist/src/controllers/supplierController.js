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
exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getSuppliers = void 0;
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
// GET all suppliers
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suppliers = yield prisma.suppliers.findMany({
            orderBy: {
                id: "asc",
            },
        });
        res.json(suppliers);
    }
    catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ message: "Error retrieving suppliers" });
    }
});
exports.getSuppliers = getSuppliers;
// GET single supplier by ID
const getSupplierById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplier = yield prisma.suppliers.findUnique({
            where: { id: parseInt(id) },
        });
        if (!supplier) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        res.json(supplier);
    }
    catch (error) {
        console.error("Error fetching supplier:", error);
        res.status(500).json({ message: "Error retrieving supplier" });
    }
});
exports.getSupplierById = getSupplierById;
// POST create new supplier
const createSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contactPerson, email, phone, address } = req.body;
        // Validate required fields
        if (!name || !phone) {
            res.status(400).json({ message: "Name and phone are required fields" });
            return;
        }
        const newSupplier = yield prisma.suppliers.create({
            data: {
                suppId: yield (0, idGenerator_1.generateId)('suppliers', 'SUP'),
                name,
                email: email || null,
                phone,
                address: address || null
            },
        });
        res.status(201).json(newSupplier);
    }
    catch (error) {
        console.error("Error creating supplier:", error);
        res.status(500).json({ message: "Error creating supplier" });
    }
});
exports.createSupplier = createSupplier;
// PUT update supplier
const updateSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, contactPerson, email, phone, address } = req.body;
        const updatedSupplier = yield prisma.suppliers.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email: email || null,
                phone,
                address: address || null
            },
        });
        res.json(updatedSupplier);
    }
    catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({ message: "Error updating supplier" });
    }
});
exports.updateSupplier = updateSupplier;
// DELETE supplier
const deleteSupplier = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if supplier exists
        const supplier = yield prisma.suppliers.findUnique({
            where: { id: parseInt(id) },
        });
        if (!supplier) {
            res.status(404).json({ message: "Supplier not found" });
            return;
        }
        // Check if supplier has purchases
        const purchases = yield prisma.purchases.findFirst({
            where: { supplier_id: parseInt(id) },
        });
        if (purchases) {
            res.status(400).json({ message: "Cannot delete supplier with existing purchases" });
            return;
        }
        yield prisma.suppliers.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Supplier deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting supplier:", error);
        res.status(500).json({ message: "Error deleting supplier" });
    }
});
exports.deleteSupplier = deleteSupplier;
