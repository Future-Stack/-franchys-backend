import 'dotenv/config';
import { PrismaClient, Role, Status, AdminRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password123';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // Create Super Admin if it doesn't exist
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: superAdminEmail, role: Role.SUPER_ADMIN },
  });

  if (!existingSuperAdmin) {
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: Role.SUPER_ADMIN,
      },
    });
    console.log(`Created super admin: ${superAdmin.email}`);
  } else {
    console.log('Super admin already exists, skipping seed.');
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
