-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "taskAssignEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tasksRemainderEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "PriceMatrix" (
    "priceMatrixId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceType" TEXT NOT NULL,

    CONSTRAINT "PriceMatrix_pkey" PRIMARY KEY ("priceMatrixId")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "priceTierId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "markup" DECIMAL(10,2) NOT NULL,
    "priceMatrixId" TEXT NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("priceTierId")
);

-- CreateTable
CREATE TABLE "ShopInformation" (
    "shopId" TEXT NOT NULL,
    "shopIdentifier" TEXT NOT NULL,
    "companyName" TEXT,
    "companyEmail" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "companyLogo" TEXT,
    "facebook" TEXT,
    "whatsapp" TEXT,
    "tiktok" TEXT,
    "instagram" TEXT,

    CONSTRAINT "ShopInformation_pkey" PRIMARY KEY ("shopId")
);

-- CreateIndex
CREATE INDEX "PriceTier_priceMatrixId_idx" ON "PriceTier"("priceMatrixId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInformation_shopIdentifier_key" ON "ShopInformation"("shopIdentifier");

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_priceMatrixId_fkey" FOREIGN KEY ("priceMatrixId") REFERENCES "PriceMatrix"("priceMatrixId") ON DELETE CASCADE ON UPDATE CASCADE;
