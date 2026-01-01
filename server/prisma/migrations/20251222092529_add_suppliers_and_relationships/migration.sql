-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "supplier_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
