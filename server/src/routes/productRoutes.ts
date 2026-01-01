import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsPOS,
  // scanBarcode,
  // getProductByBarcode,
  getProductSales,
  getProductPurchases,
  getProductSalesReturns,
  getProductExchanges,
  getProductSerials,
  updateSerialStatus,
} from "../controllers/productController";

const router = express.Router();

router.get("/", getProducts);
router.get("/search", searchProducts);
router.get("/pos", getProductsPOS);
// router.get('/barcode/:barcode', scanBarcode);
// router.get("/barcode/:barcode", getProductByBarcode);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.get("/:productId/serials", getProductSerials);
router.patch("/serials/:serialId/status", updateSerialStatus);

router.get("/:id/sales", getProductSales);
router.get("/:id/purchases", getProductPurchases);
router.get("/:id/sales-returns", getProductSalesReturns);
router.get("/:id/exchanges", getProductExchanges);

export default router;
