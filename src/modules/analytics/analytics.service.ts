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

    // 3. Conversion Rate (APPROVED quotes / total quotes)
    const totalQuotesCount = await this.prisma.quote.count();
    const approvedQuotesCount = approvedQuotes.length;
    const conversionRate =
      totalQuotesCount > 0 ? (approvedQuotesCount / totalQuotesCount) * 100 : 0;

    // 4. Campaigns Sent
    const campaignsSentCount = await this.prisma.campaign.count({
      where: { status: 'SENT' },
    });

    // 5. Revenue Trends (last 6 months)
    const last6MonthsTrends = this.calculateRevenueTrends(approvedQuotes);

    // 6. Top 5 Customers by Revenue
    const topCustomers = await this.getTopCustomers();

    // 7. Top 5 Product Categories by Volume
    const categoryPerformance = await this.getCategoryPerformance();

    return {
      summary: {
        totalRevenue,
        activeJobs: activeJobsCount,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        campaignsSent: campaignsSentCount,
      },
      revenueTrends: last6MonthsTrends,
      topCustomers,
      categoryPerformance,
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
}
