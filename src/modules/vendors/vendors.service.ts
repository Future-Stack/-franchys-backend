import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { GetVendorsQueryDto } from './dto/get-vendors-query.dto';
import { UpdateVendorStatusDto } from './dto/update-vendor-status.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    return this.prisma.vendors.create({
      data: createVendorDto,
    });
  }

  async findAll(query: GetVendorsQueryDto) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vendors.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createAt: 'desc' },
      }),
      this.prisma.vendors.count({ where }),
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

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendors.findFirst({
      where: { vendorId: id, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return this.prisma.vendors.update({
      where: { vendorId: id },
      data: updateVendorDto,
    });
  }

  async softDelete(id: string) {
    const vendor = await this.prisma.vendors.findFirst({
      where: { vendorId: id, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return this.prisma.vendors.update({
      where: { vendorId: id },
      data: { isDeleted: true },
    });
  }

  async updateStatus(id: string, updateVendorStatusDto: UpdateVendorStatusDto) {
    const vendor = await this.prisma.vendors.findFirst({
      where: { vendorId: id, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return this.prisma.vendors.update({
      where: { vendorId: id },
      data: { status: updateVendorStatusDto.status },
    });
  }
}
