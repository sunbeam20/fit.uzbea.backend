"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salesReturnController_1 = require("../controllers/salesReturnController");
const router = express_1.default.Router();
router.get("/", salesReturnController_1.getSalesReturns);
router.get("/:id", salesReturnController_1.getSalesReturnById);
router.post("/", salesReturnController_1.createSalesReturn);
router.put("/:id", salesReturnController_1.updateSalesReturn);
router.delete("/:id", salesReturnController_1.deleteSalesReturn);
exports.default = router;
