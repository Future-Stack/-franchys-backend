-- Add sentAt field to Quote for tracking last delivery timestamp
ALTER TABLE "Quote" ADD COLUMN "sentAt" TIMESTAMP(3);

-- Create enum types for QuoteDeliveryLog
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- Create QuoteDeliveryLog table
CREATE TABLE "QuoteDeliveryLog" (
    "id"        TEXT NOT NULL,
    "quoteId"   TEXT NOT NULL,
    "channel"   "DeliveryChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status"    "DeliveryStatus" NOT NULL,
    "method"    TEXT,
    "error"     TEXT,
    "sentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key from QuoteDeliveryLog to Quote
ALTER TABLE "QuoteDeliveryLog"
    ADD CONSTRAINT "QuoteDeliveryLog_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
