import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedPriceMatrix() {
  console.log('🌱 Seeding Price Matrix dummy data...');

  const matrixName = 'Apparel_DTF - Full (11x11)';
  const columns = ['11x11'];
  const priceType = 'percentage';

  const tiersData = [
    {
      quantity: 4,
      basePrice: 0,
      markup: 250,
      columnPrices: { '11x11': 9 },
    },
    {
      quantity: 14,
      basePrice: 0,
      markup: 225,
      columnPrices: { '11x11': 7 },
    },
    {
      quantity: 16,
      basePrice: 0,
      markup: 225,
      columnPrices: { '11x11': 7 },
    },
    {
      quantity: 20,
      basePrice: 0,
      markup: 225,
      columnPrices: { '11x11': 7 },
    },
    {
      quantity: 30,
      basePrice: 0,
      markup: 200,
      columnPrices: { '11x11': 7 },
    },
    {
      quantity: 40,
      basePrice: 0,
      markup: 200,
      columnPrices: { '11x11': 6 },
    },
  ];

  // Check if a matrix with this name already exists
  let matrix = await prisma.priceMatrix.findFirst({
    where: { name: matrixName },
    include: { priceTiers: true },
  });

  if (matrix) {
    const existingId = matrix.priceMatrixId;
    console.log(
      `ℹ️ Price matrix "${matrixName}" already exists with ID: ${existingId}`,
    );
    console.log('Updating tiers to ensure clean matching data...');

    // Delete existing tiers and recreate fresh
    await prisma.priceTier.deleteMany({
      where: { priceMatrixId: existingId },
    });

    await prisma.priceTier.createMany({
      data: tiersData.map((tier) => ({
        ...tier,
        priceMatrixId: existingId,
      })),
    });
  } else {
    // Create new matrix with all nested tiers
    matrix = await prisma.priceMatrix.create({
      data: {
        name: matrixName,
        priceType,
        columns,
        priceTiers: {
          create: tiersData,
        },
      },
      include: {
        priceTiers: true,
      },
    });
    console.log(
      `✅ Created Price Matrix "${matrixName}" with ID: ${matrix.priceMatrixId}`,
    );
  }

  const matrixId = matrix.priceMatrixId;

  // Fetch and display complete matrix structure matching the API response
  const result = await prisma.priceMatrix.findUnique({
    where: { priceMatrixId: matrixId },
    include: {
      priceTiers: {
        orderBy: { quantity: 'asc' },
      },
    },
  });

  console.log('\n📦 Resulting Price Matrix:');
  console.log(JSON.stringify(result, null, 2));
}

seedPriceMatrix()
  .catch((err) => {
    console.error('❌ Error seeding price matrix:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
