SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @RequestId uniqueidentifier = 'e31ae3a4-3fde-4ae0-95ba-4ab311c40a4b';

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @LockResult int;
    EXEC @LockResult = sys.sp_getapplock
        @Resource = N'HceInventory.Stock', @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @LockResult < 0
        THROW 51006, N'Inventario ocupado durante la carga de demostración.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.CompraCab WHERE IdSolicitud = @RequestId)
    BEGIN
        DECLARE @Demo TABLE (Nombre nvarchar(120), Lote nvarchar(60), Costo decimal(12,2), Cantidad int);
        INSERT @Demo(Nombre, Lote, Costo, Cantidad)
        VALUES (N'Paracetamol 500 mg', N'DEMO-PAR-01', 2.50, 50),
            (N'Guantes de nitrilo M', N'DEMO-GUA-01', 12.00, 25),
            (N'Suero fisiológico 500 mL', N'DEMO-SUE-01', 6.00, 30);

        INSERT dbo.Productos(Nombre_producto, NroLote, Costo, PrecioVenta)
        SELECT d.Nombre, d.Lote, d.Costo, ROUND(d.Costo * 1.35, 2)
        FROM @Demo AS d
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Productos AS p
            WHERE p.Nombre_producto = d.Nombre AND p.NroLote = d.Lote
        );

        DECLARE @Lines nvarchar(max) = (
            SELECT p.Id_producto AS productId, d.Cantidad AS quantity, d.Costo AS price
            FROM @Demo AS d
            INNER JOIN dbo.Productos AS p ON p.Nombre_producto = d.Nombre AND p.NroLote = d.Lote
            ORDER BY p.Id_producto
            FOR JSON PATH
        );
        EXEC dbo.usp_PurchaseRegister @Lines = @Lines, @RequestId = @RequestId;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
