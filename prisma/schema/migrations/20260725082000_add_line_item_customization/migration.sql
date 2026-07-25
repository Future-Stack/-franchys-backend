-- CreateTable
CREATE TABLE "LineItemCustomization" (
    "id" TEXT NOT NULL,
    "showQuantity" BOOLEAN NOT NULL DEFAULT true,
    "showItemNumber" BOOLEAN NOT NULL DEFAULT false,
    "showCategory" BOOLEAN NOT NULL DEFAULT false,
    "showDescription" BOOLEAN NOT NULL DEFAULT true,
    "showColor" BOOLEAN NOT NULL DEFAULT false,
    "showMarkup" BOOLEAN NOT NULL DEFAULT false,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,

    "sizeAdultXS" BOOLEAN NOT NULL DEFAULT false,
    "sizeAdultS" BOOLEAN NOT NULL DEFAULT true,
    "sizeAdultM" BOOLEAN NOT NULL DEFAULT true,
    "sizeAdultL" BOOLEAN NOT NULL DEFAULT true,
    "sizeAdultXL" BOOLEAN NOT NULL DEFAULT true,
    "sizeAdult2XL" BOOLEAN NOT NULL DEFAULT false,
    "sizeAdult3XL" BOOLEAN NOT NULL DEFAULT false,
    "sizeAdult4XL" BOOLEAN NOT NULL DEFAULT false,

    "sizeYouthXS" BOOLEAN NOT NULL DEFAULT false,
    "sizeYouthS" BOOLEAN NOT NULL DEFAULT false,
    "sizeYouthM" BOOLEAN NOT NULL DEFAULT false,
    "sizeYouthL" BOOLEAN NOT NULL DEFAULT false,
    "sizeYouthXL" BOOLEAN NOT NULL DEFAULT false,

    "sizeToddler2T" BOOLEAN NOT NULL DEFAULT false,
    "sizeToddler3T" BOOLEAN NOT NULL DEFAULT false,
    "sizeToddler4T" BOOLEAN NOT NULL DEFAULT false,
    "sizeToddler5T" BOOLEAN NOT NULL DEFAULT false,
    "sizeToddler6T" BOOLEAN NOT NULL DEFAULT false,

    "sizeBabyNewborn" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby3Months" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby6Months" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby9Months" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby12Months" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby18Months" BOOLEAN NOT NULL DEFAULT false,
    "sizeBaby24Months" BOOLEAN NOT NULL DEFAULT false,

    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItemCustomization_pkey" PRIMARY KEY ("id")
);
