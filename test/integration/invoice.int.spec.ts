import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InvoiceService } from 'src/modules/invoice/invoice.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  cleanupTest,
  seedInvoiceFee,
  seedInvoiceInformation,
} from '../setup/test-helpers';

describe('InvoiceService (integration)', () => {
  let module: TestingModule;
  let service: InvoiceService;
  let prisma: PrismaClient;
  const invoiceFeeIds: string[] = [];
  const invoiceInformationIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { invoiceFeeIds, invoiceInformationIds });
    invoiceFeeIds.length = 0;
    invoiceInformationIds.length = 0;
  });

  describe('Invoice Fees APIs', () => {
    it('should create and retrieve invoice fees from the database', async () => {
      const fee = await service.createFee({
        feeName: 'Design Fee',
        amount: 25,
        isTax: false,
        isDefaultAutoAdd: true,
      });
      invoiceFeeIds.push(fee.infId);

      expect(fee.infId).toBeDefined();
      expect(fee.feeName).toBe('Design Fee');

      const found = await service.findOneFee(fee.infId);
      expect(found.amount).toBe(25);
    });

    it('should throw NotFoundException on non-existent fee id', async () => {
      await expect(
        service.findOneFee('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update invoice fees successfully', async () => {
      const seeded = await seedInvoiceFee(prisma, { amount: 30 });
      invoiceFeeIds.push(seeded.infId);

      const updated = await service.updateFee(seeded.infId, { amount: 45 });
      expect(updated.amount).toBe(45);
    });

    it('should delete invoice fees successfully', async () => {
      const seeded = await seedInvoiceFee(prisma);
      invoiceFeeIds.push(seeded.infId);

      const result = await service.removeFee(seeded.infId);
      expect(result.infId).toBe(seeded.infId);

      await expect(service.findOneFee(seeded.infId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Invoice Information APIs', () => {
    it('should fetch and update invoice information settings', async () => {
      const seeded = await seedInvoiceInformation(prisma, { currency: 'CAD' });
      invoiceInformationIds.push(seeded.iniId);

      // Clean default seeded elements from onModuleInit to make findFirst retrieve this test case
      await prisma.invoiceInformation.deleteMany({
        where: { iniId: { not: seeded.iniId } },
      });

      const info = await service.getInformation();
      expect(info.currency).toBe('CAD');

      const updated = await service.updateInformation({
        currency: 'USD',
        invoiceTaxRate: 15,
      });
      expect(updated.currency).toBe('USD');
      expect(updated.invoiceTaxRate).toBe(15);
    });
  });
});
