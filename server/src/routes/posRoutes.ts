import express from "express";
import {
    createSaleFromPOS,
    getPOSStats,
} from "../controllers/posController";

const router = express.Router();

// All POS routes require authentication
router.post("/sale", createSaleFromPOS);
router.get("/stats", getPOSStats);

export default router;