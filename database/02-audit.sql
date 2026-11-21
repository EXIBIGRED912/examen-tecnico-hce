CREATE OR ALTER TRIGGER dbo.trg_Productos_Auditoria
ON dbo.Productos
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'Productos',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_CompraCab_Auditoria
ON dbo.CompraCab
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'CompraCab',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_CompraDet_Auditoria
ON dbo.CompraDet
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'CompraDet',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_VentaCab_Auditoria
ON dbo.VentaCab
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'VentaCab',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_VentaDet_Auditoria
ON dbo.VentaDet
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'VentaDet',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_MovimientoCab_Auditoria
ON dbo.MovimientoCab
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'MovimientoCab',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_MovimientoDet_Auditoria
ON dbo.MovimientoDet
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
        RETURN;

    DECLARE @Before nvarchar(max), @After nvarchar(max);
    IF EXISTS (SELECT 1 FROM deleted)
        SELECT @Before = (SELECT * FROM deleted FOR JSON PATH, INCLUDE_NULL_VALUES);
    IF EXISTS (SELECT 1 FROM inserted)
        SELECT @After = (SELECT * FROM inserted FOR JSON PATH, INCLUDE_NULL_VALUES);

    INSERT dbo.Auditoria(Tabla, Operacion, PrincipalSql, UsuarioAplicacion, Antes, Despues)
    VALUES (N'MovimientoDet',
        CASE WHEN @Before IS NULL THEN 'INSERT' WHEN @After IS NULL THEN 'DELETE' ELSE 'UPDATE' END,
        ORIGINAL_LOGIN(), TRY_CONVERT(nvarchar(128), SESSION_CONTEXT(N'usuario')), @Before, @After);
END;
GO
