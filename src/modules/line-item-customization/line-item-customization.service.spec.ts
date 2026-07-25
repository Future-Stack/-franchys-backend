import { Test, TestingModule } from '@nestjs/testing';
import { LineItemCustomizationService } from './line-item-customization.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  lineItemCustomization: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('LineItemCustomizationService', () => {
  let service: LineItemCustomizationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineItemCustomizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LineItemCustomizationService>(
      LineItemCustomizationService,
    );
  });

  it('should create default customization if none exists', async () => {
    mockPrisma.lineItemCustomization.findFirst.mockResolvedValue(null);
    mockPrisma.lineItemCustomization.create.mockResolvedValue({
      id: 'customization-1',
      showQuantity: true,
      showItemNumber: false,
      showCategory: false,
      showDescription: true,
      showColor: false,
      showMarkup: false,
      showPrice: true,
      sizeAdultS: true,
      sizeAdultM: true,
      sizeAdultL: true,
      sizeAdultXL: true,
    });

    const result = await service.getCustomization();
    expect(mockPrisma.lineItemCustomization.create).toHaveBeenCalled();
    expect(result.id).toBe('customization-1');
  });

  it('should return structured customization options correctly per category', async () => {
    mockPrisma.lineItemCustomization.findFirst.mockResolvedValue({
      id: 'customization-1',
      showQuantity: true,
      showItemNumber: true,
      showCategory: false,
      showDescription: true,
      showColor: true,
      showMarkup: false,
      showPrice: true,
      sizeAdultS: true,
      sizeAdultM: true,
      sizeYouthS: true,
      sizeToddler2T: true,
      sizeBabyNewborn: true,
    });

    const structured = await service.getStructuredCustomization();

    expect(structured.columns.itemNumber).toBe(true);
    expect(structured.columns.color).toBe(true);

    const adultS = structured.sizingOptions.adultSizes.find(
      (s) => s.size === 'S',
    );
    expect(adultS?.selected).toBe(true);

    const adultXS = structured.sizingOptions.adultSizes.find(
      (s) => s.size === 'XS',
    );
    expect(adultXS?.selected).toBeFalsy();

    const youthS = structured.sizingOptions.youthSizes.find(
      (s) => s.size === 'Youth S',
    );
    expect(youthS?.selected).toBe(true);

    const toddler2T = structured.sizingOptions.toddlerSizes.find(
      (s) => s.size === '2T',
    );
    expect(toddler2T?.selected).toBe(true);
  });

  it('should return combined flat array of selected sizes', async () => {
    mockPrisma.lineItemCustomization.findFirst.mockResolvedValue({
      id: 'customization-1',
      sizeAdultS: true,
      sizeAdultM: true,
      sizeYouthL: true,
      sizeBabyNewborn: true,
    });

    const sizes = await service.getSelectedSizesArray();
    expect(sizes).toEqual(['S', 'M', 'Youth L', 'Newborn']);
  });

  it('should update customization settings', async () => {
    mockPrisma.lineItemCustomization.findFirst.mockResolvedValue({
      id: 'customization-1',
    });
    mockPrisma.lineItemCustomization.update.mockResolvedValue({
      id: 'customization-1',
      showColor: true,
    });

    await service.updateCustomization({ showColor: true });
    expect(mockPrisma.lineItemCustomization.update).toHaveBeenCalledWith({
      where: { id: 'customization-1' },
      data: { showColor: true },
    });
  });
});
