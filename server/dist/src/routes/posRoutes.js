"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const posController_1 = require("../controllers/posController");
const router = express_1.default.Router();
// All POS routes require authentication
router.post("/sale", posController_1.createSaleFromPOS);
router.get("/stats", posController_1.getPOSStats);
exports.default = router;
