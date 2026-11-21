CREATE OR ALTER PROCEDURE dbo.usp_InventoryRegister
    @MovementType tinyint,
    @Lines nvarchar(max),
    @RequestId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @MovementType IS NULL OR @MovementType NOT IN (1, 2)
        OR @Lines IS NULL OR ISJSON(@Lines, ARRAY) <> 1
        THROW 51003, N'El documento requiere un arreglo de líneas válido.', 1;

    DECLARE @Items TABLE (
        productId int NULL,
        quantity int NULL,
        inputPrice decimal(38,10) NULL,
        price decimal(13,2) NULL,
        subtotal decimal(25,2) NULL,
        igv decimal(25,2) NULL,
        total decimal(25,2) NULL
    );

    INSERT @Items(productId, quantity, inputPrice)
    SELECT TRY_CONVERT(int, productId), TRY_CONVERT(int, quantity), TRY_CONVERT(decimal(38,10), price)
    FROM OPENJSON(@Lines)
    WITH (productId nvarchar(100), quantity nvarchar(100), price nvarchar(100));

    DECLARE @ItemCount int = @@ROWCOUNT;

    IF @ItemCount NOT BETWEEN 1 AND 100 OR EXISTS (
        SELECT 1
        FROM @Items
        WHERE productId IS NULL OR productId <= 0 OR quantity IS NULL OR quantity NOT BETWEEN 1 AND 1000000
            OR (@MovementType = 1 AND (inputPrice IS NULL OR inputPrice < 0
                OR inputPrice > 9999999999.99 OR inputPrice <> ROUND(inputPrice, 2)))
    )
        THROW 51003, N'El documento debe tener de 1 a 100 líneas válidas.', 1;

    IF EXISTS (SELECT productId FROM @Items GROUP BY productId HAVING COUNT(*) > 1)
        THROW 51003, N'El producto no se puede repetir en el mismo documento.', 1;

    DECLARE @Hash binary(32), @ExistingHash binary(32), @DocumentId int;
    IF @RequestId IS NOT NULL
    BEGIN
        DECLARE @Canonical nvarchar(max) = (
            SELECT productId, quantity,
                CASE WHEN @MovementType = 1 THEN CONVERT(decimal(12,2), inputPrice) END AS price
            FROM @Items
            ORDER BY productId
            FOR JSON PATH
        );
        SET @Hash = HASHBYTES('SHA2_256', @Canonical);
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LockResult int;
        -- Serializa verificaciones y cambios de stock entre compras y ventas.
        EXEC @LockResult = sys.sp_getapplock
            @Resource = N'HceInventory.Stock', @LockMode = 'Exclusive',
            @LockOwner = 'Transaction', @LockTimeout = 10000;
        IF @LockResult < 0
            THROW 51006, N'Inventario ocupado. Vuelve a intentar la operación.', 1;

        IF @RequestId IS NOT NULL
        BEGIN
            SELECT @DocumentId = id, @ExistingHash = requestHash
            FROM dbo.v_DocumentoInventario
            WHERE movementType = @MovementType AND requestId = @RequestId;

            IF @DocumentId IS NOT NULL
            BEGIN
                IF @ExistingHash <> @Hash
                    THROW 51005, N'La clave de idempotencia ya pertenece a otro contenido.', 1;

                COMMIT TRANSACTION;
                SELECT id, registeredAt, subtotal, igv, total
                FROM dbo.v_DocumentoInventario
                WHERE movementType = @MovementType AND id = @DocumentId;
                RETURN;
            END;
        END;

        -- Mantiene el precio actual y los productos bloqueados hasta confirmar el documento.
        UPDATE i
        SET price = CASE WHEN @MovementType = 1 THEN i.inputPrice ELSE p.PrecioVenta END
        FROM @Items AS i
        INNER JOIN dbo.Productos AS p WITH (UPDLOCK, HOLDLOCK) ON p.Id_producto = i.productId;

        IF @@ROWCOUNT <> @ItemCount
            THROW 51001, N'Uno de los productos indicados no existe.', 1;

        IF @MovementType = 2 AND EXISTS (
            SELECT 1
            FROM @Items AS i
            INNER JOIN dbo.v_ProductoStock AS p ON p.id = i.productId
            WHERE i.quantity > p.stock
        )
            THROW 51002, N'La cantidad no puede ser mayor al stock disponible.', 1;

        DECLARE @TaxFactor decimal(4,2) = CASE WHEN @MovementType = 1 THEN 0.18 ELSE 1.18 END;
        UPDATE @Items SET subtotal = quantity * price;
        UPDATE @Items SET igv = ROUND(subtotal * @TaxFactor, 2);
        UPDATE @Items SET total = subtotal + igv;

        DECLARE @Subtotal decimal(38,2), @Igv decimal(38,2), @Total decimal(38,2);
        SELECT @Subtotal = SUM(subtotal), @Igv = SUM(igv), @Total = SUM(total)
        FROM @Items;

        -- Mantiene todos los centavos representables al devolver números JSON.
        IF @Total > 9999999999999.99
            THROW 51003, N'El importe total excede el máximo admitido de S/ 9 999 999 999 999.99.', 1;

        DECLARE @RegisteredAt datetime2(3) = SYSUTCDATETIME();

        IF @MovementType = 1
        BEGIN
            INSERT dbo.CompraCab(FecRegistro, SubTotal, Igv, Total, IdSolicitud, HuellaSolicitud)
            VALUES (@RegisteredAt, @Subtotal, @Igv, @Total, @RequestId, @Hash);
            SET @DocumentId = CONVERT(int, SCOPE_IDENTITY());

            INSERT dbo.CompraDet(Id_CompraCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
            SELECT @DocumentId, productId, quantity, price, subtotal, igv, total FROM @Items;

            UPDATE p
            SET Costo = i.price, PrecioVenta = ROUND(i.price * 1.35, 2)
            FROM dbo.Productos AS p
            INNER JOIN @Items AS i ON i.productId = p.Id_producto;
        END;
        ELSE
        BEGIN
            INSERT dbo.VentaCab(FecRegistro, SubTotal, Igv, Total, IdSolicitud, HuellaSolicitud)
            VALUES (@RegisteredAt, @Subtotal, @Igv, @Total, @RequestId, @Hash);
            SET @DocumentId = CONVERT(int, SCOPE_IDENTITY());

            INSERT dbo.VentaDet(Id_VentaCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
            SELECT @DocumentId, productId, quantity, price, subtotal, igv, total FROM @Items;
        END;

        INSERT dbo.MovimientoCab(Fec_registro, Id_TipoMovimiento, Id_DocumentoOrigen, Id_CompraOrigen, Id_VentaOrigen)
        VALUES (@RegisteredAt, @MovementType, @DocumentId,
            CASE WHEN @MovementType = 1 THEN @DocumentId END,
            CASE WHEN @MovementType = 2 THEN @DocumentId END);

        DECLARE @MovementId int = CONVERT(int, SCOPE_IDENTITY());
        INSERT dbo.MovimientoDet(Id_movimientocab, Id_Producto, Cantidad)
        SELECT @MovementId, productId, quantity FROM @Items;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT id, registeredAt, subtotal, igv, total
    FROM dbo.v_DocumentoInventario
    WHERE movementType = @MovementType AND id = @DocumentId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PurchaseRegister
    @Lines nvarchar(max),
    @RequestId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.usp_InventoryRegister @MovementType = 1, @Lines = @Lines, @RequestId = @RequestId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PurchaseList
    @Id int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, registeredAt, subtotal, igv, total
    FROM dbo.v_DocumentoInventario
    WHERE movementType = 1 AND (@Id IS NULL OR id = @Id)
    ORDER BY registeredAt DESC, id DESC;
    IF @Id IS NOT NULL AND @@ROWCOUNT = 0
        THROW 51001, N'El documento indicado no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_PurchaseDetail
    @Id int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_producto AS productId, Cantidad AS quantity, Precio AS price,
        Sub_Total AS subtotal, Igv AS igv, Total AS total
    FROM dbo.CompraDet
    WHERE Id_CompraCab = @Id
    ORDER BY Id_CompraDet;
    IF @@ROWCOUNT = 0
        THROW 51001, N'El documento indicado no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SaleRegister
    @Lines nvarchar(max),
    @RequestId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.usp_InventoryRegister @MovementType = 2, @Lines = @Lines, @RequestId = @RequestId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SaleList
    @Id int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, registeredAt, subtotal, igv, total
    FROM dbo.v_DocumentoInventario
    WHERE movementType = 2 AND (@Id IS NULL OR id = @Id)
    ORDER BY registeredAt DESC, id DESC;
    IF @Id IS NOT NULL AND @@ROWCOUNT = 0
        THROW 51001, N'El documento indicado no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_SaleDetail
    @Id int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_producto AS productId, Cantidad AS quantity, Precio AS price,
        Sub_Total AS subtotal, Igv AS igv, Total AS total
    FROM dbo.VentaDet
    WHERE Id_VentaCab = @Id
    ORDER BY Id_VentaDet;
    IF @@ROWCOUNT = 0
        THROW 51001, N'El documento indicado no existe.', 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_KardexList
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.usp_ProductList;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_KardexMovements
    @ProductId int
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Id_producto = @ProductId)
        THROW 51001, N'El producto indicado no existe.', 1;

    SELECT d.Id_MovimientoDet AS id, c.Fec_registro AS registeredAt,
        CASE c.Id_TipoMovimiento WHEN 1 THEN N'Entrada' ELSE N'Salida' END AS type,
        d.Cantidad AS quantity
    FROM dbo.MovimientoDet AS d
    INNER JOIN dbo.MovimientoCab AS c ON c.Id_MovimientoCab = d.Id_movimientocab
    WHERE d.Id_Producto = @ProductId
    ORDER BY c.Fec_registro DESC, c.Id_MovimientoCab DESC;
END;
GO
