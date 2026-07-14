import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CustomerService } from 'src/modules/customer/customer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerType } from 'src/modules/customer/dto/customer.dto';
import {
  createTestPrisma,
  cleanupTest,
  seedCustomer,
} from '../setup/test-helpers';

describe('CustomerService (integration)', () => {
  let module: TestingModule;
  let service: CustomerService;
  let prisma: PrismaClient;
  const customerIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    // Clean up created customers after each test to keep DB clean
    await cleanupTest(prisma, { customerIds });
    customerIds.length = 0;
  });

  describe('create', () => {
    it('should persist a new customer in the database', async () => {
      const email = `persisted-cust-${Date.now()}@example.com`;
      const customer = await service.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        phone: '1234567890',
        customerType: CustomerType.PERSONAL,
        eventDate: '2026-08-30T00:00:00.000Z',
      });

      customerIds.push(customer.id);

      expect(customer.id).toBeDefined();
      expect(customer.email).toBe(email);
      expect(customer.firstName).toBe('Jane');
      expect(customer.customerType).toBe(CustomerType.PERSONAL);
      expect(customer.eventDate).toEqual(new Date('2026-08-30T00:00:00.000Z'));

      // Check DB directly
      const dbCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
      });
      expect(dbCustomer).toBeDefined();
    });

    it('should throw ConflictException on duplicate email', async () => {
      const email = `dup-cust-${Date.now()}@example.com`;
      const c1 = await seedCustomer(prisma, { email });
      customerIds.push(c1.id);

      await expect(
        service.create({
          firstName: 'Another',
          lastName: 'User',
          email,
          phone: '0000000000',
          customerType: CustomerType.BUSINESS,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all customers sorted by creation date descending', async () => {
      const c1 = await seedCustomer(prisma);
      // Wait a tiny bit to guarantee distinct createdAt timestamps
      await new Promise((resolve) => setTimeout(resolve, 50));
      const c2 = await seedCustomer(prisma);

      customerIds.push(c1.id, c2.id);

      const result = await service.findAll();
      expect(result.length).toBeGreaterThanOrEqual(2);

      const idx1 = result.findIndex((c) => c.id === c1.id);
      const idx2 = result.findIndex((c) => c.id === c2.id);

      // c2 is newer than c1, so it should appear before c1 in descending order (idx2 < idx1)
      expect(idx2).toBeLessThan(idx1);
    });
  });

  describe('findOne', () => {
    it('should return customer by ID', async () => {
      const seeded = await seedCustomer(prisma);
      customerIds.push(seeded.id);

      const result = await service.findOne(seeded.id);
      expect(result.id).toBe(seeded.id);
      expect(result.email).toBe(seeded.email);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update fields', async () => {
      const seeded = await seedCustomer(prisma, { firstName: 'Original' });
      customerIds.push(seeded.id);

      const updated = await service.update(seeded.id, { firstName: 'Updated' });
      expect(updated.firstName).toBe('Updated');

      const dbCust = await prisma.customer.findUnique({
        where: { id: seeded.id },
      });
      expect(dbCust?.firstName).toBe('Updated');
    });

    it('should throw ConflictException on email conflict', async () => {
      const email1 = `conf-cust1-${Date.now()}@example.com`;
      const email2 = `conf-cust2-${Date.now()}@example.com`;

      const c1 = await seedCustomer(prisma, { email: email1 });
      const c2 = await seedCustomer(prisma, { email: email2 });
      customerIds.push(c1.id, c2.id);

      await expect(service.update(c1.id, { email: email2 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating other fields without changing email', async () => {
      const email = `same-email-${Date.now()}@example.com`;
      const seeded = await seedCustomer(prisma, {
        email,
        firstName: 'Original',
      });
      customerIds.push(seeded.id);

      const updated = await service.update(seeded.id, {
        firstName: 'Updated',
        email,
      });
      expect(updated.firstName).toBe('Updated');
      expect(updated.email).toBe(email);
    });
  });

  describe('remove', () => {
    it('should delete from database', async () => {
      const seeded = await seedCustomer(prisma);
      // We don't need to push to customerIds because we're deleting it during the test,
      // but let's push just in case the delete fails so it gets cleaned up regardless.
      customerIds.push(seeded.id);

      const result = await service.remove(seeded.id);
      expect(result).toEqual({
        message: 'Customer deleted successfully',
        id: seeded.id,
      });

      const dbCust = await prisma.customer.findUnique({
        where: { id: seeded.id },
      });
      expect(dbCust).toBeNull();
    });

    it('should throw NotFoundException for missing customer ID', async () => {
      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
