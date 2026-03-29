-- Add Color table and ProductColor many-to-many
USE [Yarne1.0];
GO

-- Color table: Id, Name, HexCode
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Color')
BEGIN
    CREATE TABLE Color (
        Id    INT IDENTITY(1,1) PRIMARY KEY,
        Name  NVARCHAR(100) NOT NULL,
        HexCode NVARCHAR(20) NOT NULL DEFAULT '#2D241E'
    );
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Color') AND name = 'HexCode')
BEGIN
    ALTER TABLE Color ADD HexCode NVARCHAR(20) NOT NULL DEFAULT '#2D241E';
END
GO

-- ProductColor: Product can have multiple colors
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductColor')
BEGIN
    CREATE TABLE ProductColor (
        ProductId  INT NOT NULL REFERENCES Product(Id) ON DELETE CASCADE,
        ColorId    INT NOT NULL REFERENCES Color(Id) ON DELETE CASCADE,
        ImageUrl   NVARCHAR(500) NULL,
        SortOrder  INT NOT NULL DEFAULT 0,
        PRIMARY KEY (ProductId, ColorId)
    );
END
GO

-- Seed some default colors
IF NOT EXISTS (SELECT 1 FROM Color)
BEGIN
    INSERT INTO Color (Name, HexCode) VALUES
        ('Black', '#1a1a1a'),
        ('White', '#f5f5f5'),
        ('Navy', '#0A1128'),
        ('Burgundy', '#722F37'),
        ('Cream', '#F5F2ED'),
        ('Brown', '#2D241E'),
        ('Gray', '#6B6B6B');
END
GO
