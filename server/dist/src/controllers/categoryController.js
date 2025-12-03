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
exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
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
