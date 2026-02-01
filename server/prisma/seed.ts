import {
  PrismaClient,
  Status,
  Warranty,
  SerialStatus,
  ProductType,
  ProductStatus,
} from "../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function to generate sequential IDs
function generateSequentialId(prefix: string, index: number): string {
  return `${prefix}${(index + 1).toString().padStart(5, "0")}`;
}

// Helper function to get future date
function getFutureDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Helper function to get past date
function getPastDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log("🌱 Starting comprehensive database seeding...");

  // Clear existing data in correct order to avoid foreign key constraints
  console.log("🧹 Clearing existing data...");
  
  const tablesToClear = [
    "exchangeItemSerials",
    "ExchangesItems",
    "Exchanges",
    "salesReturnItemSerials",
    "SalesReturnItems",
    "SalesReturn",
    "salesItemSerials",
    "SalesItems",
    "Sales",
    "purchaseReturnItemSerials",
    "PurchasesReturnItems",
    "PurchasesReturn",
    "purchaseItemSerials",
    "PurchasesItems",
    "Purchases",
    "ProductSerials",
    "Services",
    "Expenses",
    "Products",
    "Customers",
    "Suppliers",
    "Categories",
    "Session",
    "Users",
    "rolePermissions",
    "Permissions",
    "Roles",
  ];

  for (const modelName of tablesToClear) {
    try {
      // @ts-ignore - Dynamic model access
      await prisma[modelName].deleteMany({});
      console.log(`  ✅ Cleared ${modelName}`);
    } catch (error: any) {
      console.log(`  ⏭️  Skipped ${modelName}: ${error.message}`);
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

  const createdPermissions = [];
  for (const permission of permissionsData) {
    try {
      const perm = await prisma.permissions.create({
        data: permission,
      });
      createdPermissions.push(perm);
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
      const role = await prisma.roles.create({
        data: {
          ...rolesData[i],
        },
      });
      createdRoles.push(role);
    } catch (error) {
      console.log(`Error creating role ${rolesData[i].name}:`, error);
    }
  }

  console.log("🔗 Assigning permissions to roles...");
  const superAdminRole = createdRoles.find((r) => r.name === "Super Admin");
  
  if (superAdminRole) {
    for (const permission of createdPermissions) {
      try {
        await prisma.rolePermissions.create({
          data: {
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
      const user = await prisma.users.create({
        data: {
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
      const category = await prisma.categories.create({
        data: {
          name: categoriesData[i].name,
        },
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
          name: customersData[i].name,
          email: customersData[i].email,
          phone: customersData[i].phone,
          address: customersData[i].address,
        },
      });
      createdCustomers.push(customer);
    } catch (error) {
      console.log(`Error creating customer ${customersData[i].name}:`, error);
    }
  }

  console.log("📦 Creating products...");
  const productsData = [
    // Laptops - New
    {
      name: "Dell XPS 13 Laptop",
      specification: '13.4" FHD+ (1920x1200), Intel Core i7-1360P, 16GB LPDDR5, 512GB SSD',
      description: "Premium ultrabook with InfinityEdge display",
      quantity: 8,
      useIndividualSerials: true,
      status: ProductStatus.Active,
      category: "Laptops & Notebooks",
      supplier: "TechDistro Inc.",
      serials: [
        { serial: "DX131001", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131002", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131003", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131004", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131005", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131006", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131007", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "DX131008", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
      ]
    },
    // Laptops - Pre-owned
    {
      name: "Apple MacBook Pro 14\" (Refurbished)",
      specification: "Apple M1 Pro, 16GB Unified Memory, 512GB SSD, Liquid Retina XDR",
      description: "Refurbished professional-grade laptop",
      quantity: 3,
      useIndividualSerials: true,
      status: ProductStatus.Active,
      category: "Laptops & Notebooks",
      supplier: "TechDistro Inc.",
      serials: [
        { serial: "MBP14R01", warranty: Warranty.No, purchasePrice: 1200, wholesalePrice: 1400, retailPrice: 1600, productType: ProductType.PreOwned },
        { serial: "MBP14R02", warranty: Warranty.Yes, purchasePrice: 1200, wholesalePrice: 1400, retailPrice: 1600, productType: ProductType.PreOwned },
        { serial: "MBP14R03", warranty: Warranty.No, purchasePrice: 1200, wholesalePrice: 1400, retailPrice: 1600, productType: ProductType.PreOwned },
      ]
    },
    // Smartphones - New
    {
      name: "iPhone 15 Pro",
      specification: '6.1" Super Retina XDR, A17 Pro, 256GB, Titanium',
      description: "Latest iPhone with advanced camera system",
      quantity: 10,
      useIndividualSerials: true,
      status: ProductStatus.Active,
      category: "Smartphones",
      supplier: "Global Electronics Ltd.",
      serials: [
        { serial: "IP15P001", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P002", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P003", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P004", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P005", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P006", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P007", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P008", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P009", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
        { serial: "IP15P010", warranty: Warranty.Yes, purchasePrice: 900, wholesalePrice: 1100, retailPrice: 1300, productType: ProductType.New },
      ]
    },
    // Desktop Computers - No serials
    {
      name: "Dell OptiPlex Desktop",
      specification: "Intel Core i5, 8GB RAM, 256GB SSD, Windows 11 Pro",
      description: "Business desktop computer",
      quantity: 15,
      useIndividualSerials: false,
      status: ProductStatus.Active,
      category: "Desktop Computers",
      supplier: "TechDistro Inc.",
    },
    // Computer Accessories - No serials
    {
      name: "Logitech MX Master 3S Mouse",
      specification: "Wireless, Darkfield 8000 DPI, USB-C, 70 days battery",
      description: "Advanced wireless mouse for productivity",
      quantity: 25,
      useIndividualSerials: false,
      status: ProductStatus.Active,
      category: "Computer Accessories",
      supplier: "Premium Components Corp.",
    },
  ];

  const createdProducts = [];
  for (let i = 0; i < productsData.length; i++) {
    const productData = productsData[i];
    const category = createdCategories.find((c) => c.name === productData.category);
    const supplier = createdSuppliers.find((s) => s.name === productData.supplier);
    const creator = createdUsers[0];

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
          useIndividualSerials: productData.useIndividualSerials,
          status: productData.status,
          category_id: category.id,
          created_by: creator.id,
        },
      });
      createdProducts.push(product);
      console.log(`  Created product: ${product.name} (Quantity: ${product.quantity})`);
      
      if (productData.useIndividualSerials && productData.serials && productData.serials.length > 0) {
        for (const serialData of productData.serials) {
          await prisma.productSerials.create({
            data: {
              serial: serialData.serial,
              product_id: product.id,
              status: SerialStatus.Available,
              warranty: serialData.warranty,
              purchasePrice: serialData.purchasePrice,
              wholesalePrice: serialData.wholesalePrice,
              retailPrice: serialData.retailPrice,
              productType: serialData.productType,
              supplier_id: supplier?.id,
            },
          });
        }
        console.log(`    Created ${productData.serials.length} serials`);
      }
    } catch (error) {
      console.log(`Error creating product ${productData.name}:`, error);
    }
  }

  console.log("💰 Creating purchases...");
  const createdPurchases = [];
  
  const supplier1 = createdSuppliers.find(s => s.name === "TechDistro Inc.");
  const purchaseUser = createdUsers.find(u => u.email.includes("purchase")) || createdUsers[4];
  
  // Purchase 1: Dell XPS Laptops
  try {
    const purchase1 = await prisma.purchases.create({
      data: {
        purchaseNo: generateSequentialId("PUR", 0),
        totalAmount: 7200,
        totalPaid: 7200,
        dueDate: getPastDate(0),
        note: "Monthly laptop stock order",
        supplier_id: supplier1!.id,
        user_id: purchaseUser.id,
      },
    });
    createdPurchases.push(purchase1);
    
    const dellProduct = createdProducts.find(p => p.name === "Dell XPS 13 Laptop");
    if (dellProduct) {
      const dellSerials = await prisma.productSerials.findMany({
        where: { product_id: dellProduct.id, status: SerialStatus.Available },
        take: 8,
      });
      
      if (dellSerials.length > 0) {
        const purchaseItem1 = await prisma.purchasesItems.create({
          data: {
            quantity: dellSerials.length,
            unitPrice: dellSerials[0].purchasePrice,
            purchase_id: purchase1.id,
            product_id: dellProduct.id,
          },
        });
        
        for (const serial of dellSerials) {
          await prisma.purchaseItemSerials.create({
            data: {
              purchaseItem_id: purchaseItem1.id,
              serial_id: serial.id,
              purchasedPrice: serial.purchasePrice,
              purchasedAt: new Date(),
            },
          });
        }
      }
    }
    
    console.log(`  Created Purchase #${purchase1.purchaseNo} with 8 Dell XPS Laptops`);
  } catch (error) {
    console.log("Error creating purchase 1:", error);
  }

  // Purchase 2: MacBook Pro Refurbished
  try {
    const purchase2 = await prisma.purchases.create({
      data: {
        purchaseNo: generateSequentialId("PUR", 1),
        totalAmount: 3600,
        totalPaid: 3600,
        dueDate: getPastDate(-5),
        note: "Refurbished laptops order",
        supplier_id: supplier1!.id,
        user_id: purchaseUser.id,
      },
    });
    createdPurchases.push(purchase2);
    
    const macbookProduct = createdProducts.find(p => p.name === "Apple MacBook Pro 14\" (Refurbished)");
    if (macbookProduct) {
      const macbookSerials = await prisma.productSerials.findMany({
        where: { product_id: macbookProduct.id, status: SerialStatus.Available },
        take: 3,
      });
      
      if (macbookSerials.length > 0) {
        const purchaseItem2 = await prisma.purchasesItems.create({
          data: {
            quantity: macbookSerials.length,
            unitPrice: macbookSerials[0].purchasePrice,
            purchase_id: purchase2.id,
            product_id: macbookProduct.id,
          },
        });
        
        for (const serial of macbookSerials) {
          await prisma.purchaseItemSerials.create({
            data: {
              purchaseItem_id: purchaseItem2.id,
              serial_id: serial.id,
              purchasedPrice: serial.purchasePrice,
              purchasedAt: new Date(),
            },
          });
        }
      }
    }
    
    console.log(`  Created Purchase #${purchase2.purchaseNo} with 3 MacBook Pro (Refurbished)`);
  } catch (error) {
    console.log("Error creating purchase 2:", error);
  }

  // Purchase 3: iPhone 15 Pro
  try {
    const purchase3 = await prisma.purchases.create({
      data: {
        purchaseNo: generateSequentialId("PUR", 2),
        totalAmount: 9000,
        totalPaid: 9000,
        dueDate: getFutureDate(15),
        note: "New smartphone stock",
        supplier_id: createdSuppliers[1].id,
        user_id: purchaseUser.id,
      },
    });
    createdPurchases.push(purchase3);
    
    const iphoneProduct = createdProducts.find(p => p.name === "iPhone 15 Pro");
    if (iphoneProduct) {
      const iphoneSerials = await prisma.productSerials.findMany({
        where: { product_id: iphoneProduct.id, status: SerialStatus.Available },
        take: 10,
      });
      
      if (iphoneSerials.length > 0) {
        const purchaseItem3 = await prisma.purchasesItems.create({
          data: {
            quantity: iphoneSerials.length,
            unitPrice: iphoneSerials[0].purchasePrice,
            purchase_id: purchase3.id,
            product_id: iphoneProduct.id,
          },
        });
        
        for (const serial of iphoneSerials) {
          await prisma.purchaseItemSerials.create({
            data: {
              purchaseItem_id: purchaseItem3.id,
              serial_id: serial.id,
              purchasedPrice: serial.purchasePrice,
              purchasedAt: new Date(),
            },
          });
        }
      }
    }
    
    console.log(`  Created Purchase #${purchase3.purchaseNo} with 10 iPhone 15 Pro`);
  } catch (error) {
    console.log("Error creating purchase 3:", error);
  }

  console.log("🛒 Creating sales...");
  const createdSales = [];
  const salesUser = createdUsers.find(u => u.email.includes("sales")) || createdUsers[2];
  
  // Sale 1: iPhone to ABC Corporation
  try {
    const sale1 = await prisma.sales.create({
      data: {
        saleNo: generateSequentialId("SAL", 0),
        totalAmount: 1250,
        totalPaid: 1250,
        totaldiscount: 50,
        dueDate: getFutureDate(7),
        status: "Active",
        customer_id: createdCustomers[0].id,
        user_id: salesUser.id,
      },
    });
    createdSales.push(sale1);
    
    const iphoneProduct = createdProducts.find(p => p.name === "iPhone 15 Pro");
    if (iphoneProduct) {
      const iphoneSerial = await prisma.productSerials.findFirst({
        where: { 
          product_id: iphoneProduct.id, 
          status: SerialStatus.Available,
        },
      });
      
      if (iphoneSerial) {
        const saleItem1 = await prisma.salesItems.create({
          data: {
            quantity: 1,
            unitPrice: 1300,
            discount: 50,
            sales_id: sale1.id,
            product_id: iphoneProduct.id,
          },
        });
        
        await prisma.salesItemSerials.create({
          data: {
            salesItem_id: saleItem1.id,
            serial_id: iphoneSerial.id,
            soldPrice: 1250,
            soldAt: new Date(),
          },
        });
        
        await prisma.productSerials.update({
          where: { id: iphoneSerial.id },
          data: { status: SerialStatus.Sold },
        });
        
        await prisma.products.update({
          where: { id: iphoneProduct.id },
          data: { quantity: { decrement: 1 } },
        });
      }
    }
    
    console.log(`  Created Sale #${sale1.saleNo} with 1 iPhone 15 Pro`);
  } catch (error) {
    console.log("Error creating sale 1:", error);
  }

  // Sale 2: Two Dell XPS Laptops to XYZ Enterprises
  try {
    const sale2 = await prisma.sales.create({
      data: {
        saleNo: generateSequentialId("SAL", 1),
        totalAmount: 2600,
        totalPaid: 2600,
        totaldiscount: 0,
        dueDate: getFutureDate(25),
        status: "Active",
        customer_id: createdCustomers[1].id,
        user_id: salesUser.id,
      },
    });
    createdSales.push(sale2);
    
    const dellProduct = createdProducts.find(p => p.name === "Dell XPS 13 Laptop");
    if (dellProduct) {
      const dellSerials = await prisma.productSerials.findMany({
        where: { 
          product_id: dellProduct.id, 
          status: SerialStatus.Available,
        },
        take: 2,
      });
      
      if (dellSerials.length === 2) {
        const saleItem2 = await prisma.salesItems.create({
          data: {
            quantity: 2,
            unitPrice: 1300,
            discount: 0,
            sales_id: sale2.id,
            product_id: dellProduct.id,
          },
        });
        
        for (const serial of dellSerials) {
          await prisma.salesItemSerials.create({
            data: {
              salesItem_id: saleItem2.id,
              serial_id: serial.id,
              soldPrice: 1300,
              soldAt: new Date(),
            },
          });
          
          await prisma.productSerials.update({
            where: { id: serial.id },
            data: { status: SerialStatus.Sold },
          });
        }
        
        await prisma.products.update({
          where: { id: dellProduct.id },
          data: { quantity: { decrement: 2 } },
        });
      }
    }
    
    console.log(`  Created Sale #${sale2.saleNo} with 2 Dell XPS Laptops`);
  } catch (error) {
    console.log("Error creating sale 2:", error);
  }

  // Sale 3: Non-serialized products (Dell Desktop and Mouse)
  try {
    const sale3 = await prisma.sales.create({
      data: {
        saleNo: generateSequentialId("SAL", 2),
        totalAmount: 850,
        totalPaid: 850,
        totaldiscount: 50,
        dueDate: getFutureDate(30),
        status: "Active",
        customer_id: createdCustomers[2].id,
        user_id: salesUser.id,
      },
    });
    createdSales.push(sale3);
    
    const desktopProduct = createdProducts.find(p => p.name === "Dell OptiPlex Desktop");
    const mouseProduct = createdProducts.find(p => p.name === "Logitech MX Master 3S Mouse");
    
    if (desktopProduct) {
      const saleItem3 = await prisma.salesItems.create({
        data: {
          quantity: 1,
          unitPrice: 800,
          discount: 0,
          sales_id: sale3.id,
          product_id: desktopProduct.id,
        },
      });
      
      await prisma.products.update({
        where: { id: desktopProduct.id },
        data: { quantity: { decrement: 1 } },
      });
    }
    
    if (mouseProduct) {
      const saleItem4 = await prisma.salesItems.create({
        data: {
          quantity: 2,
          unitPrice: 50,
          discount: 50,
          sales_id: sale3.id,
          product_id: mouseProduct.id,
        },
      });
      
      await prisma.products.update({
        where: { id: mouseProduct.id },
        data: { quantity: { decrement: 2 } },
      });
    }
    
    console.log(`  Created Sale #${sale3.saleNo} with non-serialized products`);
  } catch (error) {
    console.log("Error creating sale 3:", error);
  }

  console.log("📝 Creating purchase returns...");
  // Create a purchase return for one defective MacBook
  try {
    const macbookProduct = createdProducts.find(p => p.name === "Apple MacBook Pro 14\" (Refurbished)");
    const macbookSerial = await prisma.productSerials.findFirst({
      where: { 
        product_id: macbookProduct?.id, 
        status: SerialStatus.Available,
        warranty: Warranty.No,
      },
    });
    
    if (macbookProduct && macbookSerial) {
      const purchaseReturn = await prisma.purchasesReturn.create({
        data: {
          returnNo: generateSequentialId("PRET", 0),
          totalPaid: 1200,
          note: "Defective unit - screen flickering",
          purchase_id: createdPurchases[1].id,
          user_id: purchaseUser.id,
          supplier_id: supplier1!.id,
        },
      });
      
      const purchaseReturnItem = await prisma.purchasesReturnItems.create({
        data: {
          quantity: 1,
          unitPrice: 1200,
          products_id: macbookProduct.id,
          purchaseReturn_id: purchaseReturn.id,
        },
      });
      
      await prisma.purchaseReturnItemSerials.create({
        data: {
          purchaseReturnItem_id: purchaseReturnItem.id,
          serial_id: macbookSerial.id,
          returnedPrice: 1200,
          returnedAt: new Date(),
        },
      });
      
      await prisma.productSerials.update({
        where: { id: macbookSerial.id },
        data: { status: SerialStatus.Returned },
      });
      
      await prisma.products.update({
        where: { id: macbookProduct.id },
        data: { quantity: { decrement: 1 } },
      });
      
      console.log(`  Created Purchase Return #${purchaseReturn.returnNo} for defective MacBook`);
    }
  } catch (error) {
    console.log("Error creating purchase return:", error);
  }

  console.log("🔄 Creating sales returns...");
  // Create a sales return for the iPhone sold earlier
  try {
    const iphoneProduct = createdProducts.find(p => p.name === "iPhone 15 Pro");
    const soldiPhoneSerial = await prisma.productSerials.findFirst({
      where: { 
        product_id: iphoneProduct?.id, 
        status: SerialStatus.Sold,
      },
    });
    
    if (iphoneProduct && soldiPhoneSerial) {
      const salesReturn = await prisma.salesReturn.create({
        data: {
          returnNo: generateSequentialId("SRET", 0),
          total_payback: 1250,
          note: "Customer changed mind - within return period",
          sales_id: createdSales[0].id,
          user_id: salesUser.id,
          customer_id: createdCustomers[0].id,
        },
      });
      
      const salesReturnItem = await prisma.salesReturnItems.create({
        data: {
          quantity: 1,
          unitPrice: 1250,
          product_id: iphoneProduct.id,
          salesReturn_id: salesReturn.id,
          productSerialsId: soldiPhoneSerial.id,
        },
      });
      
      await prisma.salesReturnItemSerials.create({
        data: {
          salesReturnItem_id: salesReturnItem.id,
          serial_id: soldiPhoneSerial.id,
          returnedPrice: 1250,
          returnedAt: new Date(),
        },
      });
      
      await prisma.productSerials.update({
        where: { id: soldiPhoneSerial.id },
        data: { 
          status: SerialStatus.Available,
          productType: ProductType.PreOwned,
        },
      });
      
      await prisma.products.update({
        where: { id: iphoneProduct.id },
        data: { quantity: { increment: 1 } },
      });
      
      console.log(`  Created Sales Return #${salesReturn.returnNo} for iPhone`);
    }
  } catch (error) {
    console.log("Error creating sales return:", error);
  }

  console.log("🔄 Creating exchanges...");
  // Create an exchange (MacBook for Dell laptop)
  try {
    const dellProduct = createdProducts.find(p => p.name === "Dell XPS 13 Laptop");
    const macbookProduct = createdProducts.find(p => p.name === "Apple MacBook Pro 14\" (Refurbished)");
    
    const soldDellSerial = await prisma.productSerials.findFirst({
      where: { 
        product_id: dellProduct?.id, 
        status: SerialStatus.Sold,
      },
    });
    
    const availableMacbookSerial = await prisma.productSerials.findFirst({
      where: { 
        product_id: macbookProduct?.id, 
        status: SerialStatus.Available,
        warranty: Warranty.Yes,
      },
    });
    
    if (dellProduct && macbookProduct && soldDellSerial && availableMacbookSerial) {
      const exchange = await prisma.exchanges.create({
        data: {
          exchangeNo: generateSequentialId("EXC", 0),
          totalPaid: 300, // Customer pays difference
          totalPayback: 0,
          note: "Customer wanted more powerful laptop",
          sales_id: createdSales[1].id, // Reference to the sale with Dell laptops
          user_id: salesUser.id,
          customer_id: createdCustomers[1].id,
        },
      });
      
      const exchangeItem = await prisma.exchangesItems.create({
        data: {
          quantity: 1,
          unitPrice: 300,
          note: "Exchange Dell XPS for MacBook Pro",
          oldProduct_id: dellProduct.id,
          newProduct_id: macbookProduct.id,
          exchangeId: exchange.id,
        },
      });
      
      await prisma.exchangeItemSerials.create({
        data: {
          exchangeItem_id: exchangeItem.id,
          serial_id_old: soldDellSerial.id,
          serial_id_new: availableMacbookSerial.id,
          exchangePrice: 300,
          exchangedAt: new Date(),
        },
      });
      
      // Update old serial status
      await prisma.productSerials.update({
        where: { id: soldDellSerial.id },
        data: { status: SerialStatus.Exchanged },
      });
      
      // Update new serial status
      await prisma.productSerials.update({
        where: { id: availableMacbookSerial.id },
        data: { status: SerialStatus.Sold },
      });
      
      // Update product quantities
      await prisma.products.update({
        where: { id: dellProduct.id },
        data: { quantity: { increment: 1 } }, // Returned Dell becomes available
      });
      
      await prisma.products.update({
        where: { id: macbookProduct.id },
        data: { quantity: { decrement: 1 } }, // MacBook is sold
      });
      
      console.log(`  Created Exchange #${exchange.exchangeNo} (Dell XPS ↔ MacBook Pro)`);
    }
  } catch (error) {
    console.log("Error creating exchange:", error);
  }

  console.log("🔧 Creating services...");
  const servicesData = [
    {
      serviceProductName: "MacBook Pro Screen Repair",
      serviceDescription: "Replace cracked screen with genuine Apple part",
      serviceCost: 350,
      assignedTechnician: "Tom Harris",
      customer: "ABC Corporation",
      user: "Tom Harris",
    },
    {
      serviceProductName: "Laptop Battery Replacement",
      serviceDescription: "Replace old battery with new OEM battery",
      serviceCost: 130,
      assignedTechnician: "Tom Harris",
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
          serviceDescription: `${serviceData.serviceDescription} (Technician: ${serviceData.assignedTechnician})`,
          serviceCost: serviceData.serviceCost,
          serviceStatus: "Active",
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
      amount: 2500,
      description: "Monthly office rent payment",
      user: "admin@example.com",
    },
    {
      title: "Internet & Phone Bills",
      amount: 190,
      description: "Monthly internet and phone service",
      user: "admin@example.com",
    },
    {
      title: "Shipping Supplies",
      amount: 350,
      description: "Bubble wrap, boxes, tape",
      user: "purchase@example.com",
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
  
  const totalSerials = await prisma.productSerials.count();
  console.log(`  ✅ Product Serials: ${totalSerials}`);
  
  console.log(`  ✅ Purchases: ${createdPurchases.length}`);
  console.log(`  ✅ Purchase Item Serials: ${await prisma.purchaseItemSerials.count()}`);
  console.log(`  ✅ Sales: ${createdSales.length}`);
  console.log(`  ✅ Sales Item Serials: ${await prisma.salesItemSerials.count()}`);
  
  const purchaseReturns = await prisma.purchasesReturn.count();
  console.log(`  ✅ Purchase Returns: ${purchaseReturns}`);
  
  const salesReturns = await prisma.salesReturn.count();
  console.log(`  ✅ Sales Returns: ${salesReturns}`);
  
  const exchanges = await prisma.exchanges.count();
  console.log(`  ✅ Exchanges: ${exchanges}`);
  
  const services = await prisma.services.count();
  console.log(`  ✅ Services: ${services}`);
  
  const expenses = await prisma.expenses.count();
  console.log(`  ✅ Expenses: ${expenses}`);
  
  // Show inventory summary
  console.log("\n📦 Inventory Summary:");
  const products = await prisma.products.findMany({
    include: {
      productSerials: {
        where: { status: SerialStatus.Available },
      },
    },
  });
  
  for (const product of products) {
    const serialCount = product.productSerials.length;
    const totalCount = product.useIndividualSerials ? serialCount : product.quantity;
    console.log(`  ${product.name}: ${totalCount} units (${serialCount} serials available)`);
  }
  
  console.log("\n🔑 Login Credentials:");
  console.log("   Email: admin@example.com");
  console.log("   Password: admin123");
  console.log("   Email: sales@example.com");
  console.log("   Password: sales123");
  console.log("   Email: manager@example.com");
  console.log("   Password: manager123");
  console.log("   Email: purchase@example.com");
  console.log("   Password: purchase123");
  console.log("   Email: technician@example.com");
  console.log("   Password: tech123");
  console.log("\n⚠️  Note: Sales status is stored as String, not Status enum");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });