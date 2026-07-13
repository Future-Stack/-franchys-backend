import { PrismaClient, CustomerType } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Creates a PrismaClient connected to the test database via DATABASE_URL.
 * Call this inside beforeAll() in integration specs.
 */
export function createTestPrisma(): PrismaClient {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────
// Each helper generates unique identifiers so tests don't collide on unique constraints.

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Creates a Customer row. `customerType` defaults to PERSONAL. */
export async function seedCustomer(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.customer.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: `test-cust-${uid()}@example.com`,
      phone: '5550000000',
      customerType: CustomerType.PERSONAL,
      ...overrides,
    },
  });
}

/** Creates a User (rep/admin) row. */
export async function seedUser(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.user.create({
    data: {
      name: 'Test Rep',
      email: `test-rep-${uid()}@example.com`,
      password: '$2b$10$abcdefghijklmnopqrstuvuFakeHashedPassword',
      role: 'ADMIN',
      ...overrides,
    },
  });
}

/** Creates a Quote with one line item. Returns the quote with lineItems included. */
export async function seedQuote(
  prisma: PrismaClient,
  customerId: string,
  repId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.quote.create({
    data: {
      quoteNumber: `Q-TEST-${uid()}`,
      customerId,
      repId,
      status: 'DRAFT',
      subtotal: 440,
      discount: 0,
      taxRate: 7,
      taxAmount: 30.8,
      total: 470.8,
      lineItems: {
        create: [
          {
            groupName: 'Group 1',
            description: 'T-Shirt',
            itemsCount: 20,
            unitPrice: 20,
            markupPrice: 10,
            total: 440,
            isTaxed: false,
            imprintType: 'Screen Print',
          },
        ],
      },
      ...overrides,
    },
    include: { lineItems: true, customer: true },
  });
}

/** Creates a Campaign row. */
export async function seedCampaign(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.campaign.create({
    data: {
      title: `Test Campaign ${uid()}`,
      type: 'DISCOUNT',
      status: 'DRAFT',
      recipientsCount: 0,
      ...overrides,
    },
  });
}

/** Creates a Job row directly (bypassing service). */
export async function seedJob(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.job.create({
    data: {
      jobId: `Q-JOB-${uid()}`,
      clientName: 'Acme Corp',
      description: 'T-Shirts (20 units)',
      status: 'QUOTE',
      dueDate: new Date('2026-12-01'),
      amount: 470.8,
      ...overrides,
    },
  });
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Deletes rows in correct FK order. Pass IDs that were created during the test.
 * This is the standard teardown pattern when transaction rollback is not used.
 */
export async function cleanupTest(
  prisma: PrismaClient,
  ids: {
    jobIds?: string[];
    quoteIds?: string[];
    campaignIds?: string[];
    customerIds?: string[];
    userIds?: string[];
    permissionIds?: string[];
  },
) {
  if (ids.jobIds?.length) {
    await prisma.job.deleteMany({ where: { id: { in: ids.jobIds } } });
  }
  if (ids.quoteIds?.length) {
    await prisma.quoteLineItem.deleteMany({
      where: { quoteId: { in: ids.quoteIds } },
    });
    await prisma.quote.deleteMany({ where: { id: { in: ids.quoteIds } } });
  }
  if (ids.campaignIds?.length) {
    await prisma.campaign.deleteMany({
      where: { id: { in: ids.campaignIds } },
    });
  }
  if (ids.permissionIds?.length) {
    await prisma.userPermission.deleteMany({
      where: { userPermissionId: { in: ids.permissionIds } },
    });
  }
  if (ids.customerIds?.length) {
    await prisma.customer.deleteMany({
      where: { id: { in: ids.customerIds } },
    });
  }
  if (ids.userIds?.length) {
    await prisma.user.deleteMany({ where: { userId: { in: ids.userIds } } });
  }
}
