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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// GET all categories
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma.categories.findMany({
            orderBy: {
                id: "asc",
            },
        });
        res.json(categories);
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Error retrieving categories" });
    }
});
exports.getCategories = getCategories;
// GET single category by ID
const getCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const category = yield prisma.categories.findUnique({
            where: { id: parseInt(id) },
        });
        if (!category) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        res.json(category);
    }
    catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ message: "Error retrieving category" });
    }
});
exports.getCategoryById = getCategoryById;
// POST create new category
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!name || name.trim() === "") {
            res.status(400).json({ message: "Category name is required" });
            return;
        }
        const newCategory = yield prisma.categories.create({
            data: { name },
        });
        res.status(201).json(newCategory);
    }
    catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Error creating category" });
    }
});
exports.createCategory = createCategory;
// PUT update category
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === "") {
            res.status(400).json({ message: "Category name is required" });
            return;
        }
        const updatedCategory = yield prisma.categories.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(updatedCategory);
    }
    catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Error updating category" });
    }
});
exports.updateCategory = updateCategory;
// DELETE category
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if category exists
        const category = yield prisma.categories.findUnique({
            where: { id: parseInt(id) },
        });
        if (!category) {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        // Check if category has products
        const products = yield prisma.products.findFirst({
            where: { category_id: parseInt(id) },
        });
        if (products) {
            res.status(400).json({ message: "Cannot delete category with existing products" });
            return;
        }
        yield prisma.categories.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Error deleting category" });
    }
});
exports.deleteCategory = deleteCategory;
