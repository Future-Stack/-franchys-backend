import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface MatrixDefinition {
  name: string;
  priceType: string;
  columns: string[];
  priceTiers: Array<{
    quantity: number;
    basePrice: number;
    markup: number;
    columnPrices: Record<string, number>;
  }>;
}

const matricesToSeed: MatrixDefinition[] = [
  // 1. Existing DTF Matrix
  {
    name: 'Apparel_DTF - Full (11x11)',
    priceType: 'percentage',
    columns: ['11x11'],
    priceTiers: [
      { quantity: 4, basePrice: 0, markup: 250, columnPrices: { '11x11': 9 } },
      { quantity: 14, basePrice: 0, markup: 225, columnPrices: { '11x11': 7 } },
      { quantity: 16, basePrice: 0, markup: 225, columnPrices: { '11x11': 7 } },
      { quantity: 20, basePrice: 0, markup: 225, columnPrices: { '11x11': 7 } },
      { quantity: 30, basePrice: 0, markup: 200, columnPrices: { '11x11': 7 } },
      { quantity: 40, basePrice: 0, markup: 200, columnPrices: { '11x11': 6 } },
    ],
  },

  // 2. Apparel Screen Printing - Individual Pricing (1 to 8 Colors)
  {
    name: 'Apparel Screen Printing (Individual Pricing)',
    priceType: 'individual',
    columns: [
      '1 Color',
      '2 Colors',
      '3 Colors',
      '4 Colors',
      '5 Colors',
      '6 Colors',
      '7 Colors',
      '8 Colors',
    ],
    priceTiers: [
      {
        quantity: 1,
        basePrice: 0,
        markup: 200,
        columnPrices: {
          '1 Color': 5.5,
          '2 Colors': 7.0,
          '3 Colors': 8.5,
          '4 Colors': 10.0,
          '5 Colors': 11.5,
          '6 Colors': 13.0,
          '7 Colors': 14.5,
          '8 Colors': 16.0,
        },
      },
      {
        quantity: 12,
        basePrice: 0,
        markup: 190,
        columnPrices: {
          '1 Color': 3.25,
          '2 Colors': 4.5,
          '3 Colors': 5.75,
          '4 Colors': 7.0,
          '5 Colors': 8.25,
          '6 Colors': 9.5,
          '7 Colors': 10.75,
          '8 Colors': 12.0,
        },
      },
      {
        quantity: 24,
        basePrice: 0,
        markup: 185,
        columnPrices: {
          '1 Color': 2.5,
          '2 Colors': 3.5,
          '3 Colors': 4.5,
          '4 Colors': 5.5,
          '5 Colors': 6.5,
          '6 Colors': 7.5,
          '7 Colors': 8.5,
          '8 Colors': 9.5,
        },
      },
      {
        quantity: 36,
        basePrice: 0,
        markup: 180,
        columnPrices: {
          '1 Color': 2.0,
          '2 Colors': 2.75,
          '3 Colors': 3.5,
          '4 Colors': 4.25,
          '5 Colors': 5.0,
          '6 Colors': 5.75,
          '7 Colors': 6.5,
          '8 Colors': 7.25,
        },
      },
      {
        quantity: 72,
        basePrice: 0,
        markup: 175,
        columnPrices: {
          '1 Color': 1.6,
          '2 Colors': 2.2,
          '3 Colors': 2.8,
          '4 Colors': 3.4,
          '5 Colors': 4.0,
          '6 Colors': 4.6,
          '7 Colors': 5.2,
          '8 Colors': 5.8,
        },
      },
      {
        quantity: 144,
        basePrice: 0,
        markup: 170,
        columnPrices: {
          '1 Color': 1.35,
          '2 Colors': 1.85,
          '3 Colors': 2.35,
          '4 Colors': 2.85,
          '5 Colors': 3.35,
          '6 Colors': 3.85,
          '7 Colors': 4.35,
          '8 Colors': 4.85,
        },
      },
      {
        quantity: 576,
        basePrice: 0,
        markup: 160,
        columnPrices: {
          '1 Color': 1.1,
          '2 Colors': 1.5,
          '3 Colors': 1.9,
          '4 Colors': 2.3,
          '5 Colors': 2.7,
          '6 Colors': 3.1,
          '7 Colors': 3.5,
          '8 Colors': 3.9,
        },
      },
      {
        quantity: 1200,
        basePrice: 0,
        markup: 150,
        columnPrices: {
          '1 Color': 0.95,
          '2 Colors': 1.25,
          '3 Colors': 1.55,
          '4 Colors': 1.85,
          '5 Colors': 2.15,
          '6 Colors': 2.45,
          '7 Colors': 2.75,
          '8 Colors': 3.05,
        },
      },
    ],
  },

  // 3. Apparel Screen Printing - Dozen Pricing
  {
    name: 'Apparel Screen Printing (Dozen Pricing)',
    priceType: 'dozen',
    columns: [
      '1 Color',
      '2 Colors',
      '3 Colors',
      '4 Colors',
      '5 Colors',
      '6 Colors',
    ],
    priceTiers: [
      {
        quantity: 12,
        basePrice: 0,
        markup: 180,
        columnPrices: {
          '1 Color': 3.0,
          '2 Colors': 4.25,
          '3 Colors': 5.5,
          '4 Colors': 6.75,
          '5 Colors': 8.0,
          '6 Colors': 9.25,
        },
      },
      {
        quantity: 36,
        basePrice: 0,
        markup: 170,
        columnPrices: {
          '1 Color': 2.2,
          '2 Colors': 3.1,
          '3 Colors': 4.0,
          '4 Colors': 4.9,
          '5 Colors': 5.8,
          '6 Colors': 6.7,
        },
      },
      {
        quantity: 72,
        basePrice: 0,
        markup: 160,
        columnPrices: {
          '1 Color': 1.75,
          '2 Colors': 2.45,
          '3 Colors': 3.15,
          '4 Colors': 3.85,
          '5 Colors': 4.55,
          '6 Colors': 5.25,
        },
      },
      {
        quantity: 144,
        basePrice: 0,
        markup: 150,
        columnPrices: {
          '1 Color': 1.4,
          '2 Colors': 1.95,
          '3 Colors': 2.5,
          '4 Colors': 3.05,
          '5 Colors': 3.6,
          '6 Colors': 4.15,
        },
      },
      {
        quantity: 288,
        basePrice: 0,
        markup: 140,
        columnPrices: {
          '1 Color': 1.15,
          '2 Colors': 1.6,
          '3 Colors': 2.05,
          '4 Colors': 2.5,
          '5 Colors': 2.95,
          '6 Colors': 3.4,
        },
      },
      {
        quantity: 576,
        basePrice: 0,
        markup: 130,
        columnPrices: {
          '1 Color': 0.95,
          '2 Colors': 1.3,
          '3 Colors': 1.65,
          '4 Colors': 2.0,
          '5 Colors': 2.35,
          '6 Colors': 2.7,
        },
      },
    ],
  },

  // 4. Apparel Screen Printing - Case Pricing
  {
    name: 'Apparel Screen Printing (Case Pricing)',
    priceType: 'case',
    columns: [
      '1 Color',
      '2 Colors',
      '3 Colors',
      '4 Colors',
      '5 Colors',
      '6 Colors',
    ],
    priceTiers: [
      {
        quantity: 72,
        basePrice: 0,
        markup: 160,
        columnPrices: {
          '1 Color': 1.5,
          '2 Colors': 2.1,
          '3 Colors': 2.7,
          '4 Colors': 3.3,
          '5 Colors': 3.9,
          '6 Colors': 4.5,
        },
      },
      {
        quantity: 144,
        basePrice: 0,
        markup: 150,
        columnPrices: {
          '1 Color': 1.25,
          '2 Colors': 1.75,
          '3 Colors': 2.25,
          '4 Colors': 2.75,
          '5 Colors': 3.25,
          '6 Colors': 3.75,
        },
      },
      {
        quantity: 288,
        basePrice: 0,
        markup: 140,
        columnPrices: {
          '1 Color': 1.05,
          '2 Colors': 1.45,
          '3 Colors': 1.85,
          '4 Colors': 2.25,
          '5 Colors': 2.65,
          '6 Colors': 3.05,
        },
      },
      {
        quantity: 576,
        basePrice: 0,
        markup: 130,
        columnPrices: {
          '1 Color': 0.85,
          '2 Colors': 1.15,
          '3 Colors': 1.45,
          '4 Colors': 1.75,
          '5 Colors': 2.05,
          '6 Colors': 2.35,
        },
      },
      {
        quantity: 1200,
        basePrice: 0,
        markup: 120,
        columnPrices: {
          '1 Color': 0.75,
          '2 Colors': 0.98,
          '3 Colors': 1.22,
          '4 Colors': 1.45,
          '5 Colors': 1.68,
          '6 Colors': 1.92,
        },
      },
    ],
  },
];

async function seedAllPriceMatrices() {
  console.log('🌱 Seeding Price Matrices dummy data...\n');

  for (const item of matricesToSeed) {
    let matrix = await prisma.priceMatrix.findFirst({
      where: { name: item.name },
    });

    if (matrix) {
      const existingId = matrix.priceMatrixId;
      console.log(
        `ℹ️ Updating existing matrix: "${item.name}" (ID: ${existingId})`,
      );

      // Update matrix properties
      await prisma.priceMatrix.update({
        where: { priceMatrixId: existingId },
        data: {
          priceType: item.priceType,
          columns: item.columns,
        },
      });

      // Clear & re-seed tiers
      await prisma.priceTier.deleteMany({
        where: { priceMatrixId: existingId },
      });

      await prisma.priceTier.createMany({
        data: item.priceTiers.map((tier) => ({
          ...tier,
          priceMatrixId: existingId,
        })),
      });
    } else {
      matrix = await prisma.priceMatrix.create({
        data: {
          name: item.name,
          priceType: item.priceType,
          columns: item.columns,
          priceTiers: {
            create: item.priceTiers,
          },
        },
      });
      console.log(
        `✅ Created matrix: "${item.name}" (ID: ${matrix.priceMatrixId})`,
      );
    }
  }

  const allMatrices = await prisma.priceMatrix.findMany({
    include: {
      priceTiers: {
        orderBy: { quantity: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\n🎉 Successfully seeded ${allMatrices.length} Price Matrices!`);
  console.log(
    allMatrices.map((m) => ({
      priceMatrixId: m.priceMatrixId,
      name: m.name,
      priceType: m.priceType,
      columnsCount: m.columns.length,
      tiersCount: m.priceTiers.length,
    })),
  );
}

seedAllPriceMatrices()
  .catch((err) => {
    console.error('❌ Error seeding price matrices:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
