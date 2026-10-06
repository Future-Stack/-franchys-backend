import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import {
  GetCustomersDto,
  CustomerSortBy,
  SortOrder,
} from './dto/get-customers.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateCustomerDto, file?: Express.Multer.File) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `Customer with email "${dto.email}" already exists`,
      );
    }
    const { eventDate, profileImage: dtoProfileImage, ...rest } = dto;
    let finalProfileImage: string | undefined =
      typeof dtoProfileImage === 'string' ? dtoProfileImage : undefined;

    if (file) {
      const uploadRes = await this.cloudinaryService.uploadFile(
        file,
        'customers',
      );
      finalProfileImage = uploadRes.secure_url;
    }

    return this.prisma.customer.create({
      data: {
        ...rest,
        profileImage: finalProfileImage,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
    });
  }

  async findAll(query?: GetCustomersDto) {
    const { page = 1, limit = 10, search, customerType } = query || {};
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (customerType) {
      where.customerType = customerType;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Determine if sorting by orders or totalSpent is requested via sortBy & sortOrder
    const sortBy = query?.sortBy;
    const sortOrder = query?.sortOrder;

    let sortField: 'orders' | 'totalSpent' | null = null;
    let sortDirection: 'asc' | 'desc' = 'desc';

    if (sortBy === CustomerSortBy.ORDERS) {
      sortField = 'orders';
    } else if (sortBy === CustomerSortBy.TOTAL_SPENT) {
      sortField = 'totalSpent';
    }

    if (sortField) {
      sortDirection = sortOrder === SortOrder.ASC ? 'asc' : 'desc';
    }

    // If sorting by orders or totalSpent is not requested, preserve default initial behavior
    if (!sortField) {
      const [data, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          skip,
          take: limit,
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
        }),
        this.prisma.customer.count({ where }),
      ]);

      const formattedData = data.map((customer) => {
        const quotes = (customer as any).quotes || [];
        const payments = (customer as any).payments || [];
        const orders = quotes.length;
        const totalSpent = payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const rest = { ...(customer as any) };
        delete rest.quotes;
        delete rest.payments;
        return {
          ...rest,
          orders,
          totalSpent,
        };
      });

      return {
        data: formattedData,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // When sorting by orders or totalSpent, fetch all matching customers to sort accurately across pagination
    const allCustomers = await this.prisma.customer.findMany({
      where,
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

    const formattedData = allCustomers.map((customer) => {
      const quotes = (customer as any).quotes || [];
      const payments = (customer as any).payments || [];
      const orders = quotes.length;
      const totalSpent = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const rest = { ...(customer as any) };
      delete rest.quotes;
      delete rest.payments;
      return {
        ...rest,
        orders,
        totalSpent,
      };
    });

    formattedData.sort((a, b) => {
      const valA = sortField === 'orders' ? a.orders : a.totalSpent;
      const valB = sortField === 'orders' ? b.orders : b.totalSpent;
      const diff = valA - valB;

      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const total = formattedData.length;
    const paginatedData = formattedData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
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
    if (!customer || customer.isDeleted) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    const quotes = (customer as any).quotes || [];
    const payments = (customer as any).payments || [];
    const orders = quotes.length;
    const totalSpent = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const rest = { ...(customer as any) };
    delete rest.quotes;
    delete rest.payments;
    return {
      ...rest,
      orders,
      totalSpent,
    };
  }

  async update(id: string, dto: UpdateCustomerDto, file?: Express.Multer.File) {
    await this.findOne(id);
    if (dto.email) {
      const existing = await this.prisma.customer.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Customer with email "${dto.email}" already exists`,
        );
      }
    }
    const { eventDate, profileImage: dtoProfileImage, ...rest } = dto;
    const updateData: any = { ...rest };

    if (file) {
      const uploadRes = await this.cloudinaryService.uploadFile(
        file,
        'customers',
      );
      updateData.profileImage = uploadRes.secure_url;
    } else if (typeof dtoProfileImage === 'string') {
      updateData.profileImage = dtoProfileImage;
    }

    if (eventDate !== undefined) {
      updateData.eventDate = eventDate ? new Date(eventDate) : null;
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customer.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Customer deleted successfully', id };
  }
}
