import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dashboardRoutes from "./routes/dashboardRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import salesReturnRoutes from "./routes/salesReturnRoutes";
import purchaseReturnRoutes from "./routes/purchaseReturnRoutes";
import exchangeRoutes from "./routes/exchangeRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import salesRoutes from "./routes/salesRoutes";
import customerRoutes from "./routes/customerRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import authRoutes from "./routes/authRoutes";

// CONFIGURATIONS
dotenv.config();
const app = express();
// Middleware
app.use(cors({
  origin: ['https://fit-uzbea-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

// ROUTES
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/product", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/salesreturn", salesReturnRoutes);
app.use("/api/purchasereturn", purchaseReturnRoutes);
app.use("/api/exchange", exchangeRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/sale", salesRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/auth", authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Fit Uzbea Backend API' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Fit Uzbea Backend'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Export for Vercel
export default app;

// SERVER
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
