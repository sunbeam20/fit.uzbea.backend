import { Router } from 'express';
import {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchasesBySupplier,
  getPurchaseStatistics,
} from '../controllers/purchaseController';

const router = Router();

router.get('/', getAllPurchases);
router.get('/statistics', getPurchaseStatistics);
router.get('/supplier/:supplierId', getPurchasesBySupplier);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);
router.put('/:id', updatePurchase);
router.delete('/:id', deletePurchase);

export default router;