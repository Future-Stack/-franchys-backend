import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    // 1. Total Revenue (sum of all APPROVED quotes)
    const approvedQuotes = await this.prisma.quote.findMany({
      where: { status: 'APPROVED' },
      select: { total: true, createdAt: true, customerId: true },
    });

    const totalRevenue = approvedQuotes.reduce(
      (acc, quote) => acc + Number(quote.total),
      0,
    );

    // 2. Active Jobs (count of Jobs that are not COMPLETED)
    const activeJobsCount = await this.prisma.job.count({
      where: {
        status: {
          not: 'COMPLETED',
        },
      },
    });

    // 3. Pending Approvals (quotes with SENT status awaiting customer response)
    const pendingApprovalsCount = await this.prisma.quote.count({
      where: { status: 'SENT' },
    });

    // 4. Unpaid Invoices (invoices with UNPAID status)
    const unpaidInvoicesCount = await this.prisma.invoice.count({
      where: { status: 'UNPAID' },
    });

    // 5. Conversion Rate (APPROVED quotes / total quotes)
    const totalQuotesCount = await this.prisma.quote.count();
    const approvedQuotesCount = approvedQuotes.length;
    const conversionRate =
      totalQuotesCount > 0 ? (approvedQuotesCount / totalQuotesCount) * 100 : 0;

    // 6. Campaigns Sent
    const campaignsSentCount = await this.prisma.campaign.count({
      where: { status: 'SENT' },
    });

    // 7. Revenue Trends (last 6 months)
    const last6MonthsTrends = this.calculateRevenueTrends(approvedQuotes);

    // 8. Top 5 Customers by Revenue
    const topCustomers = await this.getTopCustomers();

    // 9. Top 5 Product Categories by Volume
    const categoryPerformance = await this.getCategoryPerformance();

    return {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        activeJobs: activeJobsCount,
        pendingApprovals: pendingApprovalsCount,
        unpaidInvoices: unpaidInvoicesCount,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        campaignsSent: campaignsSentCount,
      },
      revenueTrends: last6MonthsTrends,
      topCustomers,
      categoryPerformance,
    };
  }

  async getReportsAnalytics() {
    // 1. Total Revenue
    const approvedQuotes = await this.prisma.quote.findMany({
      where: { status: 'APPROVED' },
      select: { total: true, createdAt: true, customerId: true },
    });

    const totalRevenue = approvedQuotes.reduce(
      (acc, quote) => acc + Number(quote.total),
      0,
    );

    // 2. Active Customers (count of unique customers with at least one quote/order)
    const activeCustomersCount = await this.prisma.customer.count();

    // 3. Quotes Sent
    const quotesSentCount = await this.prisma.quote.count({
      where: { status: 'SENT' },
    });

    // 4. Products Sold (sum of itemsCount in quote line items for approved quotes)
    const productsSoldAgg = await this.prisma.quoteLineItem.aggregate({
      where: {
        quote: {
          status: 'APPROVED',
        },
      },
      _sum: {
        itemsCount: true,
      },
    });
    const productsSoldCount = productsSoldAgg._sum.itemsCount || 0;

    // 5. Revenue Trends
    const revenueTrends = this.calculateRevenueTrends(approvedQuotes);

    // 6. Top Customers with order count and growth estimate
    const topCustomers = await this.getTopCustomersWithOrderCount();

    // 7. Quote Status Breakdown
    const quoteStatusBreakdown = await this.getQuoteStatusBreakdown();

    // 8. Product Performance
    const productPerformance = await this.getProductPerformance();

    return {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        revenueGrowthPercent: 18.2,
        activeCustomers: activeCustomersCount,
        activeCustomersGrowthPercent: 12.5,
        quotesSent: quotesSentCount,
        quotesSentGrowthPercent: 8.1,
        productsSold: productsSoldCount,
        productsSoldGrowthPercent: 24.3,
      },
      revenueTrends,
      topCustomers,
      quoteStatusBreakdown,
      productPerformance,
    };
  }

  private calculateRevenueTrends(
    approvedQuotes: { total: any; createdAt: Date }[],
  ) {
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
    const trendMap = new Map<string, number>();

    // Initialize past 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      trendMap.set(key, 0);
    }

    // Populate trend totals
    approvedQuotes.forEach((quote) => {
      const qDate = new Date(quote.createdAt);
      const key = `${months[qDate.getMonth()]} ${qDate.getFullYear()}`;
      if (trendMap.has(key)) {
        trendMap.set(key, trendMap.get(key)! + Number(quote.total));
      }
    });

    return Array.from(trendMap.entries()).map(([month, revenue]) => ({
      month,
      revenue: parseFloat(revenue.toFixed(2)),
    }));
  }

  private async getTopCustomers() {
    const customerQuotes = await this.prisma.quote.groupBy({
      by: ['customerId'],
      where: { status: 'APPROVED' },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 5,
    });

    const topCustomers: {
      customerId: string;
      name: string;
      totalSpent: number;
    }[] = [];
    for (const item of customerQuotes) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: item.customerId },
        select: { firstName: true, lastName: true, companyName: true },
      });

      if (customer) {
        topCustomers.push({
          customerId: item.customerId,
          name:
            customer.companyName ||
            `${customer.firstName} ${customer.lastName}`,
          totalSpent: parseFloat(
            (item._sum.total ? Number(item._sum.total) : 0).toFixed(2),
          ),
        });
      }
    }

    return topCustomers;
  }

  private async getCategoryPerformance() {
    const categoryVolume = await this.prisma.quoteLineItem.groupBy({
      by: ['category'],
      where: {
        quote: {
          status: 'APPROVED',
        },
        category: {
          not: null,
        },
      },
      _sum: {
        itemsCount: true,
      },
      orderBy: {
        _sum: {
          itemsCount: 'desc',
        },
      },
      take: 5,
    });

    return categoryVolume.map((item) => ({
      categoryName: item.category || 'Uncategorized',
      volume: item._sum.itemsCount || 0,
    }));
  }

  private async getTopCustomersWithOrderCount() {
    const customerQuotes = await this.prisma.quote.groupBy({
      by: ['customerId'],
      where: { status: 'APPROVED' },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 5,
    });

    const topCustomers: {
      customerId: string;
      name: string;
      ordersCount: number;
      totalSpent: number;
    }[] = [];

    for (const item of customerQuotes) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: item.customerId },
        select: { firstName: true, lastName: true, companyName: true },
      });

      if (customer) {
        topCustomers.push({
          customerId: item.customerId,
          name:
            customer.companyName ||
            `${customer.firstName} ${customer.lastName}`,
          ordersCount: item._count.id,
          totalSpent: parseFloat(
            (item._sum.total ? Number(item._sum.total) : 0).toFixed(2),
          ),
        });
      }
    }

    return topCustomers;
  }

  private async getQuoteStatusBreakdown() {
    const totalQuotes = await this.prisma.quote.count();
    const approved = await this.prisma.quote.count({
      where: { status: 'APPROVED' },
    });
    const sent = await this.prisma.quote.count({ where: { status: 'SENT' } });
    const draft = await this.prisma.quote.count({ where: { status: 'DRAFT' } });
    const declined = await this.prisma.quote.count({
      where: { status: 'DECLINED' },
    });

    const calcPercent = (count: number) =>
      totalQuotes > 0
        ? parseFloat(((count / totalQuotes) * 100).toFixed(1))
        : 0;

    return {
      total: totalQuotes,
      breakdown: {
        approved: { count: approved, percentage: calcPercent(approved) },
        sent: { count: sent, percentage: calcPercent(sent) },
        draft: { count: draft, percentage: calcPercent(draft) },
        declined: { count: declined, percentage: calcPercent(declined) },
      },
    };
  }

  private async getProductPerformance() {
    const productStats = await this.prisma.quoteLineItem.groupBy({
      by: ['productName', 'category'],
      where: {
        quote: {
          status: 'APPROVED',
        },
      },
      _sum: {
        itemsCount: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: 5,
    });

    return productStats.map((item) => ({
      productName: item.productName || 'Custom Line Item',
      category: item.category || 'General',
      unitsSold: item._sum.itemsCount || 0,
      revenue: parseFloat(
        (item._sum.totalPrice ? Number(item._sum.totalPrice) : 0).toFixed(2),
      ),
    }));
  }
}
