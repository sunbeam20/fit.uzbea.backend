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

// Helper function to generate sequential IDs
function generateSequentialId(prefix: string, index: number): string {
  return `${prefix}${(index + 1).toString().padStart(5, "0")}`;
}

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  console.log("🌱 Starting comprehensive database seeding...");

  // Clear existing data in correct order to avoid foreign key constraints
  console.log("🧹 Clearing existing data...");
  
  // Clear in reverse order of dependencies
  const tablesToClear = [
    // Start with tables that have no dependencies or are at the end of relationships
    "ExchangeItemSerials",
    "ExchangesItems",
    "Exchanges",
    "SalesReturnItemSerials",
    "SalesReturnItems",
    "SalesReturn",
    "SalesItemSerials",
    "SalesItems",
    "Sales",
    "PurchaseReturnItemSerials",
    "PurchasesReturnItems",
    "PurchasesReturn",
    "PurchaseItemSerials",
    "PurchasesItems",
    "Purchases",
    "ProductSerials",
    "Services",
    "Expenses",
    // Then clear Products which has dependencies on Categories and Suppliers
    "Products",
    // Clear Customers, Suppliers, Categories
    "Customers",
    "Suppliers",
    "Categories",
    // Clear user-related tables
    "Session",
    "Users",
    "RolePermissions",
    // Finally clear base tables
    "Permissions",
    "Roles",
  ];

  for (const table of tablesToClear) {
    try {
      // Convert table name to Prisma model name (camelCase)
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      // @ts-ignore - Dynamic model access
      await prisma[modelName].deleteMany({});
      console.log(`  ✅ Cleared ${table}`);
    } catch (error: any) {
      // If table doesn't exist or has constraints, skip and continue
      console.log(`  ⏭️  Skipped ${table}: ${error.message}`);
    }
  }

  console.log("👥 Creating permissions...");
  const permissionsData = [
    { name: "dashboard_view", description: "View dashboard" },
    { name: "user_manage", description: "Manage users" },
    { name: "role_manage", description: "Manage roles and permissions" },
    { name: "customer_manage", description: "Manage customers" },
    { name: "supplier_manage", description: "Manage suppliers" },
    { name: "product_manage", description: "Manage products" },
    { name: "inventory_view", description: "View inventory" },
    { name: "inventory_manage", description: "Manage inventory" },
    { name: "sale_create", description: "Create sales" },
    { name: "sale_view", description: "View sales" },
    { name: "sale_edit", description: "Edit sales" },
    { name: "sale_delete", description: "Delete sales" },
    { name: "purchase_create", description: "Create purchases" },
    { name: "purchase_view", description: "View purchases" },
    { name: "purchase_edit", description: "Edit purchases" },
    { name: "purchase_delete", description: "Delete purchases" },
    { name: "return_manage", description: "Manage returns" },
    { name: "exchange_manage", description: "Manage exchanges" },
    { name: "service_manage", description: "Manage services" },
    { name: "expense_manage", description: "Manage expenses" },
    { name: "report_view", description: "View reports" },
    { name: "settings_manage", description: "Manage system settings" },
  ];

  for (const permission of permissionsData) {
    try {
      await prisma.permissions.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    } catch (error) {
      console.log(`Error creating permission ${permission.name}:`, error);
    }
  }

  console.log("🎭 Creating roles...");
  const rolesData = [
    { name: "Super Admin" },
    { name: "Administrator" },
    { name: "Store Manager" },
    { name: "Sales Manager" },
    { name: "Sales Executive" },
    { name: "Purchase Manager" },
    { name: "Inventory Manager" },
    { name: "Service Technician" },
    { name: "Accountant" },
    { name: "Customer Support" },
  ];

  const createdRoles = [];
  for (let i = 0; i < rolesData.length; i++) {
    try {
      const role = await prisma.roles.upsert({
        where: { name: rolesData[i].name },
        update: rolesData[i],
        create: rolesData[i],
      });
      createdRoles.push(role);
    } catch (error) {
      console.log(`Error creating role ${rolesData[i].name}:`, error);
    }
  }

  console.log("🔗 Assigning permissions to roles...");
  // Assign all permissions to Super Admin
  const allPermissions = await prisma.permissions.findMany();
  const superAdminRole = createdRoles.find((r) => r.name === "Super Admin");
  
  if (superAdminRole) {
    for (const permission of allPermissions) {
      try {
        await prisma.rolePermissions.upsert({
          where: {
            role_id_permission_id: {
              role_id: superAdminRole.id,
              permission_id: permission.id,
            },
          },
          update: {
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
          },
          create: {
            role_id: superAdminRole.id,
            permission_id: permission.id,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
          },
        });
      } catch (error) {
        console.log(`Error assigning permission ${permission.name} to Super Admin:`, error);
      }
    }
  }

  console.log("👤 Creating users...");
  const usersData = [
    {
      name: "John Smith",
      email: "admin@example.com",
      password: "admin123",
      role: "Super Admin",
      phone: "+1 (555) 010-0001",
      address: "123 Tech Street, San Francisco, CA 94107",
    },
    {
      name: "Sarah Johnson",
      email: "manager@example.com",
      password: "manager123",
      role: "Store Manager",
      phone: "+1 (555) 010-0002",
      address: "456 Market St, San Francisco, CA 94105",
    },
    {
      name: "Mike Wilson",
      email: "sales@example.com",
      password: "sales123",
      role: "Sales Executive",
      phone: "+1 (555) 010-0003",
      address: "789 Broadway, San Francisco, CA 94133",
    },
    {
      name: "Tom Harris",
      email: "technician@example.com",
      password: "tech123",
      role: "Service Technician",
      phone: "+1 (555) 010-0004",
      address: "101 Union Square, San Francisco, CA 94108",
    },
    {
      name: "Lisa Wang",
      email: "purchase@example.com",
      password: "purchase123",
      role: "Purchase Manager",
      phone: "+1 (555) 010-0005",
      address: "202 Financial District, San Francisco, CA 94111",
    },
    {
      name: "David Brown",
      email: "inventory@example.com",
      password: "inventory123",
      role: "Inventory Manager",
      phone: "+1 (555) 010-0006",
      address: "303 Chinatown, San Francisco, CA 94108",
    },
    {
      name: "Sophia Miller",
      email: "accountant@example.com",
      password: "accountant123",
      role: "Accountant",
      phone: "+1 (555) 010-0007",
      address: "404 Marina Blvd, San Francisco, CA 94123",
    },
  ];

  const createdUsers = [];
  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    const role = createdRoles.find((r) => r.name === userData.role);

    if (!role) {
      console.log(`Role "${userData.role}" not found for user "${userData.name}"`);
      continue;
    }

    try {
      const user = await prisma.users.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          password: await bcrypt.hash(userData.password, 10),
          role_id: role.id,
          phone: userData.phone,
          address: userData.address,
          status: Status.Active,
        },
        create: {
          userId: generateSequentialId("U", i),
          name: userData.name,
          email: userData.email,
          password: await bcrypt.hash(userData.password, 10),
          role_id: role.id,
          status: Status.Active,
          phone: userData.phone,
          address: userData.address,
        },
      });
      createdUsers.push(user);
      console.log(`  Created user: ${user.name} (${user.email})`);
    } catch (error) {
      console.log(`Error creating user ${userData.email}:`, error);
    }
  }

  console.log("📂 Creating categories...");
  const categoriesData = [
    { name: "Laptops & Notebooks" },
    { name: "Desktop Computers" },
    { name: "Tablets & iPads" },
    { name: "Smartphones" },
    { name: "Computer Components" },
    { name: "Monitors & Displays" },
    { name: "Printers & Scanners" },
    { name: "Networking Equipment" },
    { name: "Storage Devices" },
    { name: "Computer Accessories" },
    { name: "Gaming Equipment" },
    { name: "Software & Licenses" },
    { name: "Office Equipment" },
    { name: "Audio & Video" },
    { name: "Wearable Technology" },
  ];

  const createdCategories = [];
  for (let i = 0; i < categoriesData.length; i++) {
    try {
      const category = await prisma.categories.upsert({
        where: { name: categoriesData[i].name },
        update: categoriesData[i],
        create: categoriesData[i],
      });
      createdCategories.push(category);
    } catch (error) {
      console.log(`Error creating category ${categoriesData[i].name}:`, error);
    }
  }

  console.log("🏭 Creating suppliers...");
  const suppliersData = [
    {
      name: "TechDistro Inc.",
      email: "orders@techdistro.com",
      phone: "+1 (800) 555-0100",
      address: "123 Tech Blvd, San Jose, CA 95134",
    },
    {
      name: "Global Electronics Ltd.",
      email: "sales@globalelectronics.com",
      phone: "+1 (800) 555-0101",
      address: "456 Industry Park, Austin, TX 78701",
    },
    {
      name: "Premium Components Corp.",
      email: "info@premiumcomponents.com",
      phone: "+1 (800) 555-0102",
      address: "789 Hardware Lane, Miami, FL 33101",
    },
  ];

  const createdSuppliers = [];
  for (let i = 0; i < suppliersData.length; i++) {
    try {
      const supplier = await prisma.suppliers.create({
        data: {
          suppId: generateSequentialId("SUP", i),
          ...suppliersData[i],
        },
      });
      createdSuppliers.push(supplier);
    } catch (error) {
      console.log(`Error creating supplier ${suppliersData[i].name}:`, error);
    }
  }

  console.log("👥 Creating customers...");
  const customersData = [
    {
      name: "ABC Corporation",
      email: "purchasing@abccorp.com",
      phone: "+1 (415) 555-1001",
      address: "100 Business Ave, New York, NY 10001",
    },
    {
      name: "XYZ Enterprises",
      email: "itdept@xyzenterprises.com",
      phone: "+1 (415) 555-1002",
      address: "200 Commerce St, Chicago, IL 60601",
    },
    {
      name: "Innovate Solutions LLC",
      email: "orders@innovatesolutions.com",
      phone: "+1 (415) 555-1003",
      address: "300 Innovation Drive, San Francisco, CA 94101",
    },
    {
      name: "Walk-in Customer",
      email: null,
      phone: "+1 (415) 555-0000",
      address: null,
    },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customersData.length; i++) {
    try {
      const customer = await prisma.customers.create({
        data: {
          custId: generateSequentialId("CUST", i),
          ...customersData[i],
        },
      });
      createdCustomers.push(customer);
    } catch (error) {
      console.log(`Error creating customer ${customersData[i].name}:`, error);
    }
  }

  console.log("📦 Creating products...");
  const productsData = [
    // Laptops
    {
      name: "Dell XPS 13 Laptop",
      specification: '13.4" FHD+ (1920x1200), Intel Core i7-1360P, 16GB LPDDR5, 512GB SSD',
      description: "Premium ultrabook with InfinityEdge display",
      quantity: 25,
      purchasePrice: decimal(899.99),
      wholesalePrice: decimal(1099.99),
      retailPrice: decimal(1299.99),
      useIndividualSerials: true,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Laptops & Notebooks",
      supplier: "TechDistro Inc.",
    },
    {
      name: 'Apple MacBook Pro 14"',
      specification: "Apple M3 Pro, 18GB Unified Memory, 512GB SSD, Liquid Retina XDR",
      description: "Professional-grade laptop for creatives",
      quantity: 18,
      purchasePrice: decimal(1499.99),
      wholesalePrice: decimal(1799.99),
      retailPrice: decimal(1999.99),
      useIndividualSerials: true,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Laptops & Notebooks",
      supplier: "TechDistro Inc.",
    },
    // Smartphones
    {
      name: "iPhone 15 Pro",
      specification: '6.1" Super Retina XDR, A17 Pro, 256GB, Titanium',
      description: "Latest iPhone with advanced camera system",
      quantity: 30,
      purchasePrice: decimal(899.99),
      wholesalePrice: decimal(1099.99),
      retailPrice: decimal(1299.99),
      useIndividualSerials: true,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Smartphones",
      supplier: "Global Electronics Ltd.",
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      specification: '6.8" Dynamic AMOLED, Snapdragon 8 Gen 3, 256GB, S Pen',
      description: "Premium Android smartphone with S Pen",
      quantity: 22,
      purchasePrice: decimal(849.99),
      wholesalePrice: decimal(1049.99),
      retailPrice: decimal(1249.99),
      useIndividualSerials: true,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Smartphones",
      supplier: "Global Electronics Ltd.",
    },
    // Accessories
    {
      name: "Logitech MX Master 3S Mouse",
      specification: "Wireless, Ergonomic, Darkfield 4000DPI, MagSpeed Scrolling",
      description: "Premium wireless mouse for productivity",
      quantity: 35,
      purchasePrice: decimal(59.99),
      wholesalePrice: decimal(79.99),
      retailPrice: decimal(99.99),
      useIndividualSerials: false,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Computer Accessories",
      supplier: "TechDistro Inc.",
    },
    {
      name: "Samsung 990 PRO 2TB NVMe SSD",
      specification: "PCIe 4.0, M.2 2280, Read: 7450MB/s, Write: 6900MB/s",
      description: "High-performance NVMe SSD for gaming and creative work",
      quantity: 40,
      purchasePrice: decimal(129.99),
      wholesalePrice: decimal(169.99),
      retailPrice: decimal(199.99),
      useIndividualSerials: false,
      productType: ProductType.New,
      status: ProductStatus.Active,
      category: "Storage Devices",
      supplier: "Premium Components Corp.",
    },
  ];

  const createdProducts = [];
  for (let i = 0; i < productsData.length; i++) {
    const productData = productsData[i];
    const category = createdCategories.find((c) => c.name === productData.category);
    const supplier = createdSuppliers.find((s) => s.name === productData.supplier);
    const creator = createdUsers[0]; // Use first user as creator

    if (!category) {
      console.log(`Category "${productData.category}" not found for product "${productData.name}"`);
      continue;
    }

    try {
      const product = await prisma.products.create({
        data: {
          productCode: generateSequentialId("PR", i),
          name: productData.name,
          specification: productData.specification,
          description: productData.description,
          quantity: productData.quantity,
          purchasePrice: productData.purchasePrice,
          wholesalePrice: productData.wholesalePrice,
          retailPrice: productData.retailPrice,
          useIndividualSerials: productData.useIndividualSerials,
          productType: productData.productType,
          status: productData.status,
          category_id: category.id,
          supplier_id: supplier?.id,
          created_by: creator.id,
          updated_by: creator.id,
        },
      });
      createdProducts.push(product);
      console.log(`  Created product: ${product.name}`);
    } catch (error) {
      console.log(`Error creating product ${productData.name}:`, error);
    }
  }

  console.log("🏷️ Creating product serials...");
  for (const product of createdProducts) {
    if (product.useIndividualSerials) {
      const serialsData = [];
      const numSerials = Math.min(product.quantity, 5); // Create up to 5 serials per product

      for (let i = 1; i <= numSerials; i++) {
        const prefix = product.name.substring(0, 3).toUpperCase().replace(/\s/g, "");
        serialsData.push({
          serial: `${prefix}${product.id.toString().padStart(3, "0")}${i
            .toString()
            .padStart(3, "0")}`,
          product_id: product.id,
          status: i <= 2 ? SerialStatus.Available : SerialStatus.Sold, // Mark some as sold
          warranty: Math.random() > 0.3 ? Warranty.Yes : Warranty.No,
        });
      }

      try {
        await prisma.productSerials.createMany({
          data: serialsData,
        });
        console.log(`  Created ${numSerials} serials for ${product.name}`);
      } catch (error) {
        console.log(`Error creating serials for ${product.name}:`, error);
      }
    }
  }

  console.log("💰 Creating purchases...");
  const createdPurchases = [];
  for (let i = 0; i < 3; i++) {
    const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
    const user = createdUsers.find((u) => u.email.includes("purchase")) || createdUsers[0];

    try {
      const purchase = await prisma.purchases.create({
        data: {
          purchaseNo: generateSequentialId("PUR", i),
          totalAmount: decimal(0), // Will update after items
          totalPaid: decimal(0),
          dueDate: new Date("2024-12-31"),
          note: `Purchase order ${i + 1} - ${supplier.name}`,
          supplier_id: supplier.id,
          user_id: user.id,
        },
      });
      createdPurchases.push(purchase);
    } catch (error) {
      console.log(`Error creating purchase ${i}:`, error);
    }
  }

  console.log("📝 Creating purchase items...");
  for (const purchase of createdPurchases) {
    const numItems = Math.floor(Math.random() * 2) + 1; // 1-2 items per purchase
    let purchaseTotal = 0;

    for (let i = 0; i < numItems; i++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      const unitPrice = product.purchasePrice;

      try {
        const purchaseItem = await prisma.purchasesItems.create({
          data: {
            quantity,
            unitPrice,
            purchase_id: purchase.id,
            product_id: product.id,
          },
        });

        purchaseTotal += unitPrice.toNumber() * quantity;

        // Update product quantity
        await prisma.products.update({
          where: { id: product.id },
          data: { quantity: { increment: quantity } },
        });

        // Create purchase item serials if applicable
        if (product.useIndividualSerials) {
          const serials = await prisma.productSerials.findMany({
            where: {
              product_id: product.id,
              status: SerialStatus.Available,
            },
            take: quantity,
          });

          for (const serial of serials) {
            try {
              await prisma.purchaseItemSerials.create({
                data: {
                  purchaseItem_id: purchaseItem.id,
                  serial_id: serial.id,
                },
              });

              // Update serial status to Available (if it was sold before)
              await prisma.productSerials.update({
                where: { id: serial.id },
                data: { status: SerialStatus.Available },
              });
            } catch (error) {
              console.log("Error creating purchase item serial:", error);
            }
          }
        }
      } catch (error) {
        console.log("Error creating purchase item:", error);
      }
    }

    // Update purchase total
    try {
      await prisma.purchases.update({
        where: { id: purchase.id },
        data: {
          totalAmount: decimal(purchaseTotal),
          totalPaid: decimal(purchaseTotal),
        },
      });
    } catch (error) {
      console.log("Error updating purchase total:", error);
    }
  }

  console.log("🛒 Creating sales...");
  const createdSales = [];
  for (let i = 0; i < 5; i++) {
    const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
    const user = createdUsers.find((u) => u.email.includes("sales")) || createdUsers[0];

    try {
      const sale = await prisma.sales.create({
        data: {
          saleNo: generateSequentialId("SAL", i),
          totalAmount: decimal(0), // Will update after items
          totalPaid: decimal(0),
          totaldiscount: decimal(Math.random() * 20),
          dueDate: new Date("2024-12-31"),
          status: Math.random() > 0.2 ? "Completed" : "Pending",
          customer_id: customer.id,
          user_id: user.id,
        },
      });
      createdSales.push(sale);
    } catch (error) {
      console.log(`Error creating sale ${i}:`, error);
    }
  }

  console.log("📝 Creating sale items...");
  for (const sale of createdSales) {
    const numItems = Math.floor(Math.random() * 2) + 1; // 1-2 items per sale
    let saleTotal = 0;

    for (let i = 0; i < numItems; i++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const quantity = 1;
      const unitPrice = product.retailPrice;
      const discount = Math.random() > 0.7 ? decimal(Math.random() * 10) : null;

      try {
        const saleItem = await prisma.salesItems.create({
          data: {
            quantity,
            unitPrice,
            discount,
            sales_id: sale.id,
            product_id: product.id,
          },
        });

        const itemTotal = unitPrice.toNumber() * quantity - (discount?.toNumber() || 0);
        saleTotal += itemTotal;

        // Update product quantity
        await prisma.products.update({
          where: { id: product.id },
          data: { quantity: { decrement: quantity } },
        });

        // Create sale item serials if applicable
        if (product.useIndividualSerials) {
          const serials = await prisma.productSerials.findMany({
            where: {
              product_id: product.id,
              status: SerialStatus.Available,
            },
            take: quantity,
          });

          for (const serial of serials) {
            try {
              await prisma.salesItemSerials.create({
                data: {
                  salesItem_id: saleItem.id,
                  serial_id: serial.id,
                },
              });

              // Update serial status to Sold
              await prisma.productSerials.update({
                where: { id: serial.id },
                data: { status: SerialStatus.Sold },
              });
            } catch (error) {
              console.log("Error creating sale item serial:", error);
            }
          }
        }
      } catch (error) {
        console.log("Error creating sale item:", error);
      }
    }

    // Update sale total
    try {
      await prisma.sales.update({
        where: { id: sale.id },
        data: {
          totalAmount: decimal(saleTotal),
          totalPaid: decimal(saleTotal * 0.8),
        },
      });
    } catch (error) {
      console.log("Error updating sale total:", error);
    }
  }

  console.log("🔧 Creating services...");
  const servicesData = [
    {
      serviceProductName: "MacBook Pro Screen Repair",
      serviceDescription: "Replace cracked screen with genuine Apple part",
      serviceCost: decimal(349.99),
      serviceStatus: "Completed",
      customer: "ABC Corporation",
      user: "Tom Harris",
    },
    {
      serviceProductName: "Laptop Battery Replacement",
      serviceDescription: "Replace old battery with new OEM battery",
      serviceCost: decimal(129.99),
      serviceStatus: "In Progress",
      customer: "XYZ Enterprises",
      user: "Tom Harris",
    },
  ];

  for (let i = 0; i < servicesData.length; i++) {
    const serviceData = servicesData[i];
    const customer = createdCustomers.find((c) => c.name === serviceData.customer);
    const user = createdUsers.find((u) => u.name === serviceData.user);

    if (!customer) {
      console.log(`Customer "${serviceData.customer}" not found, using walk-in customer`);
      continue;
    }

    try {
      await prisma.services.create({
        data: {
          serviceNo: generateSequentialId("SVC", i),
          serviceProductName: serviceData.serviceProductName,
          serviceDescription: serviceData.serviceDescription,
          serviceCost: serviceData.serviceCost,
          serviceStatus: serviceData.serviceStatus,
          customer_id: customer.id,
          user_id: user?.id,
        },
      });
    } catch (error) {
      console.log(`Error creating service ${serviceData.serviceProductName}:`, error);
    }
  }

  console.log("💸 Creating expenses...");
  const expensesData = [
    {
      title: "Office Rent - January 2024",
      amount: decimal(2500.0),
      description: "Monthly office rent payment",
      user: "admin@example.com",
    },
    {
      title: "Internet & Phone Bills",
      amount: decimal(189.99),
      description: "Monthly internet and phone service",
      user: "admin@example.com",
    },
  ];

  for (let i = 0; i < expensesData.length; i++) {
    const expenseData = expensesData[i];
    const user = createdUsers.find((u) => u.email === expenseData.user);

    if (!user) {
      console.log(`User "${expenseData.user}" not found for expense`);
      continue;
    }

    try {
      await prisma.expenses.create({
        data: {
          expenseNo: generateSequentialId("EXP", i),
          title: expenseData.title,
          amount: expenseData.amount,
          date: new Date(),
          description: expenseData.description,
          user_id: user.id,
        },
      });
    } catch (error) {
      console.log(`Error creating expense ${expenseData.title}:`, error);
    }
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`  ✅ Users: ${createdUsers.length}`);
  console.log(`  ✅ Categories: ${createdCategories.length}`);
  console.log(`  ✅ Suppliers: ${createdSuppliers.length}`);
  console.log(`  ✅ Customers: ${createdCustomers.length}`);
  console.log(`  ✅ Products: ${createdProducts.length}`);
  console.log(`  ✅ Purchases: ${createdPurchases.length}`);
  console.log(`  ✅ Sales: ${createdSales.length}`);
  
  console.log("\n🔑 Login Credentials:");
  console.log("   Email: admin@example.com");
  console.log("   Password: admin123");
  console.log("\n   Email: sales@example.com");
  console.log("   Password: sales123");
  console.log("\n   Email: manager@example.com");
  console.log("   Password: manager123");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });