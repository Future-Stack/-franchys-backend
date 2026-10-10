import { Test, TestingModule } from '@nestjs/testing';
import { CustomerInvoiceService } from './customer-invoice.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { InvoiceSortBy, SortOrder } from './dto/customer-invoice.dto';

const mockPrisma = {
  customerInvoice: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  invoiceInformation: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockStripeService = {
  getOrCreateStripeCustomer: jest.fn(),
  createInvoice: jest.fn(),
};

const mockMailService = {
  sendInvoiceEmail: jest.fn(),
};

const mockWhatsAppService = {
  sendInvoiceMessage: jest.fn(),
};

describe('CustomerInvoiceService - findAll sorting', () => {
  let service: CustomerInvoiceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerInvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripeService },
        { provide: MailService, useValue: mockMailService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    service = module.get<CustomerInvoiceService>(CustomerInvoiceService);

    mockPrisma.customerInvoice.findMany.mockResolvedValue([]);
    mockPrisma.customerInvoice.count.mockResolvedValue(0);
    mockPrisma.customerInvoice.groupBy.mockResolvedValue([]);
  });

  it('should default to { createdAt: "desc" } when no sort params provided', async () => {
    await service.findAll({});

    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should sort by amountDue in asc and desc order', async () => {
    await service.findAll({
      sortBy: InvoiceSortBy.AMOUNT_DUE,
      sortOrder: SortOrder.ASC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amountDue: 'asc' },
      }),
    );

    await service.findAll({
      sortBy: InvoiceSortBy.AMOUNT_DUE,
      sortOrder: SortOrder.DESC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amountDue: 'desc' },
      }),
    );
  });

  it('should sort by amountPaid in asc and desc order', async () => {
    await service.findAll({
      sortBy: InvoiceSortBy.AMOUNT_PAID,
      sortOrder: SortOrder.ASC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amountPaid: 'asc' },
      }),
    );

    await service.findAll({
      sortBy: InvoiceSortBy.AMOUNT_PAID,
      sortOrder: SortOrder.DESC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amountPaid: 'desc' },
      }),
    );
  });

  it('should sort by total in asc and desc order', async () => {
    await service.findAll({
      sortBy: InvoiceSortBy.TOTAL,
      sortOrder: SortOrder.ASC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { total: 'asc' },
      }),
    );

    await service.findAll({
      sortBy: InvoiceSortBy.TOTAL,
      sortOrder: SortOrder.DESC,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { total: 'desc' },
      }),
    );
  });

  it('should default direction to desc when sortBy is provided without sortOrder', async () => {
    await service.findAll({
      sortBy: InvoiceSortBy.AMOUNT_DUE,
    });
    expect(mockPrisma.customerInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amountDue: 'desc' },
      }),
    );
  });
});
