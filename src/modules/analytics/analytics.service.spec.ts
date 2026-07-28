import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from 'src/prisma/prisma.service';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  quote: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  job: {
    count: jest.fn(),
  },
  invoice: {
    count: jest.fn(),
  },
  campaign: {
    count: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  quoteLineItem: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // ─── getDashboardStats ────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    type ApprovedQuote = { total: number; createdAt: Date; customerId: string };
    type CustomerRecord = {
      firstName: string;
      lastName: string;
      companyName: string | null;
    };
    type CustomerGroup = { customerId: string; _sum: { total: number | null } };
    type CategoryGroup = {
      category: string;
      _sum: { itemsCount: number | null };
    };

    const setupMocks = (
      overrides: {
        approvedQuotes?: ApprovedQuote[];
        totalQuotes?: number;
        activeJobs?: number;
        campaignsSent?: number;
        topCustomerGroups?: CustomerGroup[];
        customers?: Record<string, CustomerRecord>;
        categoryGroups?: CategoryGroup[];
      } = {},
    ) => {
      const approvedQuotes = overrides.approvedQuotes ?? [];
      mockPrisma.quote.findMany.mockResolvedValue(approvedQuotes);
      mockPrisma.quote.count.mockResolvedValue(overrides.totalQuotes ?? 0);
      mockPrisma.job.count.mockResolvedValue(overrides.activeJobs ?? 0);
      mockPrisma.campaign.count.mockResolvedValue(overrides.campaignsSent ?? 0);

      const topCustomerGroups = overrides.topCustomerGroups ?? [];
      mockPrisma.quote.groupBy.mockResolvedValue(topCustomerGroups);

      const customers = overrides.customers ?? {};
      mockPrisma.customer.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(customers[where.id] ?? null),
      );

      const categoryGroups = overrides.categoryGroups ?? [];
      mockPrisma.quoteLineItem.groupBy.mockResolvedValue(categoryGroups);
    };

    it('should return correct summary shape', async () => {
      setupMocks({
        approvedQuotes: [
          { total: 500, createdAt: new Date(), customerId: 'c1' },
          { total: 300, createdAt: new Date(), customerId: 'c2' },
        ],
        totalQuotes: 5,
        activeJobs: 3,
        campaignsSent: 2,
      });

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('summary');
      expect(result.summary).toMatchObject({
        totalRevenue: 800,
        activeJobs: 3,
        conversionRate: 40, // 2 approved / 5 total = 40%
        campaignsSent: 2,
      });
    });

    it('should return 0 conversionRate when no quotes exist (avoids divide-by-zero)', async () => {
      setupMocks({ totalQuotes: 0, approvedQuotes: [] });

      const result = await service.getDashboardStats();

      expect(result.summary.conversionRate).toBe(0);
    });

    it('should return 100% conversionRate when all quotes are approved', async () => {
      const now = new Date();
      setupMocks({
        approvedQuotes: [
          { total: 100, createdAt: now, customerId: 'c1' },
          { total: 200, createdAt: now, customerId: 'c2' },
        ],
        totalQuotes: 2,
      });

      const result = await service.getDashboardStats();

      expect(result.summary.conversionRate).toBe(100);
    });

    it('should return totalRevenue as sum of all approved quote totals', async () => {
      setupMocks({
        approvedQuotes: [
          { total: 100, createdAt: new Date(), customerId: 'c1' },
          { total: 250, createdAt: new Date(), customerId: 'c1' },
          { total: 75.5, createdAt: new Date(), customerId: 'c2' },
        ],
        totalQuotes: 5,
      });

      const result = await service.getDashboardStats();

      expect(result.summary.totalRevenue).toBeCloseTo(425.5);
    });

    it('should include revenueTrends with 6 month entries', async () => {
      setupMocks({ approvedQuotes: [] });

      const result = await service.getDashboardStats();

      expect(result.revenueTrends).toHaveLength(6);
      expect(result.revenueTrends[0]).toHaveProperty('month');
      expect(result.revenueTrends[0]).toHaveProperty('revenue');
    });

    it('should sum revenue into the correct month bucket', async () => {
      const now = new Date();
      setupMocks({
        approvedQuotes: [
          { total: 500, createdAt: now, customerId: 'c1' },
          { total: 300, createdAt: now, customerId: 'c1' },
        ],
        totalQuotes: 2,
      });

      const result = await service.getDashboardStats();

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const currentMonthLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;
      const currentMonthEntry = result.revenueTrends.find(
        (t) => t.month === currentMonthLabel,
      );

      expect(currentMonthEntry?.revenue).toBeCloseTo(800);
    });

    it('should return topCustomers populated with customer names', async () => {
      setupMocks({
        approvedQuotes: [],
        topCustomerGroups: [{ customerId: 'cust-1', _sum: { total: 1000 } }],
        customers: {
          'cust-1': { firstName: 'Jane', lastName: 'Smith', companyName: null },
        },
      });

      const result = await service.getDashboardStats();

      expect(result.topCustomers).toHaveLength(1);
      expect(result.topCustomers[0]).toMatchObject({
        customerId: 'cust-1',
        name: 'Jane Smith',
        totalSpent: 1000,
      });
    });

    it('should prefer companyName over firstName+lastName for topCustomers', async () => {
      setupMocks({
        approvedQuotes: [],
        topCustomerGroups: [{ customerId: 'cust-1', _sum: { total: 500 } }],
        customers: {
          'cust-1': {
            firstName: 'Jane',
            lastName: 'Smith',
            companyName: 'Acme Corp',
          },
        },
      });

      const result = await service.getDashboardStats();

      expect(result.topCustomers[0].name).toBe('Acme Corp');
    });

    it('should return categoryPerformance with category names', async () => {
      setupMocks({
        approvedQuotes: [],
        categoryGroups: [{ category: 'T-Shirts', _sum: { itemsCount: 150 } }],
      });

      const result = await service.getDashboardStats();

      expect(result.categoryPerformance).toHaveLength(1);
      expect(result.categoryPerformance[0]).toMatchObject({
        categoryName: 'T-Shirts',
        volume: 150,
      });
    });

    it('should handle categoryPerformance entries', async () => {
      setupMocks({
        approvedQuotes: [],
        categoryGroups: [{ category: 'Hats', _sum: { itemsCount: 100 } }],
      });

      const result = await service.getDashboardStats();

      expect(result.categoryPerformance).toHaveLength(1);
      expect(result.categoryPerformance[0].categoryName).toBe('Hats');
    });

    it('should return empty topCustomers and categoryPerformance when no data', async () => {
      setupMocks({ approvedQuotes: [] });

      const result = await service.getDashboardStats();

      expect(result.topCustomers).toHaveLength(0);
      expect(result.categoryPerformance).toHaveLength(0);
    });
  });

  // ─── getReportsAnalytics ──────────────────────────────────────────────────

  describe('getReportsAnalytics', () => {
    it('should return correct reports analytics structure', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(127);
      mockPrisma.quote.count.mockResolvedValue(89);
      mockPrisma.quoteLineItem.aggregate.mockResolvedValue({
        _sum: { itemsCount: 2847 },
      });
      mockPrisma.quote.groupBy.mockResolvedValue([]);
      mockPrisma.quoteLineItem.groupBy.mockResolvedValue([]);

      const result = await service.getReportsAnalytics();

      expect(result).toHaveProperty('summary');
      expect(result.summary).toMatchObject({
        totalRevenue: 0,
        revenueGrowthPercent: 18.2,
        activeCustomers: 127,
        activeCustomersGrowthPercent: 12.5,
        quotesSent: 89,
        quotesSentGrowthPercent: 8.1,
        productsSold: 2847,
        productsSoldGrowthPercent: 24.3,
      });
      expect(result).toHaveProperty('revenueTrends');
      expect(result).toHaveProperty('topCustomers');
      expect(result).toHaveProperty('quoteStatusBreakdown');
      expect(result).toHaveProperty('productPerformance');
    });
  });
});
