/*
  Warnings:

  - You are about to drop the column `categoryId` on the `QuoteLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `sizeL` on the `QuoteLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `sizeM` on the `QuoteLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `sizeXL` on the `QuoteLineItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteLineItem" DROP CONSTRAINT "QuoteLineItem_categoryId_fkey";

-- AlterTable
ALTER TABLE "LineItemCustomization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuoteLineItem" DROP COLUMN "categoryId",
DROP COLUMN "sizeL",
DROP COLUMN "sizeM",
DROP COLUMN "sizeXL",
ADD COLUMN     "baseCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "matrixId" TEXT,
ADD COLUMN     "mockups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "printCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "sizeBreakdown" JSONB;

-- CreateTable
CREATE TABLE "JobStatusHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
