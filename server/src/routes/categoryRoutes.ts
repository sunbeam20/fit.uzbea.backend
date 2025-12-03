import express from "express";
import {
    getCategories,
    getCategoryById,
    createCategory
} from "../controllers/categoryController";

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", createCategory);

export default router;