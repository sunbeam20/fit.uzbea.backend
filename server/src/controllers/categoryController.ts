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
        
        const newCategory = await prisma.categories.create({
            data: { name },
        });
        
        res.status(201).json(newCategory);
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({message: "Error creating category"});
    }
};