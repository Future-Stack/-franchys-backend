import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateLineItemCustomizationDto {
  // Columns
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showQuantity?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showItemNumber?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCategory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDescription?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showColor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showMarkup?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showPrice?: boolean;

  // Adult Sizes
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdultXS?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdultS?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdultM?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdultL?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdultXL?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdult2XL?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdult3XL?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeAdult4XL?: boolean;

  // Youth Sizes
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeYouthXS?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeYouthS?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeYouthM?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeYouthL?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeYouthXL?: boolean;

  // Toddler Sizes
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeToddler2T?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeToddler3T?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeToddler4T?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeToddler5T?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeToddler6T?: boolean;

  // Baby / Infant Sizes
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBabyNewborn?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby3Months?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby6Months?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby9Months?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby12Months?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby18Months?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sizeBaby24Months?: boolean;
}
