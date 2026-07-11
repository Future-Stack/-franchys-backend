-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('BUSINESS', 'PERSONAL');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "language" TEXT,
    "website" TEXT,
    "companyName" TEXT,
    "taxId" TEXT,
    "secondaryEmail" TEXT,
    "secondaryPhone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "customerType" "CustomerType" NOT NULL,
    "orderPurpose" TEXT,
    "eventType" TEXT,
    "eventDate" TIMESTAMP(3),
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "itemNo" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "material" TEXT,
    "weight" DOUBLE PRECISION,
    "style" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availableSizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "userPermissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canCreateCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canCreateQuotes" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateQuotes" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteQuotes" BOOLEAN NOT NULL DEFAULT false,
    "canApproveQuotes" BOOLEAN NOT NULL DEFAULT false,
    "canCreateJobs" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateJobs" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteJobs" BOOLEAN NOT NULL DEFAULT false,
    "canCreateProducts" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateProducts" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteProducts" BOOLEAN NOT NULL DEFAULT false,
    "canCreateUsers" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateUsers" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteUsers" BOOLEAN NOT NULL DEFAULT false,
    "canCreateInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canApproveInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canTakePayment" BOOLEAN NOT NULL DEFAULT false,
    "canCreateInvoiceFees" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateInvoiceFees" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteInvoiceFees" BOOLEAN NOT NULL DEFAULT false,
    "canChangeInvoiceInformation" BOOLEAN NOT NULL DEFAULT false,
    "canChangeShopInformation" BOOLEAN NOT NULL DEFAULT false,
    "canCreateVendor" BOOLEAN NOT NULL DEFAULT false,
    "canUpdateVendor" BOOLEAN NOT NULL DEFAULT false,
    "canDeleteVendor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userPermissionId")
);

-- CreateTable
CREATE TABLE "Vendors" (
    "vendorId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fax" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "mainAddress" TEXT NOT NULL,
    "optionalAddress" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendors_pkey" PRIMARY KEY ("vendorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_itemNo_key" ON "Product"("itemNo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductColor_productId_name_key" ON "ProductColor"("productId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_key" ON "UserPermission"("userId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
