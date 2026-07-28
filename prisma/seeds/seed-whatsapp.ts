import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing previous WhatsApp tracking data...');
  // Delete in foreign key order: Message -> Conversation -> Contact
  const msgDel = await prisma.whatsAppMessage.deleteMany({});
  const convDel = await prisma.whatsAppConversation.deleteMany({});
  const contactDel = await prisma.whatsAppContact.deleteMany({});
  console.log(`Deleted: ${msgDel.count} WhatsApp Messages, ${convDel.count} WhatsApp Conversations, ${contactDel.count} WhatsApp Contacts.`);

  console.log('🌱 Seeding mock WhatsApp tracking data...');

  const clientPhone = '+1555123456';
  const myPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '108005550199';

  // 1. Create WhatsApp Contact
  const contact = await prisma.whatsAppContact.create({
    data: {
      phone: clientPhone,
      name: 'Elon Mark',
    },
  });

  // 2. Create WhatsApp Conversation
  const conversation = await prisma.whatsAppConversation.create({
    data: {
      contactId: contact.id,
      lastActivity: new Date(),
    },
  });

  // 3. Seed messages
  const messagesData = [
    {
      direction: 'INBOUND',
      from: clientPhone,
      to: myPhoneId,
      body: 'Hello, I am interested in placing an order for custom printed t-shirts. Can you send me a quote?',
      messageId: 'wamid.HBgLMTU1NTEyMzQ1Ng==',
      type: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000 * 24), // 24h ago
    },
    {
      direction: 'OUTBOUND',
      from: myPhoneId,
      to: clientPhone,
      body: `[Template: quote_delivery] Hello Elon Mark! 👋\n\nYour quote *Q-1006* from MAK SERVI is ready for review.\n💰 Total: $1,250.00\n📅 Due: 15 Aug, 2026\n\nView your quote here:\nhttps://coefficiently-vermiform-tatiana.ngrok-free.dev/quotes/Q-1006\n\nReply to this message if you have any questions!`,
      messageId: 'wamid.HBgLMTU1NTEyMzQ1N2Fh',
      type: 'template',
      status: 'sent',
      createdAt: new Date(Date.now() - 3600000 * 23), // 23h ago
    },
    {
      direction: 'INBOUND',
      from: clientPhone,
      to: myPhoneId,
      body: 'This quote looks good. Please send the invoice so I can pay.',
      messageId: 'wamid.HBgLMTU1NTEyMzQ1Nzhh',
      type: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000 * 2), // 2h ago
    },
    {
      direction: 'OUTBOUND',
      from: myPhoneId,
      to: clientPhone,
      body: `Hi Elon Mark,\n\nYour invoice *INV-2026-009* is ready.\nAmount Due: *$625.00*\nTotal Invoice Amount: *$1,250.00* (Due: 10 Aug, 2026)\n\nPay securely here:\nhttps://checkout.stripe.com/c/pay/cs_test_mock_link_123\n\nThis link never expires. Contact us with any questions.`,
      messageId: 'wamid.HBgLMTU1NTEyMzQ1OTRh',
      type: 'text',
      status: 'sent',
      createdAt: new Date(Date.now() - 3600000 * 1), // 1h ago
    },
    {
      direction: 'INBOUND',
      from: clientPhone,
      to: myPhoneId,
      body: 'I have just completed the payment of $625.00 via Stripe. Looking forward to the delivery next week!',
      messageId: 'wamid.HBgLMTU1NTEyMzQ2MGFh',
      type: 'text',
      status: 'read',
      createdAt: new Date(), // Just now
    },
  ];

  for (const msg of messagesData) {
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: msg.direction,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        messageId: msg.messageId,
        type: msg.type,
        status: msg.status,
        createdAt: msg.createdAt,
      },
    });
  }

  console.log(`🌱 Seeded ${messagesData.length} WhatsApp messages for contact ${clientPhone}`);
}

main()
  .catch((e) => {
    console.error('Failed to seed WhatsApp data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
