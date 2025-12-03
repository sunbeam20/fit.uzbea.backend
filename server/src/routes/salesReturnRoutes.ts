import express from 'express';
import { 
  getSalesReturns, 
  getSalesReturnById, 
  createSalesReturn, 
  updateSalesReturn, 
  deleteSalesReturn 
} from '../controllers/salesReturnController';

const router = express.Router();

router.get("/", getSalesReturns);
router.get("/:id", getSalesReturnById);
router.post("/", createSalesReturn);
router.put("/:id", updateSalesReturn);
router.delete("/:id", deleteSalesReturn);

export default router;