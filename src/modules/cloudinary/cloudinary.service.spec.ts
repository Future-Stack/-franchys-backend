import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import sharp from 'sharp';

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeImageBuffer', () => {
    it('should return original buffer if file is non-image (e.g., pdf)', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4 test content');
      const fakeFile: any = {
        buffer: fakePdfBuffer,
        mimetype: 'application/pdf',
        originalname: 'mockup.pdf',
      };

      const result = await service.optimizeImageBuffer(fakeFile);
      expect(result).toBe(fakePdfBuffer);
    });

    it('should return original buffer if file is svg', async () => {
      const svgBuffer = Buffer.from('<svg><circle r="10"/></svg>');
      const fakeFile: any = {
        buffer: svgBuffer,
        mimetype: 'image/svg+xml',
        originalname: 'logo.svg',
      };

      const result = await service.optimizeImageBuffer(fakeFile);
      expect(result).toBe(svgBuffer);
    });

    it('should optimize and resize oversized image buffer (e.g. > 2048px)', async () => {
      // Create a 2500x2500 test image using sharp
      const largeImageBuffer = await sharp({
        create: {
          width: 2500,
          height: 2500,
          channels: 3,
          background: { r: 200, g: 150, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const fakeFile: any = {
        buffer: largeImageBuffer,
        mimetype: 'image/jpeg',
        originalname: 'large-product.jpg',
      };

      const optimizedBuffer = await service.optimizeImageBuffer(fakeFile);
      expect(optimizedBuffer).toBeDefined();

      const metadata = await sharp(optimizedBuffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(2048);
      expect(metadata.height).toBeLessThanOrEqual(2048);
    });
  });
});
