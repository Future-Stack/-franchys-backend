import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing all email and WhatsApp tracking data...');
  
  // 1. Clear Email tracking tables
  const msgDel = await prisma.message.deleteMany({});
  const threadDel = await prisma.thread.deleteMany({});
  const contactDel = await prisma.contact.deleteMany({});

  // 2. Clear WhatsApp tracking tables
  const waMsgDel = await prisma.whatsAppMessage.deleteMany({});
  const waConvDel = await prisma.whatsAppConversation.deleteMany({});
  const waContactDel = await prisma.whatsAppContact.deleteMany({});

  console.log('✅ All tracking data cleared successfully!');
  console.log(`Deleted Emails: ${msgDel.count} Messages, ${threadDel.count} Threads, ${contactDel.count} Contacts.`);
  console.log(`Deleted WhatsApp: ${waMsgDel.count} Messages, ${waConvDel.count} Conversations, ${waContactDel.count} Contacts.`);
}

main()
  .catch((e) => {
    console.error('Failed to clear database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
