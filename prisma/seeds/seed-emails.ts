import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding mock email tracking data...');

  const clientEmail = 'elonmark2026@gmail.com';
  const myEmail = process.env.MAIL_USER || 'mypcmail093@gmail.com';

  // 1. Create or get Contact
  const contact = await prisma.contact.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      name: 'Elon Mark',
    },
  });

  // 2. Create Thread
  const thread = await prisma.thread.create({
    data: {
      subject: 'Invoice INV-2026-009 — Payment Due',
      contactId: contact.id,
      lastActivity: new Date(),
    },
  });

  // 3. Create Messages in order
  const messagesData = [
    {
      direction: 'OUTBOUND',
      from: `MAK SERVI Support <${myEmail}>`,
      to: clientEmail,
      body: JSON.stringify({
        type: 'QUOTE',
        quoteNumber: 'Q-1006',
        customerName: 'Elon Mark',
        total: '$1,250.00',
        dueDate: '15 Aug, 2026',
        quoteLink: 'https://coefficiently-vermiform-tatiana.ngrok-free.dev/quotes/Q-1006',
      }),
      messageId: '<quote-msg-id-1006@tprice.com>',
      createdAt: new Date(Date.now() - 3600000 * 24), // 24 hours ago
    },
    {
      direction: 'INBOUND',
      from: `Elon Mark <${clientEmail}>`,
      to: myEmail,
      body: 'Hi, thank you for the quote. I have reviewed the design details and they look great. Could you please send over the invoice for the 50% deposit so we can start production?',
      messageId: '<reply-msg-id-1006@gmail.com>',
      inReplyTo: '<quote-msg-id-1006@tprice.com>',
      createdAt: new Date(Date.now() - 3600000 * 23), // 23 hours ago
    },
    {
      direction: 'OUTBOUND',
      from: `MAK SERVI Support <${myEmail}>`,
      to: clientEmail,
      body: JSON.stringify({
        type: 'INVOICE',
        invoiceNumber: 'INV-2026-009',
        customerName: 'Elon Mark',
        total: '$1,250.00',
        amountDue: '$625.00',
        dueDate: '10 Aug, 2026',
        hostedInvoiceUrl: 'https://checkout.stripe.com/c/pay/cs_test_mock_link_123',
      }),
      messageId: '<invoice-msg-id-2026-009@tprice.com>',
      inReplyTo: '<reply-msg-id-1006@gmail.com>',
      createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    },
    {
      direction: 'INBOUND',
      from: `Elon Mark <${clientEmail}>`,
      to: myEmail,
      body: 'I have just completed the payment of $625.00 via Stripe. Looking forward to the delivery next week!',
      messageId: '<reply-msg-id-pay-2026-009@gmail.com>',
      inReplyTo: '<invoice-msg-id-2026-009@tprice.com>',
      createdAt: new Date(Date.now() - 3600000 * 1), // 1 hour ago
    },
    {
      direction: 'OUTBOUND',
      from: `MAK SERVI Support <${myEmail}>`,
      to: clientEmail,
      body: 'Awesome, thank you for the payment Elon! We have received the deposit and your order Q-1006 is officially in production. We will keep you updated on the progress.',
      messageId: '<reply-msg-id-confirm-1006@tprice.com>',
      inReplyTo: '<reply-msg-id-pay-2026-009@gmail.com>',
      createdAt: new Date(), // Just now
    },
  ];

  for (const msg of messagesData) {
    await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: msg.direction,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        messageId: msg.messageId,
        inReplyTo: msg.inReplyTo || null,
        createdAt: msg.createdAt,
      },
    });
  }

  console.log(`🌱 Seeded ${messagesData.length} messages in thread: "${thread.subject}" for contact ${clientEmail}`);
}

main()
  .catch((e) => {
    console.error('Failed to seed email data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
