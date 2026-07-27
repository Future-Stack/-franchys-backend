-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'SENT', 'PAID', 'OVERDUE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceInformation" ADD COLUMN     "deliveryPolicy" TEXT,
ADD COLUMN     "invoiceCommentary" TEXT,
ADD COLUMN     "invoicePrivacy" TEXT NOT NULL DEFAULT 'ANYONE_WITH_LINK',
ADD COLUMN     "makeImprintsVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "printingLayout" TEXT NOT NULL DEFAULT 'PORTRAIT',
ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "showPoNumber" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTotalQuantity" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "paymentTramsAndCondition" DROP NOT NULL,
ALTER COLUMN "invoiceTaxRate" SET DEFAULT 7.00,
ALTER COLUMN "invoiceTaxRate" SET DATA TYPE DECIMAL(5,2);

-- CreateTable
CREATE TABLE "CustomerInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "paymentTermId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeInvoiceId" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 7.00,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceInstallment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "percentAmount" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeEventId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paymentDaysAllowed" INTEGER NOT NULL DEFAULT 1,
    "depositPercent" DECIMAL(5,2),
    "dueDateStrategy" TEXT NOT NULL DEFAULT 'FROM_INVOICE_DATE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_invoiceNumber_key" ON "CustomerInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_stripeInvoiceId_key" ON "CustomerInvoice"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInstallment_stripeInvoiceId_key" ON "InvoiceInstallment"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInstallment_invoiceId_installmentNumber_key" ON "InvoiceInstallment"("invoiceId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "PaymentTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceInstallment" ADD CONSTRAINT "InvoiceInstallment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
