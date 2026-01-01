-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('Active', 'Unavailable', 'Discontinued');

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "updated_by" INTEGER;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
