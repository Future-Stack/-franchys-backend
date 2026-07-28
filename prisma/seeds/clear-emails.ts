import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Clearing previous email and thread data...');
  
  // Delete messages first, then threads, then contacts due to foreign keys
  const msgDel = await prisma.message.deleteMany({});
  const threadDel = await prisma.thread.deleteMany({});
  const contactDel = await prisma.contact.deleteMany({});

  console.log(`✅ Cleared database successfully!`);
  console.log(`Deleted: ${msgDel.count} Messages, ${threadDel.count} Threads, ${contactDel.count} Contacts.`);
}

main()
  .catch((e) => {
    console.error('Failed to clear email tables:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
