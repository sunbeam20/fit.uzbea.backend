import express from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
  getCustomersWithPagination,
} from '../controllers/customersController';

const router = express.Router();

router.get('/', getAllCustomers);
router.get('/pagination', getCustomersWithPagination);
router.get('/stats', getCustomerStats);
router.get('/search', searchCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;