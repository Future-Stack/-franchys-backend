import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorStatus } from '@prisma/client';

const mockPrisma = {
  vendors: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('VendorsService (unit)', () => {
  let service: VendorsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  describe('create', () => {
    const dto = {
      companyName: 'Acme LLC',
      contactName: 'John',
      email: 'john@acme.com',
      phone: '111',
      fax: '222',
      accountNumber: 'A1',
      mainAddress: 'St 1',
      city: 'NY',
      state: 'NY',
      country: 'USA',
      zip: '10001',
    };

    it('should create vendor successfully', async () => {
      mockPrisma.vendors.create.mockResolvedValue({ vendorId: 'v-1', ...dto });

      const result = await service.create(dto);

      expect(mockPrisma.vendors.create).toHaveBeenCalledWith({ data: dto });
      expect(result.vendorId).toBe('v-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated active vendors list', async () => {
      mockPrisma.vendors.findMany.mockResolvedValue([
        { vendorId: 'v-1', companyName: 'Acme' },
      ]);
      mockPrisma.vendors.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(mockPrisma.vendors.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update vendor details successfully', async () => {
      mockPrisma.vendors.findFirst.mockResolvedValue({
        vendorId: 'v-1',
        isDeleted: false,
      });
      mockPrisma.vendors.update.mockResolvedValue({
        vendorId: 'v-1',
        companyName: 'New Acme',
      });

      const result = await service.update('v-1', { companyName: 'New Acme' });

      expect(mockPrisma.vendors.update).toHaveBeenCalledWith({
        where: { vendorId: 'v-1' },
        data: { companyName: 'New Acme' },
      });
      expect(result.companyName).toBe('New Acme');
    });

    it('should throw NotFoundException if vendor is missing or soft-deleted', async () => {
      mockPrisma.vendors.findFirst.mockResolvedValue(null);

      await expect(
        service.update('v-1', { companyName: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should mark vendor as deleted', async () => {
      mockPrisma.vendors.findFirst.mockResolvedValue({
        vendorId: 'v-1',
        isDeleted: false,
      });
      mockPrisma.vendors.update.mockResolvedValue({
        vendorId: 'v-1',
        isDeleted: true,
      });

      const result = await service.softDelete('v-1');

      expect(mockPrisma.vendors.update).toHaveBeenCalledWith({
        where: { vendorId: 'v-1' },
        data: { isDeleted: true },
      });
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update vendor active/inactive status', async () => {
      mockPrisma.vendors.findFirst.mockResolvedValue({
        vendorId: 'v-1',
        isDeleted: false,
      });
      mockPrisma.vendors.update.mockResolvedValue({
        vendorId: 'v-1',
        status: VendorStatus.INACTIVE,
      });

      const result = await service.updateStatus('v-1', {
        status: VendorStatus.INACTIVE,
      });

      expect(mockPrisma.vendors.update).toHaveBeenCalledWith({
        where: { vendorId: 'v-1' },
        data: { status: VendorStatus.INACTIVE },
      });
      expect(result.status).toBe(VendorStatus.INACTIVE);
    });
  });
});
