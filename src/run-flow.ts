// RUN COMMAND:
// npx ts-node -r tsconfig-paths/register src/run-flow.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QuoteService } from './modules/quote/quote.service';
import { CustomerInvoiceService } from './modules/invoice/customer-invoice.service';
import { PrismaService } from './prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const quoteService = app.get(QuoteService);
  const customerInvoiceService = app.get(CustomerInvoiceService);

  console.log('Cleaning up specific test payments and invoices...');
  const testInvoice = await prisma.customerInvoice.findFirst({
    where: { invoiceNumber: 'INV-1' }
  });
  if (testInvoice) {
    await prisma.payment.deleteMany({ where: { invoiceId: testInvoice.id } });
    await prisma.invoiceInstallment.deleteMany({ where: { invoiceId: testInvoice.id } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: testInvoice.id } });
    await prisma.customerInvoice.delete({ where: { id: testInvoice.id } });
    console.log('Test payments and invoices for INV-1 cleaned up.');
  }

  // Find customer mypcmail093@gmail.com
  console.log('Finding customer mypcmail093@gmail.com in DB...');
  const customer = await prisma.customer.findUnique({
    where: { email: 'mypcmail093@gmail.com' },
  });
  if (!customer) {
    throw new Error('Customer with email mypcmail093@gmail.com not found in the database! Please create them first.');
  }
  console.log(`Customer found. ID: ${customer.id}`);

  // Find rep user
  const repUser = await prisma.user.findFirst();
  if (!repUser) {
    throw new Error('No rep user found in DB!');
  }
  console.log(`Rep User ID: ${repUser.userId}`);

  // Find or create payment term
  console.log('Finding or creating payment term...');
  let paymentTerm = await prisma.paymentTerm.findFirst({
    where: {
      name: '50% now + 50% net 30',
      depositPercent: 50.00,
      paymentDaysAllowed: 30,
      isArchived: false,
    },
  });
  if (!paymentTerm) {
    paymentTerm = await prisma.paymentTerm.create({
      data: {
        name: '50% now + 50% net 30',
        depositPercent: 50.00,
        paymentDaysAllowed: 30,
        dueDateStrategy: 'FROM_INVOICE_DATE',
        isArchived: false,
      },
    });
  }
  console.log(`Payment Term ID: ${paymentTerm.id}`);

  // Create Quote in DRAFT
  console.log('Creating Quote...');
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });
  let quoteNumber = 'Q-1001';
  if (lastQuote && lastQuote.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/^Q-(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      quoteNumber = `Q-${nextNum}`;
    }
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      customerId: customer.id,
      repId: repUser.userId,
      status: 'DRAFT',
      subtotal: 1000.00,
      discount: 0,
      taxRate: 7.0,
      taxAmount: 70.00,
      total: 1070.00,
      lineItems: {
        create: [
          {
            description: 'Custom Work Order',
            unitPrice: 1000.00,
            total: 1000.00,
            groupName: 'Group 1',
            category: 'T-Shirts',
            itemsCount: 1,
          },
        ],
      },
    },
  });
  console.log(`Quote ID: ${quote.id}`);

  // Transition Quote to APPROVED
  console.log('Approving Quote...');
  const user = { userId: repUser.userId, email: repUser.email, role: (repUser as any).role || 'ADMIN' };
  await quoteService.updateStatusWithPermissionCheck(quote.id, 'APPROVED', user);
  console.log('Quote approved.');

  // Find generated Draft Invoice
  const invoice = await prisma.customerInvoice.findFirst({
    where: { quoteId: quote.id },
  });
  if (!invoice) {
    throw new Error('Draft Invoice was not auto-created!');
  }
  console.log(`Draft Invoice ID: ${invoice.id}`);

  // Update Invoice with Payment Term
  console.log('Updating Invoice with Payment Term...');
  await customerInvoiceService.update(invoice.id, {
    paymentTermId: paymentTerm.id,
  });
  console.log('Invoice updated with payment term.');

  // Send Invoice
  console.log('Sending Invoice (generating Stripe customer, invoices, installments)...');
  await customerInvoiceService.sendInvoice(invoice.id, { sendEmail: true, sendWhatsApp: false });
  console.log('Invoice sent successfully.');

  console.log('====================================');
  console.log('FLOW EXECUTED SUCCESSFULLY');
  console.log(`Customer Email: mypcmail093@gmail.com`);
  console.log(`Customer ID: ${customer.id}`);
  console.log(`Payment Term ID: ${paymentTerm.id}`);
  console.log(`Quote ID: ${quote.id}`);
  console.log(`Invoice ID: ${invoice.id}`);
  console.log('====================================');

  await app.close();
}

main().catch(console.error);
