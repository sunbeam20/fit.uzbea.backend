"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salesController_1 = require("../controllers/salesController");
const router = express_1.default.Router();
router.get('/', salesController_1.getAllSales);
router.get('/search', salesController_1.searchSales);
router.get('/stats', salesController_1.getSalesStats);
router.get('/date-range', salesController_1.getSalesByDateRange);
router.get('/:id', salesController_1.getSaleById);
router.post('/', salesController_1.createSale);
router.put('/:id', salesController_1.updateSale);
router.delete('/:id', salesController_1.deleteSale);
exports.default = router;
