-- ProductColorImage: multiple images per product-color
-- First image (lowest SortOrder) = card thumbnail, full list = detail gallery
USE [Yarne1.0];
GO

-- Create ProductColorImage table (FK to ProductColor only to avoid multiple cascade paths)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductColorImage')
BEGIN
    CREATE TABLE ProductColorImage (
        Id        INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        ColorId   INT NOT NULL,
        ImageUrl  NVARCHAR(500) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ProductColorImage_ProductColor
            FOREIGN KEY (ProductId, ColorId) REFERENCES ProductColor(ProductId, ColorId) ON DELETE CASCADE
    );
    CREATE INDEX IX_ProductColorImage_ProductColor ON ProductColorImage(ProductId, ColorId);
END
GO

-- Migrate existing ProductColor.ImageUrl into ProductColorImage
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProductColor') AND name = 'ImageUrl')
BEGIN
    INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder)
    SELECT ProductId, ColorId, ImageUrl, 0
    FROM ProductColor
    WHERE ImageUrl IS NOT NULL AND LTRIM(RTRIM(ImageUrl)) != '';

    ALTER TABLE ProductColor DROP COLUMN ImageUrl;
END
GO
