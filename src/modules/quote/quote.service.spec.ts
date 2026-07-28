import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobService } from '../job/job.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CustomerInvoiceService } from '../invoice/customer-invoice.service';
import { QuoteStatus } from './dto/quote.dto';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  quote: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  userPermission: {
    findFirst: jest.fn(),
  },
  quoteLineItem: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJobService = {
  createOrUpdateJobFromQuote: jest.fn(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildLineItem = (overrides = {}) => ({
  groupName: 'Group 1',
  categoryId: null,
  itemNumber: 'IT-001',
  color: 'Red',
  description: 'T-Shirt',
  sizeM: 10,
  sizeL: 5,
  sizeXL: 5,
  markupPrice: 10,
  unitPrice: 20,
  isTaxed: false,
  imprintType: 'Screen Print',
  itemsCount: 20,
  total: 440,
  ...overrides,
});

const buildQuote = (overrides: Record<string, unknown> = {}) => ({
  id: 'quote-1',
  quoteNumber: 'Q-1001',
  customerId: 'cust-1',
  repId: 'rep-1',
  status: QuoteStatus.DRAFT,
  subtotal: 440,
  discount: 0,
  taxRate: 7,
  taxAmount: 30.8,
  total: 470.8,
  lineItems: [buildLineItem()],
  customer: {
    id: 'cust-1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: null,
  },
  rep: { userId: 'rep-1', email: 'rep@example.com', name: 'Rep Name' },
  poNumber: null,
  deliveryMethod: null,
  dueDate: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JobService, useValue: mockJobService },
        { provide: MailService, useValue: { sendQuoteEmail: jest.fn() } },
        {
          provide: WhatsAppService,
          useValue: { sendQuoteWhatsApp: jest.fn() },
        },
        {
          provide: CustomerInvoiceService,
          useValue: { createFromQuote: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<QuoteService>(QuoteService);
    jest.clearAllMocks();
  });

  // ─── generateNextQuoteNumber ───────────────────────────────────────────────

  describe('generateNextQuoteNumber (via create)', () => {
    it('should start at Q-1001 when no quotes exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ quoteNumber: 'Q-1001' }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
      });

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quoteNumber: 'Q-1001' }),
        }),
      );
    });

    it('should increment from the last quote number', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ quoteNumber: 'Q-1005' });
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ quoteNumber: 'Q-1006' }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
      });

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quoteNumber: 'Q-1006' }),
        }),
      );
    });

    it('should fall back to Q-1001 if last quote number is in invalid format', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        quoteNumber: 'INVALID-FORMAT',
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ quoteNumber: 'Q-1001' }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
      });

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quoteNumber: 'Q-1001' }),
        }),
      );
    });
  });

  // ─── calculateTotals ──────────────────────────────────────────────────────

  describe('calculateTotals (via create)', () => {
    beforeEach(() => {
      mockPrisma.quote.findFirst.mockResolvedValue({ quoteNumber: 'Q-1001' });
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
    });

    it('should correctly compute subtotal, taxAmount, and total with 10% markup', async () => {
      // 20 items * ($20 unit * 1.10 markup) = $440 subtotal
      // tax = 7% * $440 = $30.80; total = $470.80
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({
          subtotal: 440,
          taxAmount: 30.8,
          total: 470.8,
          discount: 0,
        }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [
          {
            sizeBreakdown: { sizeAdultM: 10, sizeAdultL: 5, sizeAdultXL: 5 },
            unitPrice: 20,
            markupPrice: 10,
          },
        ],
        discount: 0,
        taxRate: 7,
      });

      const callArg = (
        mockPrisma.quote.create.mock.calls[0] as [
          { data: Record<string, unknown> },
        ]
      )[0];
      expect(callArg.data.subtotal).toBeCloseTo(440);
      expect(callArg.data.taxAmount).toBeCloseTo(30.8);
      expect(callArg.data.total).toBeCloseTo(470.8);
    });

    it('should apply discount before computing tax', async () => {
      // subtotal=440, discount=40 => taxable=400, tax=7%*400=28, total=428
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ subtotal: 440, discount: 40, taxAmount: 28, total: 428 }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [
          {
            sizeBreakdown: { sizeAdultM: 10, sizeAdultL: 5, sizeAdultXL: 5 },
            unitPrice: 20,
            markupPrice: 10,
          },
        ],
        discount: 40,
        taxRate: 7,
      });

      const callArg = (
        mockPrisma.quote.create.mock.calls[0] as [
          { data: Record<string, unknown> },
        ]
      )[0];
      expect(callArg.data.subtotal).toBeCloseTo(440);
      expect(callArg.data.discount).toBe(40);
      expect(callArg.data.taxAmount).toBeCloseTo(28);
      expect(callArg.data.total).toBeCloseTo(428);
    });

    it('should handle empty line items producing zero totals', async () => {
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ subtotal: 0, taxAmount: 0, total: 0 }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
      });

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 0,
            taxAmount: 0,
            total: 0,
          }),
        }),
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          customerId: 'bad-cust',
          repId: 'rep-1',
          lineItems: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if rep user does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          customerId: 'cust-1',
          repId: 'bad-rep',
          lineItems: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should trigger job creation when status is APPROVED', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ status: QuoteStatus.APPROVED }),
      );
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
        status: QuoteStatus.APPROVED,
      });

      expect(mockJobService.createOrUpdateJobFromQuote).toHaveBeenCalledWith(
        'quote-1',
      );
    });

    it('should NOT trigger job creation for DRAFT status', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 'rep-1' });
      mockPrisma.quote.create.mockResolvedValue(
        buildQuote({ status: QuoteStatus.DRAFT }),
      );

      await service.create({
        customerId: 'cust-1',
        repId: 'rep-1',
        lineItems: [],
        status: QuoteStatus.DRAFT,
      });

      expect(mockJobService.createOrUpdateJobFromQuote).not.toHaveBeenCalled();
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return quote when found', async () => {
      const quote = buildQuote();
      mockPrisma.quote.findUnique.mockResolvedValue(quote);

      const result = await service.findOne('quote-1');
      expect(result).toEqual({
        ...quote,
        groups: [
          {
            name: 'Group 1',
            lineItems: quote.lineItems,
          },
        ],
      });
    });

    it('should throw NotFoundException when quote not found', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all quotes', async () => {
      const quotes = [
        buildQuote(),
        buildQuote({ id: 'quote-2', quoteNumber: 'Q-1002' }),
      ];
      mockPrisma.quote.findMany.mockResolvedValue(quotes);
      mockPrisma.quote.count.mockResolvedValue(2);

      const result = await service.findAll();
      expect(result.data).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);
      await service.findAll('APPROVED');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should apply search filter when provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);
      await service.findAll(undefined, 'John');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw NotFoundException if new customer does not exist', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(buildQuote());
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update('quote-1', { customerId: 'new-bad-cust' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new rep does not exist', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(buildQuote());
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('quote-1', { repId: 'new-bad-rep' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should trigger job creation when status changes to APPROVED', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(buildQuote());
      const updatedQuote = buildQuote({ status: QuoteStatus.APPROVED });
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
          fn(mockPrisma),
      );
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      await service.update('quote-1', { status: QuoteStatus.APPROVED });

      expect(mockJobService.createOrUpdateJobFromQuote).toHaveBeenCalledWith(
        'quote-1',
      );
    });
  });

  // ─── updateStatusWithPermissionCheck ─────────────────────────────────────

  describe('updateStatusWithPermissionCheck', () => {
    const adminUser = {
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'ADMIN',
    };
    const superAdminUser = {
      userId: 'sa-1',
      email: 'sa@test.com',
      role: 'SUPER_ADMIN',
    };
    const repUser = { userId: 'user-1', email: 'user@test.com', role: 'REP' };

    it('should allow ADMIN to change status without querying permissions', async () => {
      const updatedQuote = buildQuote({ status: QuoteStatus.APPROVED });
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      await service.updateStatusWithPermissionCheck(
        'quote-1',
        'APPROVED',
        adminUser,
      );

      expect(mockPrisma.userPermission.findFirst).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN to change status without querying permissions', async () => {
      const updatedQuote = buildQuote({ status: QuoteStatus.APPROVED });
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      await service.updateStatusWithPermissionCheck(
        'quote-1',
        'APPROVED',
        superAdminUser,
      );

      expect(mockPrisma.userPermission.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user has no permission record', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatusWithPermissionCheck('quote-1', 'APPROVED', repUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if canApproveQuotes is false', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue({
        canApproveQuotes: false,
      });

      await expect(
        service.updateStatusWithPermissionCheck('quote-1', 'APPROVED', repUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when user has canApproveQuotes=true', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue({
        canApproveQuotes: true,
      });
      const updatedQuote = buildQuote({ status: QuoteStatus.APPROVED });
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      const result = await service.updateStatusWithPermissionCheck(
        'quote-1',
        'APPROVED',
        repUser,
      );

      expect(result.status).toBe(QuoteStatus.APPROVED);
    });

    it('should trigger job creation when approved via permission check', async () => {
      mockPrisma.userPermission.findFirst.mockResolvedValue({
        canApproveQuotes: true,
      });
      const updatedQuote = buildQuote({ status: QuoteStatus.APPROVED });
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);
      mockJobService.createOrUpdateJobFromQuote.mockResolvedValue({});

      await service.updateStatusWithPermissionCheck(
        'quote-1',
        'APPROVED',
        repUser,
      );

      expect(mockJobService.createOrUpdateJobFromQuote).toHaveBeenCalledWith(
        'quote-1',
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete quote and return success message', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(buildQuote());
      mockPrisma.quote.delete.mockResolvedValue({});

      const result = await service.remove('quote-1');

      expect(mockPrisma.quote.delete).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
      });
      expect(result).toEqual({
        message: 'Quote deleted successfully',
        id: 'quote-1',
      });
    });

    it('should throw NotFoundException if quote does not exist', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.quote.delete).not.toHaveBeenCalled();
    });
  });
});
