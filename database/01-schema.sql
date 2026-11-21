IF DB_ID(N'HceInventory') IS NULL
    CREATE DATABASE HceInventory;
GO
USE HceInventory;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Productos (
        Id_producto int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Productos PRIMARY KEY,
        Nombre_producto nvarchar(120) NOT NULL,
        NroLote nvarchar(60) NOT NULL,
        Fec_registro datetime2(3) NOT NULL CONSTRAINT DF_Productos_Fecha DEFAULT SYSUTCDATETIME(),
        Costo decimal(12,2) NOT NULL,
        PrecioVenta decimal(13,2) NOT NULL,
        CONSTRAINT UQ_Productos_Nombre_Lote UNIQUE (Nombre_producto, NroLote),
        CONSTRAINT CK_Productos_Nombre CHECK (LEN(TRIM(Nombre_producto)) > 0),
        CONSTRAINT CK_Productos_Lote CHECK (LEN(TRIM(NroLote)) > 0),
        CONSTRAINT CK_Productos_Precios CHECK (Costo >= 0 AND PrecioVenta = ROUND(Costo * 1.35, 2))
    );
END;

IF OBJECT_ID(N'dbo.CompraCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompraCab (
        Id_CompraCab int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompraCab PRIMARY KEY,
        FecRegistro datetime2(3) NOT NULL CONSTRAINT DF_CompraCab_Fecha DEFAULT SYSUTCDATETIME(),
        SubTotal decimal(18,2) NOT NULL,
        Igv decimal(18,2) NOT NULL,
        Total decimal(18,2) NOT NULL,
        IdSolicitud uniqueidentifier NULL,
        HuellaSolicitud binary(32) NULL,
        CONSTRAINT CK_CompraCab_Totales CHECK (SubTotal >= 0 AND Igv >= 0 AND Total = SubTotal + Igv),
        CONSTRAINT CK_CompraCab_Solicitud CHECK (
            (IdSolicitud IS NULL AND HuellaSolicitud IS NULL)
            OR (IdSolicitud IS NOT NULL AND HuellaSolicitud IS NOT NULL)
        )
    );
    CREATE UNIQUE INDEX UX_CompraCab_Solicitud ON dbo.CompraCab(IdSolicitud) WHERE IdSolicitud IS NOT NULL;
END;

IF OBJECT_ID(N'dbo.CompraDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompraDet (
        Id_CompraDet int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CompraDet PRIMARY KEY,
        Id_CompraCab int NOT NULL CONSTRAINT FK_CompraDet_Cab REFERENCES dbo.CompraCab(Id_CompraCab),
        Id_producto int NOT NULL CONSTRAINT FK_CompraDet_Producto REFERENCES dbo.Productos(Id_producto),
        Cantidad int NOT NULL,
        Precio decimal(13,2) NOT NULL,
        Sub_Total decimal(18,2) NOT NULL,
        Igv decimal(18,2) NOT NULL,
        Total decimal(18,2) NOT NULL,
        CONSTRAINT UQ_CompraDet_Cab_Producto UNIQUE (Id_CompraCab, Id_producto),
        CONSTRAINT CK_CompraDet_Importes CHECK (Cantidad > 0 AND Precio >= 0
            AND Sub_Total = Cantidad * Precio AND Igv = ROUND(Sub_Total * 0.18, 2) AND Total = Sub_Total + Igv)
    );
    CREATE INDEX IX_CompraDet_Producto ON dbo.CompraDet(Id_producto);
END;

IF OBJECT_ID(N'dbo.VentaCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VentaCab (
        Id_VentaCab int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VentaCab PRIMARY KEY,
        FecRegistro datetime2(3) NOT NULL CONSTRAINT DF_VentaCab_Fecha DEFAULT SYSUTCDATETIME(),
        SubTotal decimal(18,2) NOT NULL,
        Igv decimal(18,2) NOT NULL,
        Total decimal(18,2) NOT NULL,
        IdSolicitud uniqueidentifier NULL,
        HuellaSolicitud binary(32) NULL,
        CONSTRAINT CK_VentaCab_Totales CHECK (SubTotal >= 0 AND Igv >= 0 AND Total = SubTotal + Igv),
        CONSTRAINT CK_VentaCab_Solicitud CHECK (
            (IdSolicitud IS NULL AND HuellaSolicitud IS NULL)
            OR (IdSolicitud IS NOT NULL AND HuellaSolicitud IS NOT NULL)
        )
    );
    CREATE UNIQUE INDEX UX_VentaCab_Solicitud ON dbo.VentaCab(IdSolicitud) WHERE IdSolicitud IS NOT NULL;
END;

IF OBJECT_ID(N'dbo.VentaDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VentaDet (
        Id_VentaDet int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VentaDet PRIMARY KEY,
        Id_VentaCab int NOT NULL CONSTRAINT FK_VentaDet_Cab REFERENCES dbo.VentaCab(Id_VentaCab),
        Id_producto int NOT NULL CONSTRAINT FK_VentaDet_Producto REFERENCES dbo.Productos(Id_producto),
        Cantidad int NOT NULL,
        Precio decimal(13,2) NOT NULL,
        Sub_Total decimal(18,2) NOT NULL,
        Igv decimal(18,2) NOT NULL,
        Total decimal(18,2) NOT NULL,
        CONSTRAINT UQ_VentaDet_Cab_Producto UNIQUE (Id_VentaCab, Id_producto),
        CONSTRAINT CK_VentaDet_Importes CHECK (Cantidad > 0 AND Precio >= 0
            AND Sub_Total = Cantidad * Precio AND Igv = ROUND(Sub_Total * 1.18, 2) AND Total = Sub_Total + Igv)
    );
    CREATE INDEX IX_VentaDet_Producto ON dbo.VentaDet(Id_producto);
END;

IF OBJECT_ID(N'dbo.MovimientoCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MovimientoCab (
        Id_MovimientoCab int IDENTITY(1,1) NOT NULL CONSTRAINT PK_MovimientoCab PRIMARY KEY,
        Fec_registro datetime2(3) NOT NULL CONSTRAINT DF_MovimientoCab_Fecha DEFAULT SYSUTCDATETIME(),
        Id_TipoMovimiento tinyint NOT NULL,
        Id_DocumentoOrigen int NOT NULL,
        Id_CompraOrigen int NULL CONSTRAINT FK_MovimientoCab_Compra REFERENCES dbo.CompraCab(Id_CompraCab),
        Id_VentaOrigen int NULL CONSTRAINT FK_MovimientoCab_Venta REFERENCES dbo.VentaCab(Id_VentaCab),
        CONSTRAINT UQ_MovimientoCab_Tipo_Origen UNIQUE (Id_TipoMovimiento, Id_DocumentoOrigen),
        CONSTRAINT CK_MovimientoCab_Origen CHECK (
            (Id_TipoMovimiento = 1 AND Id_CompraOrigen IS NOT NULL
                AND Id_CompraOrigen = Id_DocumentoOrigen AND Id_VentaOrigen IS NULL)
            OR (Id_TipoMovimiento = 2 AND Id_VentaOrigen IS NOT NULL
                AND Id_VentaOrigen = Id_DocumentoOrigen AND Id_CompraOrigen IS NULL)
        )
    );
END;

IF OBJECT_ID(N'dbo.MovimientoDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MovimientoDet (
        Id_MovimientoDet int IDENTITY(1,1) NOT NULL CONSTRAINT PK_MovimientoDet PRIMARY KEY,
        Id_movimientocab int NOT NULL CONSTRAINT FK_MovimientoDet_Cab REFERENCES dbo.MovimientoCab(Id_MovimientoCab),
        Id_Producto int NOT NULL CONSTRAINT FK_MovimientoDet_Producto REFERENCES dbo.Productos(Id_producto),
        Cantidad int NOT NULL CONSTRAINT CK_MovimientoDet_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT UQ_MovimientoDet_Cab_Producto UNIQUE (Id_movimientocab, Id_Producto)
    );
    CREATE INDEX IX_MovimientoDet_Producto ON dbo.MovimientoDet(Id_Producto, Id_movimientocab) INCLUDE (Cantidad);
END;

IF OBJECT_ID(N'dbo.Auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Auditoria (
        Id_Auditoria bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Auditoria PRIMARY KEY,
        Tabla sysname NOT NULL,
        Operacion varchar(6) NOT NULL CONSTRAINT CK_Auditoria_Operacion CHECK (Operacion IN ('INSERT', 'UPDATE', 'DELETE')),
        Fecha datetime2(3) NOT NULL CONSTRAINT DF_Auditoria_Fecha DEFAULT SYSUTCDATETIME(),
        PrincipalSql sysname NOT NULL,
        UsuarioAplicacion nvarchar(128) NULL,
        Antes nvarchar(max) NULL,
        Despues nvarchar(max) NULL
    );
    CREATE INDEX IX_Auditoria_Tabla_Fecha ON dbo.Auditoria(Tabla, Fecha DESC);
END;

COMMIT TRANSACTION;
GO

CREATE OR ALTER VIEW dbo.v_ProductoStock
AS
SELECT
    p.Id_producto AS id,
    p.Nombre_producto AS name,
    p.NroLote AS lot,
    p.Fec_registro AS registeredAt,
    p.Costo AS cost,
    p.PrecioVenta AS salePrice,
    COALESCE(m.Stock, CONVERT(bigint, 0)) AS stock
FROM dbo.Productos AS p
LEFT JOIN (
    SELECT d.Id_Producto,
        SUM(CASE c.Id_TipoMovimiento
            WHEN 1 THEN CONVERT(bigint, d.Cantidad)
            ELSE -CONVERT(bigint, d.Cantidad)
        END) AS Stock
    FROM dbo.MovimientoDet AS d
    INNER JOIN dbo.MovimientoCab AS c ON c.Id_MovimientoCab = d.Id_movimientocab
    GROUP BY d.Id_Producto
) AS m ON m.Id_Producto = p.Id_producto;
GO

CREATE OR ALTER VIEW dbo.v_DocumentoInventario
AS
SELECT CONVERT(tinyint, 1) AS movementType, Id_CompraCab AS id,
    FecRegistro AS registeredAt, SubTotal AS subtotal, Igv AS igv, Total AS total,
    IdSolicitud AS requestId, HuellaSolicitud AS requestHash
FROM dbo.CompraCab
UNION ALL
SELECT CONVERT(tinyint, 2), Id_VentaCab, FecRegistro, SubTotal, Igv, Total,
    IdSolicitud, HuellaSolicitud
FROM dbo.VentaCab;
GO
