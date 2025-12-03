"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const purchaseReturnController_1 = require("../controllers/purchaseReturnController");
const router = express_1.default.Router();
router.get("/", purchaseReturnController_1.getPurchaseReturns);
router.get("/:id", purchaseReturnController_1.getPurchaseReturnById);
router.post("/", purchaseReturnController_1.createPurchaseReturn);
router.put("/:id", purchaseReturnController_1.updatePurchaseReturn);
router.delete("/:id", purchaseReturnController_1.deletePurchaseReturn);
exports.default = router;
