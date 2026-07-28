import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerType } from './dto/customer.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCloudinaryService = {
  uploadFile: jest.fn(),
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
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
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
          profileImage: undefined,
          eventDate: new Date(dto.eventDate),
        },
      });
      expect(result.id).toBe('cust-1');
    });

    it('should upload profileImage to Cloudinary if file is provided', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockCloudinaryService.uploadFile.mockResolvedValue({
        secure_url: 'https://cloudinary.com/avatar.jpg',
      });
      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        ...dto,
        profileImage: 'https://cloudinary.com/avatar.jpg',
      });

      const mockFile = { filename: 'avatar.jpg' } as any;
      const result = await service.create(dto, mockFile);

      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'customers',
      );
      expect(result.profileImage).toBe('https://cloudinary.com/avatar.jpg');
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
      mockPrisma.customer.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          quotes: {
            where: { status: { in: ['APPROVED', 'SENT'] } },
            select: { total: true },
          },
          payments: {
            where: { status: 'succeeded' },
            select: { amount: true },
          },
        },
      });
      expect(result.data).toEqual([
        { id: '1', firstName: 'A', orders: 0, totalSpent: 0 },
        { id: '2', firstName: 'B', orders: 0, totalSpent: 0 },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      const mockCustomer = { id: 'cust-1', firstName: 'Jane' };
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.findOne('cust-1');

      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        include: {
          quotes: {
            where: { status: { in: ['APPROVED', 'SENT'] } },
            select: { total: true },
          },
          payments: {
            where: { status: 'succeeded' },
            select: { amount: true },
          },
        },
      });
      expect(result).toEqual({ id: 'cust-1', firstName: 'Jane', orders: 0, totalSpent: 0 });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when customer is soft-deleted', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Jane',
        isDeleted: true,
      });

      await expect(service.findOne('cust-1')).rejects.toThrow(
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
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce(null); // email conflict check (does not exist elsewhere)
      mockPrisma.customer.update.mockResolvedValue({ id: 'cust-1', ...dto });

      const result = await service.update('cust-1', dto);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: {
          firstName: 'Jane Updated',
          email: 'jane.new@example.com',
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
          isDeleted: false,
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
          isDeleted: false,
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
    it('should soft-delete a customer when found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Jane',
        isDeleted: false,
      });
      mockPrisma.customer.update.mockResolvedValue({
        id: 'cust-1',
        isDeleted: true,
      });

      const result = await service.remove('cust-1');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({
        message: 'Customer deleted successfully',
        id: 'cust-1',
      });
    });
  });
});
