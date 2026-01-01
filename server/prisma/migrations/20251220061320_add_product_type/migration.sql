-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('New', 'PreOwned');

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'New';
