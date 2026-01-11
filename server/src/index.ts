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
import posRoutes from "./routes/posRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import userRoutes from "./routes/userRoutes";
import permissionRoutes from "./routes/permissionRoutes";

// CONFIGURATIONS
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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
app.use("/api/pos", posRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/users", userRoutes);
app.use("/api/permission", permissionRoutes);

// SERVER
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
