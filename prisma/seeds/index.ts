import 'dotenv/config';
import {
  PrismaClient,
  Role,
  CustomerType,
  QuoteStatus,
  JobStatus,
  CampaignType,
  CampaignStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database with full relational test data...');

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password123';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // 1. Create / Get Super Admin
  let superAdmin = await prisma.user.findFirst({
    where: { email: superAdminEmail, role: Role.SUPER_ADMIN },
  });

  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: Role.SUPER_ADMIN,
      },
    });
    console.log(`Created super admin: ${superAdmin.email}`);
  }

  // 2. Create Customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'john@acme.com' },
    update: {},
    create: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      phone: '+1555123456',
      companyName: 'Acme Corp',
      customerType: CustomerType.BUSINESS,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'sarah@apexathletics.com' },
    update: {},
    create: {
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@apexathletics.com',
      phone: '+1555987654',
      companyName: 'Apex Athletics',
      customerType: CustomerType.BUSINESS,
    },
  });

  console.log('Created customers: Acme Corp, Apex Athletics');

  // 3. Create Sent Campaigns
  await prisma.campaign.createMany({
    data: [
      {
        title: 'Summer Apparel Special 2026',
        type: CampaignType.PROMOTION,
        status: CampaignStatus.SENT,
        recipientsCount: 250,
      },
      {
        title: 'Back to School Discount',
        type: CampaignType.DISCOUNT,
        status: CampaignStatus.SENT,
        recipientsCount: 180,
      },
      {
        title: 'Monthly Newsletter - Feb 2026',
        type: CampaignType.NEWSLETTER,
        status: CampaignStatus.SENT,
        recipientsCount: 500,
      },
    ],
  });
  console.log('Created 3 sent campaigns');

  // 4. Create Quotes across 6 months (Feb - Jul 2026)
  const quoteData = [
    {
      number: 'Q-2026-001',
      date: new Date('2026-02-15T10:00:00Z'),
      customer: customer1,
      subtotal: 3200,
      total: 3424,
      status: QuoteStatus.APPROVED,
      category: 'T-Shirts',
      qty: 160,
    },
    {
      number: 'Q-2026-002',
      date: new Date('2026-03-10T10:00:00Z'),
      customer: customer2,
      subtotal: 4500,
      total: 4815,
      status: QuoteStatus.APPROVED,
      category: 'Hoodies & Sweatshirts',
      qty: 120,
    },
    {
      number: 'Q-2026-003',
      date: new Date('2026-04-18T10:00:00Z'),
      customer: customer1,
      subtotal: 2800,
      total: 2996,
      status: QuoteStatus.APPROVED,
      category: 'T-Shirts',
      qty: 140,
    },
    {
      number: 'Q-2026-004',
      date: new Date('2026-05-22T10:00:00Z'),
      customer: customer2,
      subtotal: 5200,
      total: 5564,
      status: QuoteStatus.APPROVED,
      category: 'Hats & Caps',
      qty: 250,
    },
    {
      number: 'Q-2026-005',
      date: new Date('2026-06-12T10:00:00Z'),
      customer: customer1,
      subtotal: 6100,
      total: 6527,
      status: QuoteStatus.APPROVED,
      category: 'T-Shirts',
      qty: 300,
    },
    {
      number: 'Q-2026-006',
      date: new Date('2026-07-05T10:00:00Z'),
      customer: customer2,
      subtotal: 7500,
      total: 8025,
      status: QuoteStatus.APPROVED,
      category: 'Hoodies & Sweatshirts',
      qty: 200,
    },
    {
      number: 'Q-2026-007',
      date: new Date('2026-07-20T10:00:00Z'),
      customer: customer1,
      subtotal: 1500,
      total: 1605,
      status: QuoteStatus.DRAFT,
      category: 'Polos',
      qty: 50,
    },
  ];

  for (const q of quoteData) {
    const quote = await prisma.quote.upsert({
      where: { quoteNumber: q.number },
      update: {
        status: q.status,
        subtotal: q.subtotal,
        total: q.total,
        createdAt: q.date,
      },
      create: {
        quoteNumber: q.number,
        customerId: q.customer.id,
        repId: superAdmin.userId,
        status: q.status,
        subtotal: q.subtotal,
        taxRate: 7.0,
        taxAmount: q.subtotal * 0.07,
        total: q.total,
        createdAt: q.date,
        lineItems: {
          create: [
            {
              groupName: 'Group 1',
              category: q.category,
              description: `Custom ${q.category} Order`,
              itemsCount: q.qty,
              total: q.subtotal,
              sizeBreakdown: { sizeAdultM: q.qty },
            },
          ],
        },
      },
    });

    // 5. Create Active Jobs for approved quotes
    if (q.status === QuoteStatus.APPROVED) {
      await prisma.job.upsert({
        where: { jobId: q.number },
        update: {},
        create: {
          jobId: q.number,
          clientName:
            q.customer.companyName ||
            `${q.customer.firstName} ${q.customer.lastName}`,
          description: `Production for ${q.category}`,
          status: JobStatus.PRODUCTION,
          dueDate: new Date(q.date.getTime() + 14 * 24 * 60 * 60 * 1000),
          amount: q.total,
          quoteId: quote.id,
        },
      });
    }
  }

  console.log('Created quotes, line items, and active jobs');
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
