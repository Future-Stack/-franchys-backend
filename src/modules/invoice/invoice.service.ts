import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateInvoiceFeeDto,
  UpdateInvoiceFeeDto,
} from './dto/invoice-fees.dto';
import { UpdateInvoiceInformationDto } from './dto/invoice-information.dto';

@Injectable()
export class InvoiceService implements OnModuleInit {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.invoiceInformation.count();
    if (count === 0) {
      await this.prisma.invoiceInformation.create({
        data: {
          currency: 'USD',
          language: 'English',
          termsAndCondition: 'Default terms and conditions.',
          paymentTramsAndCondition: 'Default payment terms and conditions.',
          invoiceTaxRate: 0,
          invoiceSeed: 1,
        },
      });
      this.logger.log('Automatically created default invoice information.');
    } else {
      this.logger.log('Invoice information already exists.');
    }
  }

  // --- Invoice Fees APIs ---

  async createFee(dto: CreateInvoiceFeeDto) {
    return this.prisma.invoiceFees.create({
      data: dto,
    });
  }

  async findAllFees() {
    return this.prisma.invoiceFees.findMany();
  }

  async findOneFee(infId: string) {
    const fee = await this.prisma.invoiceFees.findUnique({
      where: { infId },
    });
    if (!fee) {
      throw new NotFoundException(`Invoice Fee with ID ${infId} not found`);
    }
    return fee;
  }

  async updateFee(infId: string, dto: UpdateInvoiceFeeDto) {
    // Ensure fee exists
    await this.findOneFee(infId);

    return this.prisma.invoiceFees.update({
      where: { infId },
      data: dto,
    });
  }

  async removeFee(infId: string) {
    // Ensure fee exists
    await this.findOneFee(infId);

    await this.prisma.invoiceFees.delete({
      where: { infId },
    });

    return {
      message: 'Invoice fee deleted successfully',
      infId,
    };
  }

  // --- Invoice Information APIs ---

  async getInformation() {
    const info = await this.prisma.invoiceInformation.findFirst();
    if (!info) {
      return this.prisma.invoiceInformation.create({
        data: {
          currency: 'USD',
          language: 'English',
          termsAndCondition: 'Default terms and conditions.',
          paymentTramsAndCondition: 'Default payment terms and conditions.',
          invoiceTaxRate: 0,
          invoiceSeed: 1,
        },
      });
    }
    return info;
  }

  async updateInformation(dto: UpdateInvoiceInformationDto) {
    const info = await this.getInformation();
    return this.prisma.invoiceInformation.update({
      where: { iniId: info.iniId },
      data: dto,
    });
  }
}
