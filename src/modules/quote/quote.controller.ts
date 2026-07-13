import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';

@ApiTags('Quote')
@ApiBearerAuth()
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quoteService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.quoteService.findAll(status, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by ID' })
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quoteService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote by ID' })
  remove(@Param('id') id: string) {
    return this.quoteService.remove(id);
  }
}
