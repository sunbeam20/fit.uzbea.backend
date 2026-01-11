"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customersController_1 = require("../controllers/customersController");
const router = express_1.default.Router();
router.get("/", customersController_1.getAllCustomers);
router.get("/pagination", customersController_1.getCustomersWithPagination);
router.get("/stats", customersController_1.getCustomerStats);
router.get("/search", customersController_1.searchCustomers);
router.get("/:id", customersController_1.getCustomerById);
router.post("/", customersController_1.createCustomer);
router.put("/:id", customersController_1.updateCustomer);
router.delete("/:id", customersController_1.deleteCustomer);
exports.default = router;
