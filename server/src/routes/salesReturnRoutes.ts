import express from 'express';
import { 
  getSalesReturns, 
  getSalesReturnById, 
  createSalesReturn, 
  updateSalesReturn, 
  deleteSalesReturn, 
  debugSalesReturnSchema
} from '../controllers/salesReturnController';

const router = express.Router();

router.get("/", getSalesReturns);
router.get("/:id", getSalesReturnById);
router.get("/debug-schema", debugSalesReturnSchema);
router.post("/", createSalesReturn);
router.put("/:id", updateSalesReturn);
router.delete("/:id", deleteSalesReturn);

export default router;