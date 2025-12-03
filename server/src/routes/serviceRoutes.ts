import express from 'express';
import { 
  getServices, 
  getServiceById, 
  createService, 
  updateService, 
  deleteService 
} from "../controllers/serviceController";

const router = express.Router();

router.get("/", getServices);
router.get("/:id", getServiceById);
router.post("/", createService);
router.put("/:id", updateService);
router.delete("/:id", deleteService);

export default router;