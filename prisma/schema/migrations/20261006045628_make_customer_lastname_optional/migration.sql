-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LineItemCustomization" ADD COLUMN     "showMatrixColumn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PriceMatrix" ADD COLUMN     "columns" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN     "columnPrices" JSONB;

-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "matrixColumn" TEXT;
