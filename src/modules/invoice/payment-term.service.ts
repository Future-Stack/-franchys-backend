import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentTermDto, UpdatePaymentTermDto } from './dto/payment-term.dto';

@Injectable()
export class PaymentTermService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentTermDto) {
    return this.prisma.paymentTerm.create({ data: dto });
  }

  async findAll() {
    return this.prisma.paymentTerm.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const term = await this.prisma.paymentTerm.findUnique({ where: { id } });
    if (!term) throw new NotFoundException(`PaymentTerm ${id} not found`);
    return term;
  }

  async update(id: string, dto: UpdatePaymentTermDto) {
    await this.findOne(id);
    return this.prisma.paymentTerm.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.paymentTerm.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
