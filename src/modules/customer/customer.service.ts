import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { GetCustomersDto } from './dto/get-customers.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `Customer with email "${dto.email}" already exists`,
      );
    }
    const { eventDate, ...rest } = dto;
    return this.prisma.customer.create({
      data: {
        ...rest,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
    });
  }

  async findAll(query: GetCustomersDto) {
    const { page = 1, limit = 10, search, customerType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

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

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
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
    const { eventDate, ...rest } = dto;
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted successfully', id };
  }
}
