import express from 'express';
import {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  getSalesStats,
  getSalesByDateRange,
  searchSales,
} from '../controllers/salesController';

const router = express.Router();

router.get('/', getAllSales);
router.get('/search', searchSales);
router.get('/stats', getSalesStats);
router.get('/date-range', getSalesByDateRange);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;