-- =============================================
-- Migration: Add ProductImage table
-- One Product can have many images
-- Run against your Yarne database (YarneDb or Yarne1.0)
-- Example: USE [YarneDb]; or USE [Yarne1.0];
-- =============================================

-- Create ProductImage table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductImage')
BEGIN
    CREATE TABLE ProductImage (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        ProductId     INT            NOT NULL,
        ImageUrl      NVARCHAR(500)  NOT NULL,
        SortOrder     INT            NOT NULL DEFAULT 0,
        IsPrimary     BIT            NOT NULL DEFAULT 0,
        CreatedAt     DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ProductImage_Product FOREIGN KEY (ProductId) 
            REFERENCES Product(Id) ON DELETE CASCADE,
        CONSTRAINT CHK_ProductImage_Url CHECK (LEN(LTRIM(RTRIM(ImageUrl))) > 0)
    );

    CREATE INDEX IX_ProductImage_ProductId ON ProductImage(ProductId);
    
    PRINT 'ProductImage table created successfully.';

    -- Seed: migrate existing Product.ImageUrl to ProductImage (if any products have ImageUrl set)
    INSERT INTO ProductImage (ProductId, ImageUrl, SortOrder, IsPrimary)
    SELECT Id, ImageUrl, 0, 1
    FROM Product
    WHERE ImageUrl IS NOT NULL AND LEN(LTRIM(RTRIM(ImageUrl))) > 0;
END
ELSE
BEGIN
    PRINT 'ProductImage table already exists.';
END
GO
