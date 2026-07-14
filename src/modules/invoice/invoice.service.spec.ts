import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  invoiceInformation: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  invoiceFees: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('InvoiceService (unit)', () => {
  let service: InvoiceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('onModuleInit', () => {
    it('should seed default invoice information if none exists', async () => {
      mockPrisma.invoiceInformation.count.mockResolvedValue(0);
      mockPrisma.invoiceInformation.create.mockResolvedValue({
        iniId: 'seeded-1',
      });

      await service.onModuleInit();

      expect(mockPrisma.invoiceInformation.count).toHaveBeenCalled();
      expect(mockPrisma.invoiceInformation.create).toHaveBeenCalled();
    });

    it('should not seed default invoice information if it already exists', async () => {
      mockPrisma.invoiceInformation.count.mockResolvedValue(1);

      await service.onModuleInit();

      expect(mockPrisma.invoiceInformation.count).toHaveBeenCalled();
      expect(mockPrisma.invoiceInformation.create).not.toHaveBeenCalled();
    });
  });

  describe('Invoice Fees CRUD', () => {
    const feeDto = {
      feeName: 'Design Fee',
      amount: 50,
      isTax: false,
      isDefaultAutoAdd: true,
    };

    it('should create fee successfully', async () => {
      mockPrisma.invoiceFees.create.mockResolvedValue({
        infId: 'fee-1',
        ...feeDto,
      });

      const result = await service.createFee(feeDto);

      expect(mockPrisma.invoiceFees.create).toHaveBeenCalledWith({
        data: feeDto,
      });
      expect(result.infId).toBe('fee-1');
    });

    it('should return all fees', async () => {
      mockPrisma.invoiceFees.findMany.mockResolvedValue([{ infId: 'fee-1' }]);

      const result = await service.findAllFees();

      expect(mockPrisma.invoiceFees.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should find one specific fee', async () => {
      mockPrisma.invoiceFees.findUnique.mockResolvedValue({
        infId: 'fee-1',
        ...feeDto,
      });

      const result = await service.findOneFee('fee-1');

      expect(mockPrisma.invoiceFees.findUnique).toHaveBeenCalledWith({
        where: { infId: 'fee-1' },
      });
      expect(result.infId).toBe('fee-1');
    });

    it('should throw NotFoundException on non-existent fee id', async () => {
      mockPrisma.invoiceFees.findUnique.mockResolvedValue(null);

      await expect(service.findOneFee('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update a fee successfully', async () => {
      mockPrisma.invoiceFees.findUnique.mockResolvedValue({ infId: 'fee-1' });
      mockPrisma.invoiceFees.update.mockResolvedValue({
        infId: 'fee-1',
        amount: 60,
      });

      const result = await service.updateFee('fee-1', { amount: 60 });

      expect(mockPrisma.invoiceFees.update).toHaveBeenCalledWith({
        where: { infId: 'fee-1' },
        data: { amount: 60 },
      });
      expect(result.amount).toBe(60);
    });

    it('should delete a fee successfully', async () => {
      mockPrisma.invoiceFees.findUnique.mockResolvedValue({ infId: 'fee-1' });
      mockPrisma.invoiceFees.delete.mockResolvedValue({});

      const result = await service.removeFee('fee-1');

      expect(mockPrisma.invoiceFees.delete).toHaveBeenCalledWith({
        where: { infId: 'fee-1' },
      });
      expect(result.message).toBe('Invoice fee deleted successfully');
    });
  });

  describe('Invoice Information Settings', () => {
    it('should fetch active information or create default if missing', async () => {
      mockPrisma.invoiceInformation.findFirst
        .mockResolvedValueOnce(null) // first call returns empty
        .mockResolvedValueOnce({ iniId: 'info-1', currency: 'USD' }); // second call returns data
      mockPrisma.invoiceInformation.create.mockResolvedValue({
        iniId: 'info-1',
        currency: 'USD',
      });

      const result = await service.getInformation();

      expect(mockPrisma.invoiceInformation.findFirst).toHaveBeenCalled();
      expect(mockPrisma.invoiceInformation.create).toHaveBeenCalled();
      expect(result.iniId).toBe('info-1');
    });

    it('should update invoice information settings', async () => {
      mockPrisma.invoiceInformation.findFirst.mockResolvedValue({
        iniId: 'info-1',
      });
      mockPrisma.invoiceInformation.update.mockResolvedValue({
        iniId: 'info-1',
        currency: 'EUR',
      });

      const result = await service.updateInformation({ currency: 'EUR' });

      expect(mockPrisma.invoiceInformation.update).toHaveBeenCalledWith({
        where: { iniId: 'info-1' },
        data: { currency: 'EUR' },
      });
      expect(result.currency).toBe('EUR');
    });
  });
});
