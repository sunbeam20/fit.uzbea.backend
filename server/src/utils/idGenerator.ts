import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export async function generateId(
  entityType: string,
  prefix: string
): Promise<string> {
  // Get the last record for this entity type
  let lastRecord;

  switch (entityType) {
    case "users":
      lastRecord = await prisma.users.findFirst({
        orderBy: { id: "desc" },
        select: { userId: true },
      });
      break;
    case "customers":
      lastRecord = await prisma.customers.findFirst({
        orderBy: { id: "desc" },
        select: { custId: true },
      });
      break;
    case "suppliers":
      lastRecord = await prisma.suppliers.findFirst({
        orderBy: { id: "desc" },
        select: { suppId: true },
      });
      break;
    case "products":
      lastRecord = await prisma.products.findFirst({
        orderBy: { id: "desc" },
        select: { productCode: true },
      });
      break;
    case "sales":
      lastRecord = await prisma.sales.findFirst({
        orderBy: { id: "desc" },
        select: { saleNo: true },
      });
      break;
    case "sales_return":
      lastRecord = await prisma.salesReturn.findFirst({
        orderBy: { id: "desc" },
        select: { returnNo: true },
      });
      break;
    case "exchanges":
      lastRecord = await prisma.exchanges.findFirst({
        orderBy: { id: "desc" },
        select: { exchangeNo: true },
      });
      break;
    case "purchases":
      lastRecord = await prisma.purchases.findFirst({
        orderBy: { id: "desc" },
        select: { purchaseNo: true },
      });
      break;
    case "purchases_return":
      lastRecord = await prisma.purchasesReturn.findFirst({
        orderBy: { id: "desc" },
        select: { returnNo: true },
      });
      break;
    case "services":
      lastRecord = await prisma.services.findFirst({
        orderBy: { id: "desc" },
        select: { serviceNo: true },
      });
      break;
    case "expenses":
      lastRecord = await prisma.expenses.findFirst({
        orderBy: { id: "desc" },
        select: { expenseNo: true },
      });
      break;
    default:
      lastRecord = null;
  }

  if (!lastRecord) {
    return `${prefix}-00001`;
  }

  // Extract number from the ID
  let lastId: string;
  switch (entityType) {
    case "users":
      lastId = (lastRecord as any).userId;
      break;
    case "customers":
      lastId = (lastRecord as any).custId;
      break;
    case "suppliers":
      lastId = (lastRecord as any).suppId;
      break;
    case "products":
      lastId = (lastRecord as any).productCode;
      break;
    case "sales":
      lastId = (lastRecord as any).saleNo;
      break;
    case "sales_return":
      lastId = (lastRecord as any).returnNo;
      break;
    case "exchanges":
      lastId = (lastRecord as any).exchangeNo;
      break;
    case "purchases":
      lastId = (lastRecord as any).purchaseNo;
      break;
    case "purchases_return":
      lastId = (lastRecord as any).returnNo;
      break;
    case "services":
      lastId = (lastRecord as any).serviceNo;
      break;
    case "expenses":
      lastId = (lastRecord as any).expenseNo;
      break;
    default:
      return `${prefix}-00001`;
  }

  // Extract number and increment
  const match = lastId.match(/(\d+)$/);
  if (!match) {
    return `${prefix}-00001`;
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;

  // Format with leading zeros
  return `${prefix}-${nextNumber.toString().padStart(5, "0")}`;
}
