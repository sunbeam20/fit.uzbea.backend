"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exchangeController_1 = require("../controllers/exchangeController");
const router = express_1.default.Router();
router.get("/", exchangeController_1.getExchanges);
router.get("/:id", exchangeController_1.getExchangeById);
router.post("/", exchangeController_1.createExchange);
router.put("/:id", exchangeController_1.updateExchange);
router.delete("/:id", exchangeController_1.deleteExchange);
exports.default = router;
