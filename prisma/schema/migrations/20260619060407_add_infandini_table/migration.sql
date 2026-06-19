/*
  Warnings:

  - Added the required column `updatedAt` to the `PriceTier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ShopInformation" ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "InvoiceFees" (
    "infId" TEXT NOT NULL,
    "feeName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "isTax" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultAutoAdd" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceFees_pkey" PRIMARY KEY ("infId")
);

-- CreateTable
CREATE TABLE "InvoiceInformation" (
    "iniId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'English',
    "termsAndCondition" TEXT NOT NULL,
    "paymentTramsAndCondition" TEXT NOT NULL,
    "invoiceTaxRate" INTEGER NOT NULL DEFAULT 0,
    "invoiceSeed" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceInformation_pkey" PRIMARY KEY ("iniId")
);
