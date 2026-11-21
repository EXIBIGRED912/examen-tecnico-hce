USE HceInventory;
GO
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @Lot nvarchar(60) = CONCAT(N'PRUEBA-', CONVERT(nvarchar(36), NEWID()));
    EXEC dbo.usp_ProductCreate @Name = N'Prueba SQL A', @Lot = @Lot, @Cost = 1.00;
    EXEC dbo.usp_ProductCreate @Name = N'Prueba SQL B', @Lot = @Lot, @Cost = 1.00;
    EXEC dbo.usp_ProductCreate @Name = N'Prueba SQL descartable', @Lot = @Lot, @Cost = 1.00;

    DECLARE @A int = (SELECT id FROM dbo.v_ProductoStock WHERE name = N'Prueba SQL A' AND lot = @Lot);
    DECLARE @B int = (SELECT id FROM dbo.v_ProductoStock WHERE name = N'Prueba SQL B' AND lot = @Lot);
    DECLARE @Unused int = (SELECT id FROM dbo.v_ProductoStock WHERE name = N'Prueba SQL descartable' AND lot = @Lot);
    EXEC dbo.usp_ProductUpdate @Id = @Unused, @Name = N'Prueba SQL actualizada', @Cost = 4.00;

    IF NOT EXISTS (SELECT 1 FROM dbo.v_ProductoStock
        WHERE id = @Unused AND name = N'Prueba SQL actualizada' AND lot = @Lot AND salePrice = 5.40 AND stock = 0)
        THROW 52001, N'Error al actualizar el producto.', 1;

    EXEC dbo.usp_ProductDelete @Id = @Unused;
    IF EXISTS (SELECT 1 FROM dbo.Productos WHERE Id_producto = @Unused)
        THROW 52002, N'Error al eliminar un producto sin movimientos.', 1;

    DECLARE @BuyKey uniqueidentifier = NEWID();
    DECLARE @Buy nvarchar(max) = CONCAT(N'[{"productId":', @A, N',"quantity":10,"price":2.50},{"productId":',
        @B, N',"quantity":3,"price":12.00}]');
    EXEC dbo.usp_PurchaseRegister @Lines = @Buy, @RequestId = @BuyKey;
    SET @Buy = CONCAT(N'[{"productId":', @B, N',"quantity":3,"price":12.00},{"productId":',
        @A, N',"quantity":10,"price":2.50}]');
    EXEC dbo.usp_PurchaseRegister @Lines = @Buy, @RequestId = @BuyKey;

    DECLARE @PurchaseId int = (SELECT Id_CompraCab FROM dbo.CompraCab WHERE IdSolicitud = @BuyKey);
    IF NOT EXISTS (SELECT 1 FROM dbo.CompraCab
        WHERE Id_CompraCab = @PurchaseId AND SubTotal = 61.00 AND Igv = 10.98 AND Total = 71.98)
        OR NOT EXISTS (SELECT 1 FROM dbo.v_ProductoStock WHERE id = @A AND stock = 10 AND cost = 2.50 AND salePrice = 3.38)
        OR NOT EXISTS (SELECT 1 FROM dbo.v_ProductoStock WHERE id = @B AND stock = 3 AND cost = 12.00 AND salePrice = 16.20)
        THROW 52003, N'La compra no coincide con los importes, la actualización de precios o el stock esperado.', 1;

    DECLARE @SaleKey uniqueidentifier = NEWID();
    DECLARE @Sell nvarchar(max) = CONCAT(N'[{"productId":', @A, N',"quantity":2},{"productId":',
        @B, N',"quantity":1}]');
    EXEC dbo.usp_SaleRegister @Lines = @Sell, @RequestId = @SaleKey;
    EXEC dbo.usp_SaleRegister @Lines = @Sell, @RequestId = @SaleKey;

    DECLARE @SaleId int = (SELECT Id_VentaCab FROM dbo.VentaCab WHERE IdSolicitud = @SaleKey);
    IF NOT EXISTS (SELECT 1 FROM dbo.VentaCab
        WHERE Id_VentaCab = @SaleId AND SubTotal = 22.96 AND Igv = 27.10 AND Total = 50.06)
        OR NOT EXISTS (SELECT 1 FROM dbo.v_ProductoStock WHERE id = @A AND stock = 8)
        OR NOT EXISTS (SELECT 1 FROM dbo.v_ProductoStock WHERE id = @B AND stock = 2)
        THROW 52004, N'La venta no coincide con los importes o el stock esperado.', 1;

    DECLARE @Movements TABLE (id int, registeredAt datetime2(3), type nvarchar(7), quantity int);
    INSERT @Movements EXEC dbo.usp_KardexMovements @ProductId = @A;
    IF (SELECT COUNT(*) FROM @Movements) <> 2
        OR NOT EXISTS (SELECT 1 FROM @Movements WHERE type = N'Entrada' AND quantity = 10)
        OR NOT EXISTS (SELECT 1 FROM @Movements WHERE type = N'Salida' AND quantity = 2)
        THROW 52005, N'El Kardex no contiene la entrada y la salida esperadas.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Auditoria WHERE Tabla = N'Productos' AND Operacion = 'UPDATE'
        AND JSON_VALUE(Antes, '$[0].Id_producto') = CONVERT(nvarchar(12), @Unused)
        AND JSON_VALUE(Despues, '$[0].Nombre_producto') = N'Prueba SQL actualizada')
        OR NOT EXISTS (SELECT 1 FROM dbo.Auditoria WHERE Tabla = N'Productos' AND Operacion = 'DELETE'
        AND JSON_VALUE(Antes, '$[0].Id_producto') = CONVERT(nvarchar(12), @Unused) AND Despues IS NULL)
        OR NOT EXISTS (SELECT 1 FROM dbo.Auditoria WHERE Tabla = N'VentaCab' AND Operacion = 'INSERT'
        AND JSON_VALUE(Despues, '$[0].Id_VentaCab') = CONVERT(nvarchar(12), @SaleId) AND Antes IS NULL)
        THROW 52006, N'La auditoría no contiene los eventos esperados.', 1;

    EXEC dbo.usp_PurchaseList @Id = @PurchaseId;
    EXEC dbo.usp_PurchaseDetail @Id = @PurchaseId;
    EXEC dbo.usp_SaleList @Id = @SaleId;
    EXEC dbo.usp_SaleDetail @Id = @SaleId;

    ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

DECLARE @Lot nvarchar(60) = CONCAT(N'PRUEBA-', CONVERT(nvarchar(36), NEWID()));
DECLARE @SaleKey uniqueidentifier = NEWID();
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC dbo.usp_ProductCreate @Name = N'Prueba SQL sin stock', @Lot = @Lot, @Cost = 1.00;
    DECLARE @ProductId int = (SELECT id FROM dbo.v_ProductoStock WHERE lot = @Lot);
    DECLARE @Oversell nvarchar(max) = CONCAT(N'[{"productId":', @ProductId, N',"quantity":1}]');
    EXEC dbo.usp_SaleRegister @Lines = @Oversell, @RequestId = @SaleKey;
    THROW 52007, N'Se aceptó una venta sin stock.', 1;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() <> 51002
        THROW;
END CATCH;
IF EXISTS (SELECT 1 FROM dbo.VentaCab WHERE IdSolicitud = @SaleKey)
    THROW 52008, N'Una venta rechazada dejó una cabecera persistida.', 1;
GO

DECLARE @Lot nvarchar(60) = CONCAT(N'PRUEBA-', CONVERT(nvarchar(36), NEWID()));
DECLARE @PurchaseKey uniqueidentifier = NEWID();
BEGIN TRY
    BEGIN TRANSACTION;
    EXEC dbo.usp_ProductCreate @Name = N'Prueba SQL importe', @Lot = @Lot, @Cost = 1.00;
    DECLARE @ProductId int = (SELECT id FROM dbo.v_ProductoStock WHERE lot = @Lot);
    DECLARE @Expensive nvarchar(max) = CONCAT(N'[{"productId":', @ProductId,
        N',"quantity":1000000,"price":9999999999.99}]');
    EXEC dbo.usp_PurchaseRegister @Lines = @Expensive, @RequestId = @PurchaseKey;
    THROW 52009, N'Se aceptó una compra que supera el importe máximo.', 1;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() <> 51003 OR ERROR_MESSAGE() NOT LIKE N'El importe total%'
        THROW;
END CATCH;
IF EXISTS (SELECT 1 FROM dbo.CompraCab WHERE IdSolicitud = @PurchaseKey)
    THROW 52010, N'Una compra rechazada dejó una cabecera persistida.', 1;

PRINT N'Verificación SQL correcta. Los datos de prueba se revirtieron.';
GO
