import express from "express";
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductsPOS,
    getProductByBarcode,
} from "../controllers/productController";

const router = express.Router();

router.get("/", getProducts);
router.get("/search", searchProducts);        
router.get("/pos", getProductsPOS);
router.get("/barcode/:barcode", getProductByBarcode);
router.get("/:id", getProductById);          
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;