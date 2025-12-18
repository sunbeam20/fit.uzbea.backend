import { PrismaClient, Status, Warranty, SerialStatus } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Helper function to create Decimal values
const decimal = (value: number) => new Decimal(value.toString());

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
        { name: 'inventory' },
        { name: 'technician' }
      ],
      skipDuplicates: true,
    });

    const adminRole = await prisma.roles.findFirst({ where: { name: 'admin' } });
    const managerRole = await prisma.roles.findFirst({ where: { name: 'manager' } });
    const userRole = await prisma.roles.findFirst({ where: { name: 'user' } });
    const salesRole = await prisma.roles.findFirst({ where: { name: 'sales' } });
    const techRole = await prisma.roles.findFirst({ where: { name: 'technician' } });

    if (!adminRole || !managerRole || !userRole || !salesRole || !techRole) {
      throw new Error('Required roles not found');
    }

    // 2. Create Users - WITHOUT createdAt field for now
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create users one by one instead of createMany
    const adminUser = await prisma.users.create({
      data: {
        name: 'Super Admin',
        email: 'admin@inventory.com',
        password: await bcrypt.hash('admin123', 10),
        role_id: adminRole.id,
        status: Status.Active,
        // Omit createdAt and updatedAt
      },
    });

    const johnUser = await prisma.users.create({
      data: {
        name: 'John Manager',
        email: 'john.manager@inventory.com',
        password: hashedPassword,
        role_id: managerRole.id,
        status: Status.Active,
      },
    });

    const sarahUser = await prisma.users.create({
      data: {
        name: 'Sarah Sales',
        email: 'sarah.sales@inventory.com',
        password: hashedPassword,
        role_id: salesRole.id,
        status: Status.Active,
      },
    });

    const mikeUser = await prisma.users.create({
      data: {
        name: 'Mike User',
        email: 'mike.user@inventory.com',
        password: hashedPassword,
        role_id: userRole.id,
        status: Status.Active,
      },
    });

    const tomUser = await prisma.users.create({
      data: {
        name: 'Tom Technician',
        email: 'tom.tech@inventory.com',
        password: hashedPassword,
        role_id: techRole.id,
        status: Status.Active,
      },
    });

    // 3. Create Categories
    console.log('Creating categories...');
    await prisma.categories.createMany({
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
    const peripheralsCategory = categoryList.find(c => c.name === 'Peripherals & Accessories');

    // 4. Create Suppliers
    console.log('Creating suppliers...');
    await prisma.suppliers.createMany({
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
    await prisma.customers.createMany({
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
        },
        {
          name: 'Walk-in Customer',
          email: null,
          phone: '+1-555-9999',
          address: null
        }
      ],
      skipDuplicates: true,
    });

    const customerList = await prisma.customers.findMany();
    const abccorp = customerList.find(c => c.name === 'ABC Corporation');
    const xyzenterprises = customerList.find(c => c.name === 'XYZ Enterprises');
    const walkinCustomer = customerList.find(c => c.name === 'Walk-in Customer');

    // 6. Create Products - Check if useIndividualSerials column exists
    console.log('Creating products...');
    
    // First, let's check the current Products table structure
    const productsData = [
      {
        name: 'Dell XPS 13 Laptop',
        specification: '13.4" FHD+, Intel Core i7, 16GB RAM, 512GB SSD',
        description: 'Premium ultrabook with infinity-edge display',
        quantity: 10,
        purchasePrice: decimal(899.99),
        wholesalePrice: decimal(1099.99),
        retailPrice: decimal(1299.99),
        // Temporarily omit useIndividualSerials if column doesn't exist
        category_id: laptopsCategory!.id,
      },
      {
        name: 'MacBook Pro 14"',
        specification: '14.2" Liquid Retina XDR, M2 Pro, 16GB RAM, 1TB SSD',
        description: 'Professional laptop for creative work',
        quantity: 8,
        purchasePrice: decimal(1799.99),
        wholesalePrice: decimal(1999.99),
        retailPrice: decimal(2299.99),
        category_id: laptopsCategory!.id,
      },
      {
        name: 'iPhone 15 Pro',
        specification: '6.1" Super Retina XDR, A17 Pro, 128GB, Titanium',
        description: 'Latest iPhone with titanium design',
        quantity: 15,
        purchasePrice: decimal(899.99),
        wholesalePrice: decimal(999.99),
        retailPrice: decimal(1199.99),
        category_id: phonesCategory!.id,
      },
      {
        name: 'Logitech MX Master 3S Mouse',
        specification: 'Wireless, 8K DPI, Darkfield Tracking',
        description: 'Advanced wireless mouse for professionals',
        quantity: 25,
        purchasePrice: decimal(69.99),
        wholesalePrice: decimal(89.99),
        retailPrice: decimal(99.99),
        category_id: peripheralsCategory!.id,
      },
      {
        name: 'Samsung 2TB 990 PRO NVMe SSD',
        specification: 'PCIe 4.0, 7450MB/s Read, 6900MB/s Write',
        description: 'High-performance NVMe SSD',
        quantity: 20,
        purchasePrice: decimal(129.99),
        wholesalePrice: decimal(149.99),
        retailPrice: decimal(179.99),
        category_id: componentsCategory!.id,
      }
    ];

    // Create products one by one to handle potential missing columns
    const createdProducts = [];
    for (const productData of productsData) {
      try {
        const product = await prisma.products.create({
          data: productData,
        });
        createdProducts.push(product);
        console.log(`Created product: ${product.name}`);
      } catch (error: any) {
        console.error(`Error creating product ${productData.name}:`, error.message);
        // Try without certain fields
        const { purchasePrice, wholesalePrice, retailPrice, ...rest } = productData;
        const product = await prisma.products.create({
          data: {
            ...rest,
            purchasePrice: parseFloat(purchasePrice.toString()),
            wholesalePrice: parseFloat(wholesalePrice.toString()),
            retailPrice: parseFloat(retailPrice.toString()),
          },
        });
        createdProducts.push(product);
      }
    }

    const productList = createdProducts;
    const dellLaptop = productList.find(p => p.name.includes('Dell XPS'));
    const macbook = productList.find(p => p.name.includes('MacBook'));
    const iphone = productList.find(p => p.name.includes('iPhone'));
    const logitechMouse = productList.find(p => p.name.includes('Logitech'));
    const samsungSSD = productList.find(p => p.name.includes('Samsung'));

    // 7. Try to create ProductSerials table if it doesn't exist
    console.log('Checking ProductSerials table...');
    try {
      // Check if we can create serials
      const testSerial = await prisma.productSerials.create({
        data: {
          serial: 'TEST-001',
          product_id: dellLaptop!.id,
          status: SerialStatus.Available,
          warranty: Warranty.Yes,
        },
      });
      console.log('ProductSerials table exists, creating serials...');
      
      // Create serials for products
      const createSerials = async (product: any, count: number, prefix: string) => {
        const serials = [];
        for (let i = 1; i <= count; i++) {
          serials.push({
            serial: `${prefix}-${i.toString().padStart(3, '0')}`,
            product_id: product.id,
            status: SerialStatus.Available,
            warranty: Warranty.Yes
          });
        }
        
        // Insert in batches of 10
        for (let i = 0; i < serials.length; i += 10) {
          const batch = serials.slice(i, i + 10);
          await prisma.productSerials.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }
        console.log(`Created ${serials.length} serials for ${product.name}`);
      };
      
      if (dellLaptop) await createSerials(dellLaptop, 10, 'DLXPS13');
      if (macbook) await createSerials(macbook, 8, 'MBP14');
      if (iphone) await createSerials(iphone, 15, 'IP15PRO');
      
    } catch (error: any) {
      console.warn('ProductSerials table might not exist or has different structure:', error.message);
      console.log('Skipping serial creation for now...');
    }

    // 8. Create Purchases
    console.log('Creating purchases...');
    const purchases = await prisma.purchases.createMany({
      data: [
        {
          totalAmount: decimal(45999.85),
          totalPaid: decimal(45999.85),
          dueDate: new Date('2024-12-31'),
          note: 'Initial inventory stock',
          supplier_id: techDistro!.id,
          user_id: adminUser.id
        }
      ],
      skipDuplicates: true,
    });

    const purchaseList = await prisma.purchases.findMany();
    const initialPurchase = purchaseList[0];

    // 9. Create Purchase Items
    console.log('Creating purchase items...');
    if (dellLaptop && macbook && iphone && logitechMouse && samsungSSD) {
      await prisma.purchasesItems.createMany({
        data: [
          {
            quantity: 10,
            unitPrice: decimal(899.99),
            purchase_id: initialPurchase.id,
            product_id: dellLaptop.id
          },
          {
            quantity: 8,
            unitPrice: decimal(1799.99),
            purchase_id: initialPurchase.id,
            product_id: macbook.id
          },
          {
            quantity: 15,
            unitPrice: decimal(899.99),
            purchase_id: initialPurchase.id,
            product_id: iphone.id
          },
          {
            quantity: 25,
            unitPrice: decimal(69.99),
            purchase_id: initialPurchase.id,
            product_id: logitechMouse.id
          },
          {
            quantity: 20,
            unitPrice: decimal(129.99),
            purchase_id: initialPurchase.id,
            product_id: samsungSSD.id
          }
        ],
        skipDuplicates: true,
      });
    }

    // 10. Create Sales
    console.log('Creating sales...');
    const sales = await prisma.sales.createMany({
      data: [
        {
          totalAmount: decimal(11499.94),
          totalPaid: decimal(11499.94),
          dueDate: new Date('2024-10-30'),
          customer_id: abccorp!.id,
          user_id: sarahUser.id
        },
        {
          totalAmount: decimal(1299.99),
          totalPaid: decimal(1299.99),
          dueDate: new Date('2024-09-05'),
          customer_id: walkinCustomer!.id,
          user_id: sarahUser.id
        }
      ],
      skipDuplicates: true,
    });

    const salesList = await prisma.sales.findMany();
    const sale1 = salesList[0];
    const sale2 = salesList[1];

    // 11. Create Sales Items
    console.log('Creating sales items...');
    if (dellLaptop && macbook && iphone) {
      await prisma.salesItems.createMany({
        data: [
          {
            quantity: 3,
            unitPrice: decimal(1299.99),
            sales_id: sale1.id,
            product_id: dellLaptop.id
          },
          {
            quantity: 2,
            unitPrice: decimal(2299.99),
            sales_id: sale1.id,
            product_id: macbook.id
          },
          {
            quantity: 1,
            unitPrice: decimal(1199.99),
            sales_id: sale2.id,
            product_id: iphone.id
          }
        ],
        skipDuplicates: true,
      });
    }

    // 12. Create Services
    console.log('Creating services...');
    await prisma.services.createMany({
      data: [
        {
          serviceProductName: 'Dell XPS 13 Laptop',
          serviceDescription: 'Screen replacement and battery diagnostics',
          serviceCost: decimal(199.99),
          serviceStatus: 'Completed',
          customer_id: abccorp!.id,
          user_id: tomUser.id
        },
        {
          serviceProductName: 'iPhone 15 Pro',
          serviceDescription: 'Battery replacement and water damage inspection',
          serviceCost: decimal(149.99),
          serviceStatus: 'In Progress',
          customer_id: walkinCustomer!.id,
          user_id: tomUser.id
        }
      ],
      skipDuplicates: true,
    });

    console.log('\n' + '='.repeat(60));
    console.log('SEED COMPLETED!');
    console.log('='.repeat(60));
    console.log('Created basic data structure.');
    console.log('Note: Some features might not work until you update your database.');
    console.log('\nNext steps:');
    console.log('1. Run the SQL commands to add missing columns to your database');
    console.log('2. Run npx prisma generate');
    console.log('3. Run this seed again');
    console.log('\nBasic data created:');
    console.log('- Users with login credentials');
    console.log('- Products for testing');
    console.log('- Sales and purchases');
    console.log('- Services');

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