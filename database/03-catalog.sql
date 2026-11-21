CREATE OR ALTER PROCEDURE dbo.usp_ProductGet
    @Id int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, name, lot, registeredAt, cost, salePrice, stock
    FROM dbo.v_ProductoStock
    WHERE id = @Id;
    IF @@ROWCOUNT = 0
        THROW 51001, N'El producto indicado no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ProductList
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, name, lot, registeredAt, cost, salePrice, stock
    FROM dbo.v_ProductoStock
    ORDER BY name, lot, id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ProductCreate
    @Name nvarchar(120),
    @Lot nvarchar(60),
    @Cost decimal(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    IF NULLIF(TRIM(@Name), N'') IS NULL OR NULLIF(TRIM(@Lot), N'') IS NULL
        OR @Cost IS NULL OR @Cost < 0
        THROW 51003, N'Nombre, lote y costo del producto son requeridos.', 1;

    BEGIN TRY
        INSERT dbo.Productos(Nombre_producto, NroLote, Costo, PrecioVenta)
        VALUES (TRIM(@Name), TRIM(@Lot), @Cost, ROUND(@Cost * 1.35, 2));
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 51004, N'Ya existe un producto con ese nombre y lote.', 1;
        THROW;
    END CATCH;

    DECLARE @Id int = CONVERT(int, SCOPE_IDENTITY());
    EXEC dbo.usp_ProductGet @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ProductUpdate
    @Id int,
    @Name nvarchar(120) = NULL,
    @Lot nvarchar(60) = NULL,
    @Cost decimal(12,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF (@Name IS NULL AND @Lot IS NULL AND @Cost IS NULL)
        OR TRIM(@Name) = N'' OR TRIM(@Lot) = N'' OR @Cost < 0
        THROW 51003, N'Indica al menos un campo válido del producto.', 1;

    BEGIN TRY
        UPDATE dbo.Productos
        SET Nombre_producto = COALESCE(TRIM(@Name), Nombre_producto),
            NroLote = COALESCE(TRIM(@Lot), NroLote),
            Costo = COALESCE(@Cost, Costo),
            PrecioVenta = COALESCE(ROUND(@Cost * 1.35, 2), PrecioVenta)
        WHERE Id_producto = @Id;

        IF @@ROWCOUNT = 0
            THROW 51001, N'El producto indicado no existe.', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 51004, N'Ya existe un producto con ese nombre y lote.', 1;
        THROW;
    END CATCH;

    EXEC dbo.usp_ProductGet @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ProductDelete
    @Id int
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE dbo.Productos
        WHERE Id_producto = @Id;

        IF @@ROWCOUNT = 0
            THROW 51001, N'El producto indicado no existe.', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() = 547
            THROW 51004, N'El producto ya forma parte del historial de inventario.', 1;
        THROW;
    END CATCH;
END;
GO
