import * as dotenv from 'dotenv';
import * as path from 'path';

// Runs once before all integration test suites.
// Loads .env.test so DATABASE_URL points to the Neon test DB.
export default async function globalSetup() {
  dotenv.config({
    path: path.resolve(__dirname, '../../.env.test'),
    override: true,
  });
  console.log(
    '\n🧪  Integration test DB:',
    process.env.DATABASE_URL?.split('@')[1],
  );

  // Clean up all tables to ensure a fresh, conflict-free test run
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createTestPrisma } =
    require('./test-helpers') as typeof import('./test-helpers');
  const prisma = createTestPrisma();
  try {
    // Delete all rows in order
    await prisma.job.deleteMany({});
    await prisma.quoteLineItem.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.userPermission.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🧹 Test database cleaned successfully.');
  } catch (error) {
    console.error('⚠️ Failed to clean test database:', error);
  } finally {
    await prisma.$disconnect();
  }
}
