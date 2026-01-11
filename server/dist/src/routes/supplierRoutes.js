"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supplierController_1 = require("../controllers/supplierController");
const router = express_1.default.Router();
router.get("/", supplierController_1.getSuppliers);
router.get("/:id", supplierController_1.getSupplierById);
router.post("/", supplierController_1.createSupplier);
router.put("/:id", supplierController_1.updateSupplier);
router.delete("/:id", supplierController_1.deleteSupplier);
exports.default = router;
