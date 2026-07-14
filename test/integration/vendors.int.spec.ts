import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClient, VendorStatus } from '@prisma/client';
import { VendorsService } from 'src/modules/vendors/vendors.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  cleanupTest,
  seedVendor,
} from '../setup/test-helpers';

describe('VendorsService (integration)', () => {
  let module: TestingModule;
  let service: VendorsService;
  let prisma: PrismaClient;
  const vendorIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { vendorIds });
    vendorIds.length = 0;
  });

  describe('create', () => {
    it('should persist a vendor in the database', async () => {
      const companyName = `Vendor Corp-${Date.now()}`;
      const vendor = await service.create({
        companyName,
        contactName: 'Jane Contact',
        email: 'jane@vendorcorp.com',
        phone: '1112223333',
        fax: '1112223334',
        accountNumber: 'ACC-123',
        mainAddress: 'Main St 1',
        city: 'Dallas',
        state: 'TX',
        country: 'USA',
        zip: '75001',
      });

      vendorIds.push(vendor.vendorId);

      expect(vendor.vendorId).toBeDefined();
      expect(vendor.companyName).toBe(companyName);
      expect(vendor.status).toBe(VendorStatus.ACTIVE);
      expect(vendor.isDeleted).toBe(false);

      const dbVendor = await prisma.vendors.findUnique({
        where: { vendorId: vendor.vendorId },
      });
      expect(dbVendor).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return only non-deleted vendors', async () => {
      const v1 = await seedVendor(prisma, { isDeleted: false });
      const v2 = await seedVendor(prisma, { isDeleted: true });
      vendorIds.push(v1.vendorId, v2.vendorId);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data.some((v) => v.vendorId === v1.vendorId)).toBe(true);
      expect(result.data.some((v) => v.vendorId === v2.vendorId)).toBe(false);
    });

    it('should search vendors by companyName, contactName, or email', async () => {
      const companyName = `Dallas Company-${Date.now()}`;
      const v1 = await seedVendor(prisma, { companyName });
      vendorIds.push(v1.vendorId);

      const result = await service.findAll({
        search: 'Dallas',
        page: 1,
        limit: 10,
      });
      expect(result.data.some((v) => v.vendorId === v1.vendorId)).toBe(true);
    });
  });

  describe('update', () => {
    it('should successfully update vendor fields', async () => {
      const seeded = await seedVendor(prisma, { companyName: 'Original' });
      vendorIds.push(seeded.vendorId);

      const updated = await service.update(seeded.vendorId, {
        companyName: 'Updated',
      });
      expect(updated.companyName).toBe('Updated');
    });

    it('should throw NotFoundException for invalid or deleted vendor ID', async () => {
      await expect(
        service.update('00000000-0000-0000-0000-000000000000', {
          companyName: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should mark vendor as deleted', async () => {
      const seeded = await seedVendor(prisma);
      vendorIds.push(seeded.vendorId);

      const deleted = await service.softDelete(seeded.vendorId);
      expect(deleted.isDeleted).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should change status to INACTIVE', async () => {
      const seeded = await seedVendor(prisma);
      vendorIds.push(seeded.vendorId);

      const updated = await service.updateStatus(seeded.vendorId, {
        status: VendorStatus.INACTIVE,
      });
      expect(updated.status).toBe(VendorStatus.INACTIVE);
    });
  });
});
