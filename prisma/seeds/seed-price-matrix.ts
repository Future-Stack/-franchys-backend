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
  // 1. Apparel_Screen Printing (Rhody)
  {
    name: 'Apparel_Screen Printing (Rhody)',
    priceType: 'individual',
    columns: ['1 color', '2 color', '3 color', '4 color', '5 color', '6 color'],
    priceTiers: [
      {
        quantity: 50,
        basePrice: 3.68,
        markup: 180.0,
        columnPrices: {
          '1 color': 3.68,
          '2 color': 5.33,
          '3 color': 6.98,
          '4 color': 8.63,
          '5 color': 10.05,
          '6 color': 11.63,
        },
      },
      {
        quantity: 100,
        basePrice: 2.93,
        markup: 180.0,
        columnPrices: {
          '1 color': 2.93,
          '2 color': 4.13,
          '3 color': 5.18,
          '4 color': 6.68,
          '5 color': 7.35,
          '6 color': 8.33,
        },
      },
      {
        quantity: 300,
        basePrice: 2.53,
        markup: 180.0,
        columnPrices: {
          '1 color': 2.53,
          '2 color': 3.18,
          '3 color': 3.9,
          '4 color': 4.63,
          '5 color': 5.35,
          '6 color': 6.23,
        },
      },
      {
        quantity: 700,
        basePrice: 2.3,
        markup: 180.0,
        columnPrices: {
          '1 color': 2.3,
          '2 color': 2.88,
          '3 color': 3.54,
          '4 color': 4.26,
          '5 color': 4.84,
          '6 color': 5.57,
        },
      },
      {
        quantity: 1000,
        basePrice: 2.21,
        markup: 180.0,
        columnPrices: {
          '1 color': 2.21,
          '2 color': 2.7,
          '3 color': 3.04,
          '4 color': 3.45,
          '5 color': 3.86,
          '6 color': 4.43,
        },
      },
      {
        quantity: 2500,
        basePrice: 2.12,
        markup: 180.0,
        columnPrices: {
          '1 color': 2.12,
          '2 color': 2.51,
          '3 color': 2.82,
          '4 color': 3.21,
          '5 color': 3.6,
          '6 color': 4.14,
        },
      },
    ],
  },

  // 2. Apparel_Stiches Count
  {
    name: 'Apparel_Stiches Count',
    priceType: 'percentage',
    columns: ['Pricex1000'],
    priceTiers: [
      {
        quantity: 1,
        basePrice: 1.5,
        markup: 250.0,
        columnPrices: {
          Pricex1000: 1.5,
        },
      },
      {
        quantity: 12,
        basePrice: 1.25,
        markup: 225.0,
        columnPrices: {
          Pricex1000: 1.25,
        },
      },
      {
        quantity: 36,
        basePrice: 0.8,
        markup: 200.0,
        columnPrices: {
          Pricex1000: 0.8,
        },
      },
      {
        quantity: 100,
        basePrice: 0.7,
        markup: 180.0,
        columnPrices: {
          Pricex1000: 0.7,
        },
      },
      {
        quantity: 499,
        basePrice: 0.55,
        markup: 150.0,
        columnPrices: {
          Pricex1000: 0.55,
        },
      },
      {
        quantity: 500,
        basePrice: 0.5,
        markup: 125.0,
        columnPrices: {
          Pricex1000: 0.5,
        },
      },
    ],
  },

  // 3. Paper_20LB text
  {
    name: 'Paper_20LB text',
    priceType: 'individual',
    columns: [
      'Flyer 1/4 (5.5x4.25) (8)',
      'Flyer 1/2 (5.5x8.5) (5x7) (6x4)',
      'Flyer Letter (8.5x11)(2)',
      'Flyer Tabloid (11x17)(1)',
    ],
    priceTiers: [
      {
        quantity: 100,
        basePrice: 1.43,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 1.43,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 1.48,
          'Flyer Letter (8.5x11)(2)': 1.5,
          'Flyer Tabloid (11x17)(1)': 1.6,
        },
      },
      {
        quantity: 250,
        basePrice: 0.59,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.59,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.61,
          'Flyer Letter (8.5x11)(2)': 0.66,
          'Flyer Tabloid (11x17)(1)': 0.76,
        },
      },
      {
        quantity: 500,
        basePrice: 0.31,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.31,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.33,
          'Flyer Letter (8.5x11)(2)': 0.39,
          'Flyer Tabloid (11x17)(1)': 0.5,
        },
      },
      {
        quantity: 1000,
        basePrice: 0.17,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.17,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.2,
          'Flyer Letter (8.5x11)(2)': 0.26,
          'Flyer Tabloid (11x17)(1)': 0.36,
        },
      },
      {
        quantity: 2500,
        basePrice: 0.08,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.08,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.11,
          'Flyer Letter (8.5x11)(2)': 0.17,
          'Flyer Tabloid (11x17)(1)': 0.28,
        },
      },
      {
        quantity: 5000,
        basePrice: 0.06,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.06,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.09,
          'Flyer Letter (8.5x11)(2)': 0.14,
          'Flyer Tabloid (11x17)(1)': 0.25,
        },
      },
    ],
  },

  // 4. Paper_16PT Cover
  {
    name: 'Paper_16PT Cover',
    priceType: 'individual',
    columns: [
      'Flyer 1/4 (5.5x4.25) (8)',
      'Flyer 1/2 (5.5x8.5) (5x7) (6x4)',
      'Flyer Letter (8.5x11)(2)',
      'Flyer Tabloid (11x17)(1)',
    ],
    priceTiers: [
      {
        quantity: 100,
        basePrice: 1.65,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 1.65,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 1.7,
          'Flyer Letter (8.5x11)(2)': 1.8,
          'Flyer Tabloid (11x17)(1)': 2.25,
        },
      },
      {
        quantity: 250,
        basePrice: 0.7,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.7,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.76,
          'Flyer Letter (8.5x11)(2)': 0.96,
          'Flyer Tabloid (11x17)(1)': 1.36,
        },
      },
      {
        quantity: 500,
        basePrice: 0.39,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.39,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.48,
          'Flyer Letter (8.5x11)(2)': 0.68,
          'Flyer Tabloid (11x17)(1)': 1.08,
        },
      },
      {
        quantity: 1000,
        basePrice: 0.24,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.24,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.34,
          'Flyer Letter (8.5x11)(2)': 0.54,
          'Flyer Tabloid (11x17)(1)': 0.94,
        },
      },
      {
        quantity: 2500,
        basePrice: 0.16,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.16,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.26,
          'Flyer Letter (8.5x11)(2)': 0.46,
          'Flyer Tabloid (11x17)(1)': 0.85,
        },
      },
      {
        quantity: 5000,
        basePrice: 0.13,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.13,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.23,
          'Flyer Letter (8.5x11)(2)': 0.43,
          'Flyer Tabloid (11x17)(1)': 0.69,
        },
      },
    ],
  },

  // 5. Paper_100LB TextGlossy
  {
    name: 'Paper_100LB TextGlossy',
    priceType: 'individual',
    columns: [
      'Flyer 1/4 (5.5x4.25) (8)',
      'Flyer 1/2 (5.5x8.5) (5x7) (6x4)',
      'Flyer Letter (8.5x11)(2)',
      'Flyer Tabloid (11x17)(1)',
    ],
    priceTiers: [
      {
        quantity: 100,
        basePrice: 1.55,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 1.55,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 1.6,
          'Flyer Letter (8.5x11)(2)': 1.65,
          'Flyer Tabloid (11x17)(1)': 1.75,
        },
      },
      {
        quantity: 250,
        basePrice: 0.68,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.68,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.7,
          'Flyer Letter (8.5x11)(2)': 0.72,
          'Flyer Tabloid (11x17)(1)': 0.9,
        },
      },
      {
        quantity: 500,
        basePrice: 0.35,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.35,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.37,
          'Flyer Letter (8.5x11)(2)': 0.45,
          'Flyer Tabloid (11x17)(1)': 0.6,
        },
      },
      {
        quantity: 1000,
        basePrice: 0.19,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.19,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.23,
          'Flyer Letter (8.5x11)(2)': 0.3,
          'Flyer Tabloid (11x17)(1)': 0.45,
        },
      },
      {
        quantity: 2500,
        basePrice: 0.09,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.09,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.14,
          'Flyer Letter (8.5x11)(2)': 0.21,
          'Flyer Tabloid (11x17)(1)': 0.37,
        },
      },
      {
        quantity: 5000,
        basePrice: 0.07,
        markup: 100.0,
        columnPrices: {
          'Flyer 1/4 (5.5x4.25) (8)': 0.07,
          'Flyer 1/2 (5.5x8.5) (5x7) (6x4)': 0.11,
          'Flyer Letter (8.5x11)(2)': 0.18,
          'Flyer Tabloid (11x17)(1)': 0.34,
        },
      },
    ],
  },
];

async function seedAllPriceMatrices() {
  console.log('🗑️  Clearing all existing Price Matrices and Price Tiers...\n');
  await prisma.priceTier.deleteMany({});
  await prisma.priceMatrix.deleteMany({});

  console.log('🌱 Seeding new Price Matrices data...\n');

  for (const item of matricesToSeed) {
    const matrix = await prisma.priceMatrix.create({
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
      `✅ Created matrix: "${item.name}" (ID: ${matrix.priceMatrixId}) with ${item.priceTiers.length} tiers`,
    );
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
