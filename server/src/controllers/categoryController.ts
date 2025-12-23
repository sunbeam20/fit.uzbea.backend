import { Request, Response } from "express";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// GET all categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await prisma.categories.findMany({
            orderBy: {
                id: "asc",
            },
        });
        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({message: "Error retrieving categories"});
    }
};

// GET single category by ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const category = await prisma.categories.findUnique({
            where: { id: parseInt(id) },
        });
        
        if (!category) {
            res.status(404).json({message: "Category not found"});
            return;
        }
        
        res.json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({message: "Error retrieving category"});
    }
};

// POST create new category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === "") {
            res.status(400).json({message: "Category name is required"});
            return;
        }
        
        const newCategory = await prisma.categories.create({
            data: { name },
        });
        
        res.status(201).json(newCategory);
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({message: "Error creating category"});
    }
};

// PUT update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim() === "") {
            res.status(400).json({message: "Category name is required"});
            return;
        }
        
        const updatedCategory = await prisma.categories.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        
        res.json(updatedCategory);
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({message: "Error updating category"});
    }
};

// DELETE category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        // Check if category exists
        const category = await prisma.categories.findUnique({
            where: { id: parseInt(id) },
        });
        
        if (!category) {
            res.status(404).json({message: "Category not found"});
            return;
        }
        
        // Check if category has products
        const products = await prisma.products.findFirst({
            where: { category_id: parseInt(id) },
        });
        
        if (products) {
            res.status(400).json({message: "Cannot delete category with existing products"});
            return;
        }
        
        await prisma.categories.delete({
            where: { id: parseInt(id) },
        });
        
        res.json({message: "Category deleted successfully"});
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({message: "Error deleting category"});
    }
};