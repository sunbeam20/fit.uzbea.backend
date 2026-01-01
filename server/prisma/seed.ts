import {
  PrismaClient,
  Status,
  Warranty,
  SerialStatus,
  ProductType,
  ProductStatus,
} from "../generated/prisma";
import bcrypt from "bcryptjs";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Helper function to create Decimal values
const decimal = (value: number) => new Decimal(value.toString());

// Simple ID generator for seeding
function generateSequentialId(prefix: string, index: number): string {
  return `${prefix}-${(index + 1).toString().padStart(5, '0')}`;
}

async function main() {
  console.log("Starting seed...");

  console.log("Creating roles...");
  const roles = await prisma.roles.createMany({
    data: [
      { name: "Admin" },
      { name: "Manager" },
      { name: "Sales" },
      { name: "Technician" },
    ],
  });

  const adminRole = await prisma.roles.findFirst({
    where: { name: "Admin" },
  });

  const managerRole = await prisma.roles.findFirst({
    where: { name: "Manager" },
  });

  const salesRole = await prisma.roles.findFirst({
    where: { name: "Sales" },
  });

  const technicianRole = await prisma.roles.findFirst({
    where: { name: "Technician" },
  });

  if (!adminRole || !managerRole || !salesRole || !technicianRole) {
    throw new Error("Failed to create roles");
  }

  console.log("Creating users...");

  // Create users with sequential IDs
  const adminUser = await prisma.users.create({
    data: {
      userId: generateSequentialId("U", 0), // U-00001
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role_id: adminRole.id,
      status: Status.Active,
    },
  });

  const managerUser = await prisma.users.create({
    data: {
      userId: generateSequentialId("U", 1), // U-00002
      name: "Manager User",
      email: "manager@example.com",
      password: await bcrypt.hash("manager123", 10),
      role_id: managerRole.id,
      status: Status.Active,
    },
  });

  const sarahUser = await prisma.users.create({
    data: {
      userId: generateSequentialId("U", 2), // U-00003
      name: "Sarah Johnson",
      email: "sarah@example.com",
      password: await bcrypt.hash("sarah123", 10),
      role_id: salesRole.id,
      status: Status.Active,
    },
  });

  const tomUser = await prisma.users.create({
    data: {
      userId: generateSequentialId("U", 3), // U-00004
      name: "Tom Wilson",
      email: "tom@example.com",
      password: await bcrypt.hash("tom123", 10),
      role_id: technicianRole.id,
      status: Status.Active,
    },
  });

  console.log("Creating categories...");
  const categories = await prisma.categories.createMany({
    data: [
      { name: "Laptops" },
      { name: "Smartphones" },
      { name: "Accessories" },
      { name: "Storage" },
    ],
  });

  const laptopCategory = await prisma.categories.findFirst({
    where: { name: "Laptops" },
  });

  const phoneCategory = await prisma.categories.findFirst({
    where: { name: "Smartphones" },
  });

  const accessoryCategory = await prisma.categories.findFirst({
    where: { name: "Accessories" },
  });

  const storageCategory = await prisma.categories.findFirst({
    where: { name: "Storage" },
  });

  console.log("Creating suppliers...");
  // Create suppliers with sequential IDs
  const suppliersData = [
    {
      name: "TechDistro Inc.",
      email: "techdistro@example.com",
      phone: "555-0101",
      address: "123 Tech Blvd, San Francisco, CA",
    },
    {
      name: "Global Electronics Ltd.",
      email: "global@example.com",
      phone: "555-0102",
      address: "456 Industry Park, Austin, TX",
    },
  ];

  const createdSuppliers = [];
  for (let i = 0; i < suppliersData.length; i++) {
    const supplier = await prisma.suppliers.create({
      data: {
        suppId: generateSequentialId("SU", i), // SU-00001, SU-00002
        ...suppliersData[i]
      },
    });
    createdSuppliers.push(supplier);
  }

  const techDistro = createdSuppliers[0];
  const globalElectronics = createdSuppliers[1];

  console.log("Creating customers...");
  // Create customers with sequential IDs
  const customersData = [
    {
      name: "ABC Corporation",
      email: "abc@example.com",
      phone: "555-0201",
      address: "100 Business Ave, New York, NY",
    },
    {
      name: "XYZ Enterprises",
      email: "xyz@example.com",
      phone: "555-0202",
      address: "200 Commerce St, Chicago, IL",
    },
    {
      name: "Walk-in Customer",
      email: null,
      phone: "555-0000",
      address: null,
    },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customersData.length; i++) {
    const customer = await prisma.customers.create({
      data: {
        custId: generateSequentialId("C", i), // C-00001, C-00002, C-00003
        ...customersData[i]
      },
    });
    createdCustomers.push(customer);
  }

  const abcCorp = createdCustomers[0];
  const xyzEnt = createdCustomers[1];
  const walkIn = createdCustomers[2];

  console.log("Creating products...");
  // Create products with sequential IDs
  const productsData = [
    {
      name: "Dell XPS 13 Laptop",
      specification: '13.4" FHD+, Intel Core i7, 16GB RAM, 512GB SSD',
      description: "Premium business laptop",
      quantity: 10,
      purchasePrice: decimal(899.99),
      wholesalePrice: decimal(1099.99),
      retailPrice: decimal(1299.99),
      productType: ProductType.New,
      category_id: laptopCategory!.id,
      supplier_id: techDistro.id,
      useIndividualSerials: true,
      status: ProductStatus.Active,
    },
    {
      name: 'MacBook Pro 14"',
      specification: "Apple M3 Pro, 18GB RAM, 512GB SSD",
      description: "Professional Apple laptop",
      quantity: 8,
      purchasePrice: decimal(1499.99),
      wholesalePrice: decimal(1799.99),
      retailPrice: decimal(1999.99),
      productType: ProductType.New,
      category_id: laptopCategory!.id,
      supplier_id: techDistro.id,
      useIndividualSerials: true,
      status: ProductStatus.Active,
    },
    {
      name: "iPhone 15 Pro",
      specification: '6.1" Super Retina XDR, A17 Pro, 256GB',
      description: "Latest Apple smartphone",
      quantity: 15,
      purchasePrice: decimal(899.99),
      wholesalePrice: decimal(1099.99),
      retailPrice: decimal(1299.99),
      productType: ProductType.New,
      category_id: phoneCategory!.id,
      supplier_id: globalElectronics.id,
      useIndividualSerials: true,
      status: ProductStatus.Active,
    },
    {
      name: "Logitech MX Master 3S Mouse",
      specification: "Wireless, Ergonomic, Darkfield 4000DPI",
      description: "Premium wireless mouse",
      quantity: 25,
      purchasePrice: decimal(59.99),
      wholesalePrice: decimal(79.99),
      retailPrice: decimal(99.99),
      productType: ProductType.New,
      category_id: accessoryCategory!.id,
      supplier_id: techDistro.id,
      useIndividualSerials: false,
      status: ProductStatus.Active,
    },
    {
      name: "Samsung 2TB 990 PRO NVMe SSD",
      specification: "PCIe 4.0, 7450MB/s read, 6900MB/s write",
      description: "High-performance SSD",
      quantity: 12,
      purchasePrice: decimal(129.99),
      wholesalePrice: decimal(169.99),
      retailPrice: decimal(199.99),
      productType: ProductType.New,
      category_id: storageCategory!.id,
      supplier_id: globalElectronics.id,
      useIndividualSerials: false,
      status: ProductStatus.Active,
    },
  ];

  const createdProducts = [];
  for (let i = 0; i < productsData.length; i++) {
    const product = await prisma.products.create({
      data: {
        productCode: generateSequentialId("PR", i), // PR-00001, PR-00002, etc.
        ...productsData[i]
      },
    });
    createdProducts.push(product);
    console.log(`Created product: ${product.name}`);
  }

  console.log("Creating product serials...");
  // Create serials for products that need them
  for (const product of createdProducts) {
    if (product.useIndividualSerials) {
      const serialsData = [];
      for (let i = 1; i <= product.quantity; i++) {
        serialsData.push({
          serial: `${product.name.substring(0, 3).toUpperCase()}${product.id
            .toString()
            .padStart(3, "0")}${i.toString().padStart(3, "0")}`,
          product_id: product.id,
          status: SerialStatus.Available,
          warranty: Warranty.Yes,
        });
      }

      await prisma.productSerials.createMany({
        data: serialsData,
      });

      console.log(`Created ${product.quantity} serials for ${product.name}`);
    }
  }

  console.log("Creating purchases...");
  // Create a purchase with sequential ID
  const purchase = await prisma.purchases.create({
    data: {
      purchaseNo: generateSequentialId("P", 0), // P-00001
      totalAmount: decimal(45999.85),
      totalPaid: decimal(45999.85),
      dueDate: new Date("2024-01-15"),
      note: "Initial stock purchase",
      supplier_id: techDistro.id,
      user_id: adminUser.id,
    },
  });

  console.log("Creating purchase items...");
  // Add purchase items
  await prisma.purchasesItems.createMany({
    data: [
      {
        quantity: 10,
        unitPrice: decimal(899.99),
        purchase_id: purchase.id,
        product_id: createdProducts[0].id, // Dell XPS
      },
      {
        quantity: 8,
        unitPrice: decimal(1499.99),
        purchase_id: purchase.id,
        product_id: createdProducts[1].id, // MacBook
      },
      {
        quantity: 25,
        unitPrice: decimal(59.99),
        purchase_id: purchase.id,
        product_id: createdProducts[3].id, // Mouse
      },
    ],
  });

  console.log("Creating sales...");
  // Create sales with sequential IDs
  const salesData = [
    {
      totalAmount: decimal(11499.94),
      totalPaid: decimal(11499.94),
      dueDate: new Date("2024-01-20"),
      customer_id: abcCorp.id,
      user_id: sarahUser.id,
      status: "Completed",
    },
    {
      totalAmount: decimal(1299.99),
      totalPaid: decimal(1299.99),
      dueDate: new Date("2024-01-21"),
      customer_id: xyzEnt.id,
      user_id: sarahUser.id,
      status: "Completed",
    },
  ];

  const createdSales = [];
  for (let i = 0; i < salesData.length; i++) {
    const sale = await prisma.sales.create({
      data: {
        saleNo: generateSequentialId("S", i), // S-00001, S-00002
        ...salesData[i]
      },
    });
    createdSales.push(sale);
  }

  console.log("Creating sale items...");
  // Add sale items to first sale
  await prisma.salesItems.createMany({
    data: [
      {
        quantity: 2,
        unitPrice: decimal(1299.99),
        sales_id: createdSales[0].id,
        product_id: createdProducts[0].id, // Dell XPS
      },
      {
        quantity: 1,
        unitPrice: decimal(1999.99),
        sales_id: createdSales[0].id,
        product_id: createdProducts[1].id, // MacBook
      },
      {
        quantity: 2,
        unitPrice: decimal(99.99),
        sales_id: createdSales[0].id,
        product_id: createdProducts[3].id, // Mouse
      },
    ],
  });

  // Add sale item to second sale
  await prisma.salesItems.create({
    data: {
      quantity: 1,
      unitPrice: decimal(1299.99),
      sales_id: createdSales[1].id,
      product_id: createdProducts[2].id, // iPhone
    },
  });

  console.log("Creating services...");
  // Create services with sequential IDs
  const servicesData = [
    {
      serviceProductName: "Dell XPS 13 Laptop",
      serviceDescription: "Screen replacement and cleaning",
      serviceCost: decimal(149.99),
      serviceStatus: "Completed",
      customer_id: abcCorp.id,
      user_id: tomUser.id,
    },
    {
      serviceProductName: "iPhone 15 Pro",
      serviceDescription: "Battery replacement",
      serviceCost: decimal(89.99),
      serviceStatus: "In Progress",
      customer_id: xyzEnt.id,
      user_id: tomUser.id,
    },
  ];

  for (let i = 0; i < servicesData.length; i++) {
    await prisma.services.create({
      data: {
        serviceNo: generateSequentialId("SV", i), // SV-00001, SV-00002
        ...servicesData[i]
      },
    });
  }

  console.log("Creating expenses...");
  // Create expenses with sequential IDs
  const expensesData = [
    {
      title: "Office Rent - January",
      amount: decimal(1500.0),
      description: "Monthly office rent payment",
      user_id: adminUser.id,
    },
    {
      title: "Internet Bill",
      amount: decimal(89.99),
      description: "Monthly internet service",
      user_id: managerUser.id,
    },
  ];

  for (let i = 0; i < expensesData.length; i++) {
    await prisma.expenses.create({
      data: {
        expenseNo: generateSequentialId("E", i), // E-00001, E-00002
        ...expensesData[i]
      },
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });