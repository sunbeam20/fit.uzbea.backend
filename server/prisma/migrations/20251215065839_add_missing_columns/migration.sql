/*
  Warnings:

  - You are about to drop the column `serial` on the `Products` table. All the data in the column will be lost.
  - You are about to drop the column `warranty` on the `Products` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Exchanges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ExchangesItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PurchasesReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SalesReturn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SerialStatus" AS ENUM ('Available', 'Sold', 'Returned', 'Unavailable', 'InService', 'Exchanged');

-- AlterTable
ALTER TABLE "Exchanges" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ExchangesItems" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "newSerial_id" INTEGER,
ADD COLUMN     "oldSerial_id" INTEGER,
ADD COLUMN     "productSerialsId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Products" DROP COLUMN "serial",
DROP COLUMN "warranty",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "useIndividualSerials" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Purchases" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PurchasesReturn" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SalesReturn" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SalesReturnItems" ADD COLUMN     "productSerialsId" INTEGER;

-- AlterTable
ALTER TABLE "Services" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Active';

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSerials" (
    "id" SERIAL NOT NULL,
    "serial" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "status" "SerialStatus" NOT NULL DEFAULT 'Available',
    "warranty" "Warranty" NOT NULL DEFAULT 'No',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sale_id" INTEGER,

    CONSTRAINT "ProductSerials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSerials_serial_key" ON "ProductSerials"("serial");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSerials" ADD CONSTRAINT "ProductSerials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSerials" ADD CONSTRAINT "ProductSerials_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItems" ADD CONSTRAINT "SalesReturnItems_productSerialsId_fkey" FOREIGN KEY ("productSerialsId") REFERENCES "ProductSerials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangesItems" ADD CONSTRAINT "ExchangesItems_oldSerial_id_fkey" FOREIGN KEY ("oldSerial_id") REFERENCES "ProductSerials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangesItems" ADD CONSTRAINT "ExchangesItems_newSerial_id_fkey" FOREIGN KEY ("newSerial_id") REFERENCES "ProductSerials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
