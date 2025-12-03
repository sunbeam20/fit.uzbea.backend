import express from 'express';
import { 
  getExchanges, 
  getExchangeById, 
  createExchange, 
  updateExchange, 
  deleteExchange 
} from '../controllers/exchangeController';

const router = express.Router();

router.get("/", getExchanges);
router.get("/:id", getExchangeById);
router.post("/", createExchange);
router.put("/:id", updateExchange);
router.delete("/:id", deleteExchange);

export default router;