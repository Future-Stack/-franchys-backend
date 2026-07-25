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
      isDeleted: false,
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

/** Creates a Category row. */
export async function seedCategory(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.category.create({
    data: {
      name: `Test Category ${uid()}`,
      description: 'Test Category Description',
      ...overrides,
    },
  });
}

/** Creates a Brand row. */
export async function seedBrand(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.brand.create({
    data: {
      name: `Test Brand ${uid()}`,
      description: 'Test Brand Description',
      ...overrides,
    },
  });
}

/** Creates a Product row with nested Brand if none provided. */
export async function seedProduct(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  let brandId = overrides.brandId as string | undefined;
  if (!brandId) {
    const brand = await seedBrand(prisma);
    brandId = brand.id;
  }

  return prisma.product.create({
    data: {
      productName: `Test Product ${uid()}`,
      itemNo: `ITEM-${uid()}`,
      price: 29.99,
      brandId,
      ...overrides,
    } as any, // Cast to any to make overrides simple
  });
}

/** Creates a Vendors row. */
export async function seedVendor(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.vendors.create({
    data: {
      companyName: `Test Company ${uid()}`,
      contactName: 'Test Contact',
      email: `test-vendor-${uid()}@example.com`,
      phone: '5551112222',
      fax: '5551112223',
      accountNumber: `ACC-${uid()}`,
      mainAddress: '123 Vendor Lane',
      city: 'Vendor City',
      state: 'VS',
      country: 'USA',
      zip: '12345',
      ...overrides,
    },
  });
}

/** Creates an InvoiceFees row. */
export async function seedInvoiceFee(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.invoiceFees.create({
    data: {
      feeName: `Test Fee ${uid()}`,
      amount: 15,
      isTax: false,
      isDefaultAutoAdd: false,
      ...overrides,
    },
  });
}

/** Creates an InvoiceInformation row. */
export async function seedInvoiceInformation(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.invoiceInformation.create({
    data: {
      currency: 'USD',
      language: 'English',
      termsAndCondition: 'Default Terms and Conditions',
      paymentTramsAndCondition: 'Default Payment Terms and Conditions',
      invoiceTaxRate: 10,
      invoiceSeed: 100,
      ...overrides,
    },
  });
}

/** Creates a PriceMatrix row. */
export async function seedPriceMatrix(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.priceMatrix.create({
    data: {
      name: `Test Matrix ${uid()}`,
      priceType: 'markup',
      ...overrides,
    },
  });
}

/** Creates a PriceTier row. */
export async function seedPriceTier(
  prisma: PrismaClient,
  priceMatrixId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.priceTier.create({
    data: {
      quantity: 50,
      basePrice: 5.5,
      markup: 1.5,
      priceMatrixId,
      ...overrides,
    },
  });
}

/** Creates a ShopInformation row. */
export async function seedShopInformation(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.shopInformation.create({
    data: {
      shopIdentifier: `shop-${uid()}`,
      companyName: 'Test Shop LLC',
      companyEmail: 'info@testshop.com',
      ...overrides,
    },
  });
}

/** Creates a WhatsAppContact row. */
export async function seedWhatsAppContact(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.whatsAppContact.create({
    data: {
      phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
      name: `WA Contact ${uid()}`,
      ...overrides,
    },
  });
}

/** Creates a WhatsAppConversation row. */
export async function seedWhatsAppConversation(
  prisma: PrismaClient,
  contactId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.whatsAppConversation.create({
    data: {
      contactId,
      ...overrides,
    },
  });
}

/** Creates a WhatsAppMessage row. */
export async function seedWhatsAppMessage(
  prisma: PrismaClient,
  conversationId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.whatsAppMessage.create({
    data: {
      conversationId,
      direction: 'INBOUND',
      from: '+8801700000000',
      to: '123456789',
      body: 'Test WhatsApp message body',
      messageId: `wamid.HBgL${uid()}`,
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
    brandIds?: string[];
    categoryIds?: string[];
    productIds?: string[];
    vendorIds?: string[];
    invoiceFeeIds?: string[];
    invoiceInformationIds?: string[];
    priceMatrixIds?: string[];
    priceTierIds?: string[];
    shopInformationIds?: string[];
    whatsAppContactIds?: string[];
    whatsAppConversationIds?: string[];
    whatsAppMessageIds?: string[];
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
  if (ids.productIds?.length) {
    await prisma.productColor.deleteMany({
      where: { productId: { in: ids.productIds } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: ids.productIds } },
    });
  }
  if (ids.categoryIds?.length && (prisma as any).category) {
    await (prisma as any).category.deleteMany({
      where: { id: { in: ids.categoryIds } },
    });
  }
  if (ids.brandIds?.length) {
    await prisma.brand.deleteMany({
      where: { id: { in: ids.brandIds } },
    });
  }
  if (ids.vendorIds?.length) {
    await prisma.vendors.deleteMany({
      where: { vendorId: { in: ids.vendorIds } },
    });
  }
  if (ids.invoiceFeeIds?.length) {
    await prisma.invoiceFees.deleteMany({
      where: { infId: { in: ids.invoiceFeeIds } },
    });
  }
  if (ids.invoiceInformationIds?.length) {
    await prisma.invoiceInformation.deleteMany({
      where: { iniId: { in: ids.invoiceInformationIds } },
    });
  }
  if (ids.priceTierIds?.length) {
    await prisma.priceTier.deleteMany({
      where: { priceTierId: { in: ids.priceTierIds } },
    });
  }
  if (ids.priceMatrixIds?.length) {
    await prisma.priceMatrix.deleteMany({
      where: { priceMatrixId: { in: ids.priceMatrixIds } },
    });
  }
  if (ids.shopInformationIds?.length) {
    await prisma.shopInformation.deleteMany({
      where: { shopId: { in: ids.shopInformationIds } },
    });
  }
  if (ids.whatsAppMessageIds?.length) {
    await prisma.whatsAppMessage.deleteMany({
      where: { id: { in: ids.whatsAppMessageIds } },
    });
  }
  if (ids.whatsAppConversationIds?.length) {
    await prisma.whatsAppConversation.deleteMany({
      where: { id: { in: ids.whatsAppConversationIds } },
    });
  }
  if (ids.whatsAppContactIds?.length) {
    await prisma.whatsAppContact.deleteMany({
      where: { id: { in: ids.whatsAppContactIds } },
    });
  }
  if (ids.userIds?.length) {
    await prisma.userPermission.deleteMany({
      where: { userId: { in: ids.userIds } },
    });
    await prisma.user.deleteMany({ where: { userId: { in: ids.userIds } } });
  }
}
