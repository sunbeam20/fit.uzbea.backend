// import { PrismaClient } from "../generated/prisma";
// import fs from "fs";
// import path from "path";

// const prisma = new PrismaClient();

// async function deleteAllData(orderedFileNames: string[]) {
//   const modelNames = orderedFileNames.map((fileName) => {
//     const modelName = path.basename(fileName, path.extname(fileName));
//     return modelName.charAt(0).toUpperCase() + modelName.slice(1);
//   });

//   for (const modelName of modelNames.reverse()) {
//     const model = (prisma as any)[modelName];
//     if (model && typeof model.deleteMany === "function") {
//       await model.deleteMany({});
//       console.log(`🧹 Cleared data from ${modelName}`);
//     } else {
//       console.warn(`⚠️ Model ${modelName} not found in Prisma Client`);
//     }
//   }
// }

// async function main() {
//   const dataDirectory = path.join(__dirname, "seedData");

//   // Keep this order so foreign key dependencies don't break
//   const orderedFileNames = [
//     "roles.json",
//     "categories.json",
//     "products.json",
//     "users.json",
//     "suppliers.json",
//     "customers.json",
//     "purchases.json",
//     "purchasesItems.json",
//     "purchasesReturn.json",
//     "purchasesReturnItems.json",
//     "sales.json",
//     "salesItems.json",
//     "salesReturn.json",
//     "salesReturnItems.json",
//     "services.json",
//     "exchanges.json",
//     "exchangesItems.json",
//   ];

//   // Wipe all old data first
//   await deleteAllData(orderedFileNames);

//   for (const fileName of orderedFileNames) {
//     const filePath = path.join(dataDirectory, fileName);
//     if (!fs.existsSync(filePath)) {
//       console.warn(`⚠️ File not found: ${fileName}, skipping.`);
//       continue;
//     }

//     const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//     const modelName =
//       path.basename(fileName, path.extname(fileName)).charAt(0).toUpperCase() +
//       path.basename(fileName, path.extname(fileName)).slice(1);
//     const model = (prisma as any)[modelName];

//     if (!model) {
//       console.error(`❌ No Prisma model matches: ${modelName}`);
//       continue;
//     }

//     for (const data of jsonData) {
//       await model.create({ data });
//     }

//     console.log(`✅ Seeded ${modelName} with data from ${fileName}`);
//   }
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seeding error:", e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });



import { PrismaClient, Status, Warranty } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  try {
    // 1. Create Roles FIRST (no dependencies)
    console.log('Creating roles...');
    const roles = await prisma.roles.createMany({
      data: [
        { name: 'admin' },
        { name: 'manager' },
        { name: 'user' },
        { name: 'sales' },
        { name: 'inventory' }
      ],
      skipDuplicates: true,
    });

    const adminRole = await prisma.roles.findFirst({ where: { name: 'admin' } });
    const managerRole = await prisma.roles.findFirst({ where: { name: 'manager' } });
    const userRole = await prisma.roles.findFirst({ where: { name: 'user' } });
    const salesRole = await prisma.roles.findFirst({ where: { name: 'sales' } });

    if (!adminRole || !managerRole || !userRole || !salesRole) {
      throw new Error('Required roles not found');
    }

    // 2. Create Users
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await prisma.users.createMany({
      data: [
        {
          name: 'Super Admin',
          email: 'admin@inventory.com',
          password: await bcrypt.hash('admin123', 10),
          role_id: adminRole.id,
          status: Status.Active,
        },
        {
          name: 'John Manager',
          email: 'john.manager@inventory.com',
          password: hashedPassword,
          role_id: managerRole.id,
          status: Status.Active,
        },
        {
          name: 'Sarah Sales',
          email: 'sarah.sales@inventory.com',
          password: hashedPassword,
          role_id: salesRole.id,
          status: Status.Active,
        },
        {
          name: 'Mike User',
          email: 'mike.user@inventory.com',
          password: hashedPassword,
          role_id: userRole.id,
          status: Status.Active,
        }
      ],
      skipDuplicates: true,
    });

    const createdUsers = await prisma.users.findMany();
    const adminUser = createdUsers.find(u => u.email === 'admin@inventory.com');
    const johnUser = createdUsers.find(u => u.email === 'john.manager@inventory.com');
    const sarahUser = createdUsers.find(u => u.email === 'sarah.sales@inventory.com');

    // 3. Create Categories
    console.log('Creating categories...');
    const categories = await prisma.categories.createMany({
      data: [
        { name: 'Laptops & Computers' },
        { name: 'Smartphones & Tablets' },
        { name: 'Computer Components' },
        { name: 'Peripherals & Accessories' },
        { name: 'Networking Equipment' }
      ],
      skipDuplicates: true,
    });

    const categoryList = await prisma.categories.findMany();
    const laptopsCategory = categoryList.find(c => c.name === 'Laptops & Computers');
    const phonesCategory = categoryList.find(c => c.name === 'Smartphones & Tablets');
    const componentsCategory = categoryList.find(c => c.name === 'Computer Components');

    // 4. Create Suppliers
    console.log('Creating suppliers...');
    const suppliers = await prisma.suppliers.createMany({
      data: [
        {
          name: 'TechDistro Inc.',
          email: 'orders@techdistro.com',
          phone: '+1-555-0101',
          address: '123 Tech Blvd, San Francisco, CA'
        },
        {
          name: 'Global Electronics Ltd.',
          email: 'sales@globalelectronics.com',
          phone: '+1-555-0102',
          address: '456 Industry Park, Austin, TX'
        }
      ],
      skipDuplicates: true,
    });

    const supplierList = await prisma.suppliers.findMany();
    const techDistro = supplierList.find(s => s.name === 'TechDistro Inc.');

    // 5. Create Customers
    console.log('Creating customers...');
    const customers = await prisma.customers.createMany({
      data: [
        {
          name: 'ABC Corporation',
          email: 'purchasing@abccorp.com',
          phone: '+1-555-0201',
          address: '100 Business Ave, New York, NY'
        },
        {
          name: 'XYZ Enterprises',
          email: 'it@xyzenterprises.com',
          phone: '+1-555-0202',
          address: '200 Commerce St, Chicago, IL'
        }
      ],
      skipDuplicates: true,
    });

    const customerList = await prisma.customers.findMany();
    const abccorp = customerList.find(c => c.name === 'ABC Corporation');
    const xyzenterprises = customerList.find(c => c.name === 'XYZ Enterprises');

    // 6. Create Products
    console.log('Creating products...');
    const products = await prisma.products.createMany({
      data: [
        // Laptops
        {
          name: 'Dell XPS 13 Laptop',
          specification: '13.4" FHD+, Intel Core i7, 16GB RAM, 512GB SSD',
          description: 'Premium ultrabook with infinity-edge display',
          quantity: 15,
          purchasePrice: 899.99,
          wholesalePrice: 1099.99,
          retailPrice: 1299.99,
          serial: 'DLXPS13-001',
          warranty: Warranty.Yes,
          category_id: laptopsCategory!.id
        },
        {
          name: 'MacBook Pro 14"',
          specification: '14.2" Liquid Retina XDR, M2 Pro, 16GB RAM, 1TB SSD',
          description: 'Professional laptop for creative work',
          quantity: 8,
          purchasePrice: 1799.99,
          wholesalePrice: 1999.99,
          retailPrice: 2299.99,
          serial: 'MBP14-001',
          warranty: Warranty.Yes,
          category_id: laptopsCategory!.id
        },

        // Smartphones
        {
          name: 'iPhone 15 Pro',
          specification: '6.1" Super Retina XDR, A17 Pro, 128GB, Titanium',
          description: 'Latest iPhone with titanium design',
          quantity: 25,
          purchasePrice: 899.99,
          wholesalePrice: 999.99,
          retailPrice: 1199.99,
          serial: 'IP15P-001',
          warranty: Warranty.Yes,
          category_id: phonesCategory!.id
        },

        // Computer Components
        {
          name: 'NVIDIA RTX 4080 Graphics Card',
          specification: '16GB GDDR6X, 9728 CUDA Cores, PCIe 4.0',
          description: 'High-end gaming and professional graphics card',
          quantity: 10,
          purchasePrice: 899.99,
          wholesalePrice: 1099.99,
          retailPrice: 1299.99,
          serial: 'NV4080-001',
          warranty: Warranty.Yes,
          category_id: componentsCategory!.id
        }
      ],
      skipDuplicates: true,
    });

    const productList = await prisma.products.findMany();
    const dellLaptop = productList.find(p => p.name.includes('Dell XPS'));
    const macbook = productList.find(p => p.name.includes('MacBook'));
    const iphone = productList.find(p => p.name.includes('iPhone'));

    // 7. Create Purchases
    console.log('Creating purchases...');
    const purchases = await prisma.purchases.createMany({
      data: [
        {
          totalAmount: 45999.85,
          totalPaid: 45999.85,
          dueDate: new Date('2024-12-31'),
          note: 'Initial inventory stock',
          supplier_id: techDistro!.id,
          user_id: adminUser!.id
        }
      ],
      skipDuplicates: true,
    });

    const purchaseList = await prisma.purchases.findMany();
    const initialPurchase = purchaseList[0];

    // 8. Create Purchase Items
    console.log('Creating purchase items...');
    if (dellLaptop && macbook && iphone) {
      await prisma.purchasesItems.createMany({
        data: [
          {
            quantity: 15,
            unitPrice: 899.99,
            purchase_id: initialPurchase.id,
            product_id: dellLaptop.id
          },
          {
            quantity: 8,
            unitPrice: 1799.99,
            purchase_id: initialPurchase.id,
            product_id: macbook.id
          },
          {
            quantity: 25,
            unitPrice: 899.99,
            purchase_id: initialPurchase.id,
            product_id: iphone.id
          }
        ],
        skipDuplicates: true,
      });
    }

    // 9. Create Sales
    console.log('Creating sales...');
    const sales = await prisma.sales.createMany({
      data: [
        {
          totalAmount: 15299.95,
          totalPaid: 15299.95,
          dueDate: new Date('2024-10-30'),
          customer_id: abccorp!.id,
          user_id: sarahUser!.id
        }
      ],
      skipDuplicates: true,
    });

    const salesList = await prisma.sales.findMany();
    const sale1 = salesList[0];

    // 10. Create Sales Items
    console.log('Creating sales items...');
    if (dellLaptop && macbook) {
      await prisma.salesItems.createMany({
        data: [
          {
            quantity: 5,
            unitPrice: 1299.99,
            sales_id: sale1.id,
            product_id: dellLaptop.id
          },
          {
            quantity: 3,
            unitPrice: 2299.99,
            sales_id: sale1.id,
            product_id: macbook.id
          }
        ],
        skipDuplicates: true,
      });
    }

    // 11. Create Services
    console.log('Creating services...');
    await prisma.services.createMany({
      data: [
        {
          serviceProductName: 'Dell XPS 13 Laptop',
          serviceDescription: 'Screen replacement and battery diagnostics',
          serviceCost: 199.99,
          serviceStatus: 'Completed',
          customer_id: abccorp!.id,
          user_id: sarahUser!.id
        }
      ],
      skipDuplicates: true,
    });

    console.log('Seed completed successfully!');
    console.log('Created:');
    console.log('- 5 Roles');
    console.log('- 4 Users');
    console.log('- 5 Categories');
    console.log('- 2 Suppliers');
    console.log('- 2 Customers');
    console.log('- 4 Products');
    console.log('- 1 Purchase with items');
    console.log('- 1 Sale with items');
    console.log('- 1 Service record');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });