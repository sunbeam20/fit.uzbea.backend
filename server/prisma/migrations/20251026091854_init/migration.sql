/*
  Warnings:

  - You are about to drop the column `category_name` on the `Products` table. All the data in the column will be lost.
  - Added the required column `category_id` to the `Products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Products" DROP CONSTRAINT "Products_category_name_fkey";

-- AlterTable
ALTER TABLE "Products" DROP COLUMN "category_name",
ADD COLUMN     "category_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
