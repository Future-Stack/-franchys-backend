import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerType } from '@prisma/client';

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CustomerService (unit)', () => {
  let service: CustomerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('create', () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '1234567890',
      customerType: CustomerType.PERSONAL,
      eventDate: '2026-08-30T00:00:00.000Z',
    };

    it('should create a customer successfully', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        ...dto,
        eventDate: new Date(dto.eventDate),
      });

      const result = await service.create(dto);

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '1234567890',
          customerType: CustomerType.PERSONAL,
          eventDate: new Date(dto.eventDate),
        },
      });
      expect(result.id).toBe('cust-1');
    });

    it('should throw ConflictException if customer email already exists', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'existing-id',
        ...dto,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all customers sorted by createdAt desc', async () => {
      const mockCustomers = [
        { id: '1', firstName: 'A' },
        { id: '2', firstName: 'B' },
      ];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.findAll();

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCustomers);
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      const mockCustomer = { id: 'cust-1', firstName: 'Jane' };
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.findOne('cust-1');

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto = {
      firstName: 'Jane Updated',
      email: 'jane.new@example.com',
    };

    it('should update a customer successfully', async () => {
      mockPrisma.customer.findUnique
        .mockResolvedValueOnce({
          id: 'cust-1',
          firstName: 'Jane',
          email: 'jane@example.com',
        }) // findOne check
        .mockResolvedValueOnce(null); // email conflict check (does not exist elsewhere)
      mockPrisma.customer.update.mockResolvedValue({ id: 'cust-1', ...dto });

      const result = await service.update('cust-1', dto);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: {
          firstName: 'Jane Updated',
          email: 'jane.new@example.com',
          eventDate: undefined,
        },
      });
      expect(result.firstName).toBe('Jane Updated');
    });

    it('should throw ConflictException if trying to update to an email owned by another customer', async () => {
      mockPrisma.customer.findUnique
        .mockResolvedValueOnce({
          id: 'cust-1',
          firstName: 'Jane',
          email: 'jane@example.com',
        }) // findOne check
        .mockResolvedValueOnce({
          id: 'other-cust',
          email: 'jane.new@example.com',
        }); // email conflict check

      await expect(service.update('cust-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.customer.update).not.toHaveBeenCalled();
    });

    it('should allow updating email to the same email owned by the same customer', async () => {
      mockPrisma.customer.findUnique
        .mockResolvedValueOnce({
          id: 'cust-1',
          firstName: 'Jane',
          email: 'jane@example.com',
        }) // findOne check
        .mockResolvedValueOnce({ id: 'cust-1', email: 'jane@example.com' }); // email conflict check (owned by self)
      mockPrisma.customer.update.mockResolvedValue({
        id: 'cust-1',
        email: 'jane@example.com',
      });

      const result = await service.update('cust-1', {
        email: 'jane@example.com',
      });

      expect(result.email).toBe('jane@example.com');
      expect(mockPrisma.customer.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a customer when found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Jane',
      });
      mockPrisma.customer.delete.mockResolvedValue({ id: 'cust-1' });

      const result = await service.remove('cust-1');

      expect(mockPrisma.customer.delete).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(result).toEqual({
        message: 'Customer deleted successfully',
        id: 'cust-1',
      });
    });
  });
});
