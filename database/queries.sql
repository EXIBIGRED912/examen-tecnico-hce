USE HceInventory;
GO

-- Productos, compras y ventas.
EXEC dbo.usp_ProductList;
EXEC dbo.usp_PurchaseList;
EXEC dbo.usp_SaleList;

-- Productos con saldo y sus entradas y salidas por fecha.
EXEC dbo.usp_KardexList;
DECLARE @ProductId int = (SELECT TOP (1) Id_producto FROM dbo.Productos ORDER BY Id_producto);
IF @ProductId IS NOT NULL
    EXEC dbo.usp_KardexMovements @ProductId = @ProductId;

-- Cambios más recientes, con una fila por sentencia de escritura.
SELECT TOP (50) Id_Auditoria, Tabla, Operacion, Fecha, PrincipalSql, UsuarioAplicacion, Antes, Despues
FROM dbo.Auditoria
ORDER BY Id_Auditoria DESC;
GO
