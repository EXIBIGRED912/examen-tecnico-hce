import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString,
  Max, MaxLength, Min, ValidateBy, ValidateIf, ValidateNested, isUUID,
} from 'class-validator';
import type { Document, DocumentHeader, DocumentItem, Movement, NewProduct, Product, PurchaseItem, SaleItem } from '../shared/contracts';

const MAX_ID = 2_147_483_647;
const MAX_QUANTITY = 1_000_000;
const MAX_COST = 9_999_999_999.99;

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function IsMoney(): PropertyDecorator {
  return ValidateBy({
    name: 'isMoney',
    validator: {
      validate: (value: unknown) => typeof value === 'number' && /^\d+(?:\.\d{1,2})?$/.test(String(value)) && value <= MAX_COST,
      defaultMessage: () => 'El importe debe estar dentro del rango permitido y tener hasta dos decimales.',
    },
  });
}

export class IdDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_ID })
  @Transform(({ value }) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN)
  @IsInt({ message: 'El identificador debe ser un entero válido.' })
  @Min(1)
  @Max(MAX_ID)
  id!: number;
}

export function parseIdempotencyKey(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !isUUID(value, 'all')) {
    throw new BadRequestException('Idempotency-Key debe ser un UUID válido.');
  }
  return value;
}

export class SearchDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class LoginDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  username!: string;

  @ApiProperty({ maxLength: 256, format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password!: string;
}

export class SessionDto {
  @ApiProperty() username!: string;
  @ApiProperty({ description: 'Segundos restantes de la sesión.', example: 1800 }) expiresIn!: number;
}

export class CreateProductDto implements NewProduct {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ maxLength: 60 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lot!: string;

  @ApiProperty({ minimum: 0, maximum: MAX_COST, multipleOf: 0.01 })
  @IsMoney()
  cost!: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto, { skipNullProperties: false }) {}

export class ProductDto extends CreateProductDto implements Product {
  @ApiProperty({ type: 'integer' }) id!: number;
  @ApiProperty({ format: 'date-time' }) registeredAt!: string;
  @ApiProperty() salePrice!: number;
  @ApiProperty({ type: 'integer' }) stock!: number;
}

export class SaleItemDto implements SaleItem {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_ID })
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  productId!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;
}

export class PurchaseItemDto extends SaleItemDto implements PurchaseItem {
  @ApiProperty({ minimum: 0, maximum: MAX_COST, multipleOf: 0.01 })
  @IsMoney()
  price!: number;
}

export class RegisterSaleDto {
  @ApiProperty({ type: [SaleItemDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}

export class RegisterPurchaseDto {
  @ApiProperty({ type: [PurchaseItemDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

export class DocumentHeaderDto implements DocumentHeader {
  @ApiProperty({ type: 'integer' }) id!: number;
  @ApiProperty({ format: 'date-time' }) registeredAt!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() igv!: number;
  @ApiProperty() total!: number;
}

export class DocumentItemDto implements DocumentItem {
  @ApiProperty({ type: 'integer' }) productId!: number;
  @ApiProperty({ type: 'integer' }) quantity!: number;
  @ApiProperty() price!: number;
  @ApiProperty() subtotal!: number;
  @ApiProperty() igv!: number;
  @ApiProperty() total!: number;
}

export class DocumentDto extends DocumentHeaderDto implements Document {
  @ApiProperty({ type: [DocumentItemDto] }) items!: DocumentItemDto[];
}

export class MovementDto implements Movement {
  @ApiProperty({ type: 'integer' }) id!: number;
  @ApiProperty({ format: 'date-time' }) registeredAt!: string;
  @ApiProperty({ enum: ['Entrada', 'Salida'] }) type!: Movement['type'];
  @ApiProperty({ type: 'integer' }) quantity!: number;
}
