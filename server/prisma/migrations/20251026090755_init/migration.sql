/*
  Warnings:

  - You are about to drop the column `category_id` on the `Products` table. All the data in the column will be lost.
  - You are about to drop the `PurchaseReturnItems` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category_name` to the `Products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Products" DROP CONSTRAINT "Products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PurchaseReturnItems" DROP CONSTRAINT "PurchaseReturnItems_products_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PurchaseReturnItems" DROP CONSTRAINT "PurchaseReturnItems_purchaseReturn_id_fkey";

-- AlterTable
ALTER TABLE "Products" DROP COLUMN "category_id",
ADD COLUMN     "category_name" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."PurchaseReturnItems";

-- CreateTable
CREATE TABLE "PurchasesReturnItems" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "products_id" INTEGER NOT NULL,
    "purchaseReturn_id" INTEGER NOT NULL,

    CONSTRAINT "PurchasesReturnItems_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_name_fkey" FOREIGN KEY ("category_name") REFERENCES "Categories"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesReturnItems" ADD CONSTRAINT "PurchasesReturnItems_products_id_fkey" FOREIGN KEY ("products_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesReturnItems" ADD CONSTRAINT "PurchasesReturnItems_purchaseReturn_id_fkey" FOREIGN KEY ("purchaseReturn_id") REFERENCES "PurchasesReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
