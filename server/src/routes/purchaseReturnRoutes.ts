import express from "express";
import {
  getPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
} from "../controllers/purchaseReturnController";

const router = express.Router();

router.get("/", getPurchaseReturns);
router.get("/:id", getPurchaseReturnById);
router.post("/", createPurchaseReturn);
router.put("/:id", updatePurchaseReturn);
router.delete("/:id", deletePurchaseReturn);

export default router;
