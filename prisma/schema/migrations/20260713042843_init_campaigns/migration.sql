-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('NEWSLETTER', 'PROMOTION', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientsCount" INTEGER NOT NULL DEFAULT 0,
    "targetAudience" TEXT,
    "promoCode" TEXT,
    "discountType" TEXT,
    "percentage" DECIMAL(5,2),
    "minOrderAmount" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "termsCondition" TEXT,
    "featuredProducts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
