"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductExchanges = exports.getProductSalesReturns = exports.getProductPurchases = exports.getProductSales = exports.getProductsPOS = exports.searchProducts = exports.deleteProduct = exports.updateProduct = exports.updateSerialStatus = exports.getProductSerials = exports.createSaleWithSerials = exports.reserveSerialsForSale = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
// GET all products
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.products.findMany({
            include: {
                Categories: true,
                productSerials: true,
                supplier: true,
            },
            orderBy: {
                id: "asc",
            },
        });
        res.json(products);
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Error retrieving products" });
    }
});
exports.getProducts = getProducts;
// GET single product by ID
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield prisma.products.findUnique({
            where: { id: parseInt(id) },
            include: {
                Categories: true,
                productSerials: true,
                supplier: true,
            },
        });
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        res.json(product);
    }
    catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ message: "Error retrieving product" });
    }
});
exports.getProductById = getProductById;
// POST create new product with serial number support - FIXED
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, specification, description, quantity, purchasePrice, wholesalePrice, retailPrice, warranty, // Product-level warranty if needed
        productType, category_id, supplier_id, useIndividualSerials, bulkSerial, individualSerials, // Array of objects with serial and warranty: [{serial: "ABC123", warranty: "Yes"}, ...]
        userId, } = req.body;
        // Validate serial numbers if individual serials are used
        if (useIndividualSerials) {
            if (!individualSerials || !Array.isArray(individualSerials)) {
                res
                    .status(400)
                    .json({ message: "Individual serials array is required" });
                return;
            }
            if (individualSerials.length !== quantity) {
                res.status(400).json({
                    message: `Number of serials (${individualSerials.length}) must match quantity (${quantity})`,
                });
                return;
            }
            // Extract serial numbers from objects
            const serialNumbers = individualSerials
                .map((s) => s.serial) // Extract serial string from each object
                .filter((s) => s && s.trim() !== ""); // Filter out empty/null serials
            // Check for duplicate serials only if we have serial numbers
            if (serialNumbers.length > 0) {
                const duplicateSerials = yield prisma.productSerials.findMany({
                    where: {
                        serial: {
                            in: serialNumbers, // Now passing array of strings, not objects
                        },
                    },
                });
                if (duplicateSerials.length > 0) {
                    const duplicates = duplicateSerials.map((s) => s.serial);
                    res.status(400).json({
                        message: "Duplicate serial numbers found",
                        duplicates,
                    });
                    return;
                }
            }
        }
        // Create the product
        const product = yield prisma.products.create({
            data: {
                productCode: yield (0, idGenerator_1.generateId)('products', 'PRD'),
                name,
                specification,
                description,
                quantity,
                purchasePrice: parseFloat(purchasePrice),
                wholesalePrice: parseFloat(wholesalePrice),
                retailPrice: parseFloat(retailPrice),
                productType: productType || "New",
                category_id,
                supplier_id,
                useIndividualSerials,
                created_by: userId || null,
                status: "Active",
            },
        });
        // Create individual serial numbers if enabled
        if (useIndividualSerials && individualSerials) {
            const serialsData = individualSerials.map((item) => ({
                serial: item.serial || null, // Extract serial from object
                product_id: product.id,
                status: "Available",
                warranty: item.warranty || warranty || "No", // Use item warranty or fallback
            }));
            yield prisma.productSerials.createMany({
                data: serialsData,
            });
        }
        // Fetch the complete product with serials
        const completeProduct = yield prisma.products.findUnique({
            where: { id: product.id },
            include: {
                Categories: true,
                productSerials: true,
            },
        });
        res.status(201).json(completeProduct);
    }
    catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Error creating product" });
    }
});
exports.createProduct = createProduct;
// Helper function to validate and reserve serials for sale
const reserveSerialsForSale = (productId, quantity) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find available serials
        const availableSerials = yield prisma.productSerials.findMany({
            where: {
                product_id: productId,
                status: "Available",
            },
            take: quantity,
            select: {
                id: true,
                serial: true,
            }
        });
        if (availableSerials.length < quantity) {
            return {
                success: false,
                error: `Insufficient available serials. Available: ${availableSerials.length}, Requested: ${quantity}`,
            };
        }
        return {
            success: true,
            serials: availableSerials,
        };
    }
    catch (error) {
        console.error("Error reserving serials:", error);
        return {
            success: false,
            error: "Error reserving serial numbers",
        };
    }
});
exports.reserveSerialsForSale = reserveSerialsForSale;
// Updated sales creation to handle serial numbers
const createSaleWithSerials = (items, saleId, salesItemId // Add this parameter
) => __awaiter(void 0, void 0, void 0, function* () {
    for (const item of items) {
        const product = yield prisma.products.findUnique({
            where: { id: item.product_id },
        });
        if (!product)
            continue;
        if (product.useIndividualSerials) {
            // Reserve serials for this sale item
            const result = yield (0, exports.reserveSerialsForSale)(item.product_id, item.quantity);
            if (result.success && result.serials) {
                // Create SalesItemSerials records (junction table)
                const salesItemSerialsData = result.serials.map(serial => ({
                    salesItem_id: salesItemId,
                    serial_id: serial.id,
                }));
                yield prisma.salesItemSerials.createMany({
                    data: salesItemSerialsData,
                });
                // Update ProductSerials status to "Sold"
                const serialIds = result.serials.map(s => s.id);
                yield prisma.productSerials.updateMany({
                    where: {
                        id: {
                            in: serialIds,
                        },
                    },
                    data: {
                        status: "Sold",
                    },
                });
            }
            else {
                throw new Error(`Failed to reserve serials for product ${product.name}: ${result.error}`);
            }
        }
    }
});
exports.createSaleWithSerials = createSaleWithSerials;
// GET product serials
const getProductSerials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { status } = req.query;
        const whereClause = {
            product_id: parseInt(productId),
        };
        if (status && typeof status === "string") {
            whereClause.status = status;
        }
        const serials = yield prisma.productSerials.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                // Include the junction table to get sales info
                SalesItemSerials: {
                    include: {
                        SalesItems: {
                            include: {
                                Sales: {
                                    include: {
                                        Customers: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        // Transform the data for easier frontend consumption
        const transformedSerials = serials.map(serial => {
            var _a, _b, _c;
            const saleInfo = (_b = (_a = serial.SalesItemSerials[0]) === null || _a === void 0 ? void 0 : _a.SalesItems) === null || _b === void 0 ? void 0 : _b.Sales;
            return Object.assign(Object.assign({}, serial), { saleInfo: saleInfo ? {
                    saleNo: saleInfo.saleNo,
                    customerName: (_c = saleInfo.Customers) === null || _c === void 0 ? void 0 : _c.name,
                    saleDate: saleInfo.createdAt,
                } : null });
        });
        res.json(transformedSerials);
    }
    catch (error) {
        console.error("Error fetching product serials:", error);
        res.status(500).json({ message: "Error retrieving product serials" });
    }
});
exports.getProductSerials = getProductSerials;
// PATCH update serial status
const updateSerialStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { serialId } = req.params;
        const { status, note } = req.body;
        const updatedSerial = yield prisma.productSerials.update({
            where: { id: parseInt(serialId) },
            data: {
                status,
            },
        });
        res.json(updatedSerial);
    }
    catch (error) {
        console.error("Error updating serial status:", error);
        res.status(500).json({ message: "Error updating serial status" });
    }
});
exports.updateSerialStatus = updateSerialStatus;
// PUT update product - FIXED
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, specification, description, quantity, purchasePrice, wholesalePrice, retailPrice, warranty, productType, category_id, useIndividualSerials, individualSerials, // Array of objects with serial and warranty: [{serial: "ABC123", warranty: "Yes"}, ...]
        supplier_id, userId, } = req.body;
        console.log("=== UPDATE PRODUCT REQUEST ===");
        console.log("Product ID:", id);
        console.log("useIndividualSerials:", useIndividualSerials);
        console.log("individualSerials:", individualSerials);
        console.log("Quantity:", quantity);
        console.log("Product Type:", productType);
        // Check if product exists
        const existingProduct = yield prisma.products.findUnique({
            where: { id: parseInt(id) },
            include: { productSerials: true },
        });
        if (!existingProduct) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Use transaction for atomic updates
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update the product basic info
            const updatedProduct = yield tx.products.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    specification,
                    description,
                    quantity,
                    purchasePrice: parseFloat(purchasePrice),
                    wholesalePrice: parseFloat(wholesalePrice),
                    retailPrice: parseFloat(retailPrice),
                    productType: productType || "New",
                    category_id,
                    useIndividualSerials,
                    supplier_id,
                    updated_by: userId || null,
                },
            });
            // Handle serial numbers
            if (useIndividualSerials) {
                // Delete existing serials
                yield tx.productSerials.deleteMany({
                    where: { product_id: parseInt(id) },
                });
                // Create new serials if provided
                if (individualSerials && Array.isArray(individualSerials)) {
                    const serialsData = [];
                    // Process each serial item
                    for (let i = 0; i < individualSerials.length; i++) {
                        const item = individualSerials[i];
                        if (typeof item === "object" && item !== null) {
                            // If it's an object with serial and warranty
                            serialsData.push({
                                serial: item.serial || null,
                                product_id: parseInt(id),
                                status: "Available",
                                warranty: item.warranty || warranty || "No",
                            });
                        }
                        else if (typeof item === "string") {
                            // If it's just a string (for backward compatibility)
                            serialsData.push({
                                serial: item || null,
                                product_id: parseInt(id),
                                status: "Available",
                                warranty: warranty || "No",
                            });
                        }
                    }
                    // Validate quantity matches
                    if (serialsData.length !== quantity) {
                        throw new Error(`Number of serials (${serialsData.length}) must match quantity (${quantity})`);
                    }
                    // Check for duplicate serials in the new data
                    const serialNumbers = serialsData
                        .map((s) => s.serial)
                        .filter((s) => s);
                    const uniqueSerials = [...new Set(serialNumbers)];
                    if (uniqueSerials.length !== serialNumbers.length) {
                        throw new Error("Duplicate serial numbers found in the new data");
                    }
                    // Check for existing serials in database (excluding current product)
                    if (serialNumbers.length > 0) {
                        const existingSerials = yield tx.productSerials.findMany({
                            where: {
                                serial: {
                                    in: serialNumbers, // Fixed: now array of strings
                                },
                                product_id: {
                                    not: parseInt(id),
                                },
                            },
                        });
                        if (existingSerials.length > 0) {
                            throw new Error(`Serial numbers already exist in other products: ${existingSerials
                                .map((s) => s.serial)
                                .join(", ")}`);
                        }
                    }
                    yield tx.productSerials.createMany({
                        data: serialsData,
                    });
                }
            }
            else {
                // Delete existing serials if switching from individual to non-serialized
                if (existingProduct.useIndividualSerials) {
                    yield tx.productSerials.deleteMany({
                        where: { product_id: parseInt(id) },
                    });
                }
            }
            // Fetch the updated product with relations
            const fullProduct = yield tx.products.findUnique({
                where: { id: parseInt(id) },
                include: {
                    Categories: true,
                    productSerials: true,
                },
            });
            return fullProduct;
        }));
        res.json(result);
    }
    catch (error) {
        console.error("Error updating product:", error);
        console.error("Error message:", error.message);
        if (error.code) {
            console.error("Prisma error code:", error.code);
            console.error("Prisma error meta:", error.meta);
        }
        res.status(500).json({
            message: "Error updating product",
            error: error.message,
        });
    }
});
exports.updateProduct = updateProduct;
// DELETE product (soft delete)
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming you have user in request
        // Soft delete - mark as Unavailable
        yield prisma.products.update({
            where: { id: parseInt(id) },
            data: {
                status: "Unavailable",
                updated_by: userId || null,
            },
        });
        res.json({ message: "Product marked as unavailable successfully" });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Error deleting product" });
    }
});
exports.deleteProduct = deleteProduct;
// SEARCH products for POS
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        console.log("Search query received:", query);
        if (!query || typeof query !== "string") {
            res.json([]);
            return;
        }
        const products = yield prisma.products.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        specification: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            include: {
                Categories: true,
                productSerials: true,
            },
            orderBy: {
                name: "asc",
            },
            take: 20,
        });
        console.log(`Found ${products.length} products`);
        res.json(products);
    }
    catch (error) {
        console.error("Error searching products:", error);
        res.status(500).json({
            message: "Error searching products",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
});
exports.searchProducts = searchProducts;
// GET products for POS (frequently sold/recent)
const getProductsPOS = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.products.findMany({
            where: {
                quantity: {
                    gt: 0,
                },
            },
            include: {
                Categories: true,
                productSerials: true,
            },
            orderBy: {
                id: "desc",
            },
            take: 30,
        });
        res.json(products);
    }
    catch (error) {
        console.error("Error fetching POS products:", error);
        res.status(500).json({ message: "Error retrieving POS products" });
    }
});
exports.getProductsPOS = getProductsPOS;
// Scan barcode
// export const scanBarcode = async (req: Request, res: Response) => {
//   try {
//     const { barcode } = req.params;
//     const product = await prisma.products.findFirst({
//       where: {
//         barcode: barcode
//       },
//       include: {
//         Categories: true
//       }
//     });
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found'
//       });
//     }
//     res.status(200).json({
//       success: true,
//       data: product
//     });
//   } catch (error) {
//     console.error('Scan barcode error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to scan barcode',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// };
// GET product sales history
const getProductSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const sales = yield prisma.salesItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                Sales: {
                    include: {
                        Customers: true,
                    },
                },
                Products: true,
            },
            orderBy: {
                Sales: {
                    id: "desc",
                },
            },
        });
        // Transform the data for frontend
        const formattedSales = sales.map((item) => {
            var _a, _b, _c, _d;
            return ({
                id: item.id,
                date: ((_a = item.Sales) === null || _a === void 0 ? void 0 : _a.dueDate) || new Date(),
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.quantity * parseFloat(item.unitPrice.toString()),
                customer: (_c = (_b = item.Sales) === null || _b === void 0 ? void 0 : _b.Customers) === null || _c === void 0 ? void 0 : _c.name,
                invoiceNumber: `SALE-${(_d = item.Sales) === null || _d === void 0 ? void 0 : _d.id}`,
                status: "completed",
            });
        });
        res.json(formattedSales);
    }
    catch (error) {
        console.error("Error fetching product sales:", error);
        res.status(500).json({ message: "Error retrieving product sales" });
    }
});
exports.getProductSales = getProductSales;
// GET product purchase history
const getProductPurchases = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const purchases = yield prisma.purchasesItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                Purchases: {
                    include: {
                        Suppliers: true,
                    },
                },
                Products: true,
            },
            orderBy: {
                Purchases: {
                    id: "desc",
                },
            },
        });
        // Transform the data for frontend
        const formattedPurchases = purchases.map((item) => {
            var _a, _b, _c, _d;
            return ({
                id: item.id,
                date: ((_a = item.Purchases) === null || _a === void 0 ? void 0 : _a.dueDate) || new Date(),
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.quantity * parseFloat(item.unitPrice.toString()),
                supplier: (_c = (_b = item.Purchases) === null || _b === void 0 ? void 0 : _b.Suppliers) === null || _c === void 0 ? void 0 : _c.name,
                invoiceNumber: `PUR-${(_d = item.Purchases) === null || _d === void 0 ? void 0 : _d.id}`,
                status: "completed",
            });
        });
        res.json(formattedPurchases);
    }
    catch (error) {
        console.error("Error fetching product purchases:", error);
        res.status(500).json({ message: "Error retrieving product purchases" });
    }
});
exports.getProductPurchases = getProductPurchases;
// GET product sales returns history
const getProductSalesReturns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const salesReturns = yield prisma.salesReturnItems.findMany({
            where: {
                product_id: parseInt(id),
            },
            include: {
                SalesReturn: {
                    include: {
                        Customers: true,
                    },
                },
                Products: true,
            },
            orderBy: {
                SalesReturn: {
                    id: "desc",
                },
            },
        });
        // Transform the data for frontend
        const formattedReturns = salesReturns.map((item) => {
            var _a, _b, _c;
            return ({
                id: item.id,
                date: new Date(),
                quantity: item.quantity,
                price: item.unitPrice,
                total: item.quantity * parseFloat(item.unitPrice.toString()),
                customer: (_b = (_a = item.SalesReturn) === null || _a === void 0 ? void 0 : _a.Customers) === null || _b === void 0 ? void 0 : _b.name,
                invoiceNumber: `RET-${(_c = item.SalesReturn) === null || _c === void 0 ? void 0 : _c.id}`,
                status: "completed",
            });
        });
        res.json(formattedReturns);
    }
    catch (error) {
        console.error("Error fetching product sales returns:", error);
        res.status(500).json({ message: "Error retrieving product sales returns" });
    }
});
exports.getProductSalesReturns = getProductSalesReturns;
// GET product exchanges history
const getProductExchanges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Query for exchanges where product is either old or new product
        const exchanges = yield prisma.exchangesItems.findMany({
            where: {
                OR: [{ oldProduct_id: parseInt(id) }, { newProduct_id: parseInt(id) }],
            },
            include: {
                Exchanges: {
                    include: {
                        Customers: true,
                    },
                },
                oldProduct: true,
                newProduct: true,
            },
            orderBy: {
                Exchanges: {
                    id: "desc",
                },
            },
        });
        // Transform the data for frontend
        const formattedExchanges = exchanges.map((item) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: item.id,
                date: new Date(),
                quantity: item.quantity,
                price: parseFloat(item.unitPrice.toString()),
                total: item.quantity * parseFloat(item.unitPrice.toString()),
                customer: (_b = (_a = item.Exchanges) === null || _a === void 0 ? void 0 : _a.Customers) === null || _b === void 0 ? void 0 : _b.name,
                invoiceNumber: `EXC-${(_c = item.Exchanges) === null || _c === void 0 ? void 0 : _c.id}`,
                status: "completed",
                // Additional info for display
                isOldProduct: item.oldProduct_id === parseInt(id),
                oldProductName: (_d = item.oldProduct) === null || _d === void 0 ? void 0 : _d.name,
                newProductName: (_e = item.newProduct) === null || _e === void 0 ? void 0 : _e.name,
            });
        });
        res.json(formattedExchanges);
    }
    catch (error) {
        console.error("Error fetching product exchanges:", error);
        res.status(500).json({ message: "Error retrieving product exchanges" });
    }
});
exports.getProductExchanges = getProductExchanges;
