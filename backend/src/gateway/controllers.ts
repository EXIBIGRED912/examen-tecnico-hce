import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse,
  ApiHeader, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiServiceUnavailableResponse,
  ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  CreateProductDto, DocumentDto, DocumentHeaderDto, IdDto, MovementDto, parseIdempotencyKey,
  ProductDto, RegisterPurchaseDto, RegisterSaleDto, SearchDto, UpdateProductDto,
} from './dto';
import { InventoryFacade } from './inventory.facade';
import { ACCESS_COOKIE, Public } from './session';

const idempotencyHeader = {
  name: 'Idempotency-Key',
  required: false,
  description: 'UUID que identifica un registro y permite repetir el mismo envío.',
  schema: { type: 'string', format: 'uuid' },
};

@ApiTags('Estado')
@Controller('health')
export class HealthController {
  constructor(private readonly facade: InventoryFacade) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOkResponse({ description: 'Catálogo, inventario y SQL Server disponibles.' })
  @ApiServiceUnavailableResponse({ description: 'Una dependencia no responde.' })
  health() {
    return this.facade.health();
  }
}

@ApiTags('Productos')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Sesión ausente o vencida.' })
@ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido.' })
@ApiServiceUnavailableResponse({ description: 'Catálogo no disponible.' })
@Controller('products')
export class ProductsController {
  constructor(private readonly facade: InventoryFacade) {}

  @Get()
  @ApiOkResponse({ type: [ProductDto] })
  list(@Query() query: SearchDto) {
    return this.facade.listProducts(query.search);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ description: 'Producto inexistente.' })
  get(@Param() { id }: IdDto) {
    return this.facade.getProduct(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ProductDto })
  @ApiBadRequestResponse({ description: 'Datos del producto inválidos.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  @ApiConflictResponse({ description: 'Ya existe un producto con ese nombre y lote.' })
  create(@Body() product: CreateProductDto) {
    return this.facade.createProduct(product);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductDto })
  @ApiBadRequestResponse({ description: 'Datos del producto inválidos.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  @ApiNotFoundResponse({ description: 'Producto inexistente.' })
  @ApiConflictResponse({ description: 'Ya existe un producto con ese nombre y lote.' })
  update(@Param() { id }: IdDto, @Body() product: UpdateProductDto) {
    return this.facade.updateProduct(id, product);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Producto eliminado.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  @ApiNotFoundResponse({ description: 'Producto inexistente.' })
  @ApiConflictResponse({ description: 'El producto tiene movimientos en el inventario.' })
  async delete(@Param() { id }: IdDto): Promise<void> {
    await this.facade.deleteProduct(id);
  }
}

@ApiTags('Compras')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Sesión ausente o vencida.' })
@ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido.' })
@ApiServiceUnavailableResponse({ description: 'Inventario no disponible.' })
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly facade: InventoryFacade) {}

  @Get()
  @ApiOkResponse({ type: [DocumentHeaderDto] })
  list() {
    return this.facade.listPurchases();
  }

  @Get(':id')
  @ApiOkResponse({ type: DocumentDto })
  @ApiNotFoundResponse({ description: 'Compra inexistente.' })
  get(@Param() { id }: IdDto) {
    return this.facade.getPurchase(id);
  }

  @Post()
  @ApiHeader(idempotencyHeader)
  @ApiCreatedResponse({ type: DocumentHeaderDto })
  @ApiBadRequestResponse({ description: 'Cantidades, importes o clave inválidos.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  @ApiNotFoundResponse({ description: 'Uno de los productos no existe.' })
  @ApiConflictResponse({ description: 'La clave de idempotencia pertenece a otro contenido.' })
  create(@Body() purchase: RegisterPurchaseDto, @Headers('idempotency-key') requestId: unknown) {
    return this.facade.registerPurchase({ items: purchase.items, requestId: parseIdempotencyKey(requestId) });
  }
}

@ApiTags('Ventas')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Sesión ausente o vencida.' })
@ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido.' })
@ApiServiceUnavailableResponse({ description: 'Inventario no disponible.' })
@Controller('sales')
export class SalesController {
  constructor(private readonly facade: InventoryFacade) {}

  @Get()
  @ApiOkResponse({ type: [DocumentHeaderDto] })
  list() {
    return this.facade.listSales();
  }

  @Get(':id')
  @ApiOkResponse({ type: DocumentDto })
  @ApiNotFoundResponse({ description: 'Venta inexistente.' })
  get(@Param() { id }: IdDto) {
    return this.facade.getSale(id);
  }

  @Post()
  @ApiHeader(idempotencyHeader)
  @ApiCreatedResponse({ type: DocumentHeaderDto })
  @ApiBadRequestResponse({ description: 'Cantidades o clave inválidas.' })
  @ApiForbiddenResponse({ description: 'Origen de la solicitud inválido.' })
  @ApiNotFoundResponse({ description: 'Uno de los productos no existe.' })
  @ApiConflictResponse({ description: 'Saldo insuficiente o clave de idempotencia en uso.' })
  create(@Body() sale: RegisterSaleDto, @Headers('idempotency-key') requestId: unknown) {
    return this.facade.registerSale({ items: sale.items, requestId: parseIdempotencyKey(requestId) });
  }
}

@ApiTags('Kardex')
@ApiCookieAuth(ACCESS_COOKIE)
@ApiUnauthorizedResponse({ description: 'Sesión ausente o vencida.' })
@ApiTooManyRequestsResponse({ description: 'Límite de solicitudes excedido.' })
@ApiServiceUnavailableResponse({ description: 'Inventario no disponible.' })
@Controller('kardex')
export class KardexController {
  constructor(private readonly facade: InventoryFacade) {}

  @Get()
  @ApiOkResponse({ type: [ProductDto] })
  list(@Query() query: SearchDto) {
    return this.facade.listKardex(query.search);
  }

  @Get(':id/movements')
  @ApiOkResponse({ type: [MovementDto] })
  @ApiNotFoundResponse({ description: 'Producto inexistente.' })
  movements(@Param() { id }: IdDto) {
    return this.facade.listMovements(id);
  }
}
