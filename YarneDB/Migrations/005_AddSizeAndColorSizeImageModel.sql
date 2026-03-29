-- Add size catalog, product sizes, size-scoped color images, and variant stock
USE [Yarne1.0];
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Size')
BEGIN
    CREATE TABLE Size (
        Id   INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL
    );
    CREATE UNIQUE INDEX UX_Size_Name ON Size(Name);
END
GO

IF NOT EXISTS (SELECT 1 FROM Size)
BEGIN
    INSERT INTO Size (Name) VALUES ('XS'), ('S'), ('M'), ('L'), ('XL'), ('One Size');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Product') AND name = 'DefaultSizeId')
BEGIN
    ALTER TABLE Product ADD DefaultSizeId INT NULL;
    ALTER TABLE Product
        ADD CONSTRAINT FK_Product_DefaultSize
        FOREIGN KEY (DefaultSizeId) REFERENCES Size(Id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductSize')
BEGIN
    CREATE TABLE ProductSize (
        ProductId  INT NOT NULL,
        SizeId     INT NOT NULL,
        SortOrder  INT NOT NULL DEFAULT 0,
        PRIMARY KEY (ProductId, SizeId),
        CONSTRAINT FK_ProductSize_Product FOREIGN KEY (ProductId) REFERENCES Product(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ProductSize_Size FOREIGN KEY (SizeId) REFERENCES Size(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ProductSize_Product ON ProductSize(ProductId, SortOrder);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductColorSizeImage')
BEGIN
    CREATE TABLE ProductColorSizeImage (
        Id        INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        ColorId   INT NOT NULL,
        SizeId    INT NOT NULL,
        ImageUrl  NVARCHAR(500) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ProductColorSizeImage_ProductColor
            FOREIGN KEY (ProductId, ColorId) REFERENCES ProductColor(ProductId, ColorId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductColorSizeImage_ProductSize
            FOREIGN KEY (ProductId, SizeId) REFERENCES ProductSize(ProductId, SizeId)
    );
    CREATE INDEX IX_ProductColorSizeImage_Key ON ProductColorSizeImage(ProductId, ColorId, SizeId, SortOrder);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductVariantStock')
BEGIN
    CREATE TABLE ProductVariantStock (
        ProductId       INT NOT NULL,
        ColorId         INT NOT NULL,
        SizeId          INT NOT NULL,
        QuantityInStock INT NOT NULL DEFAULT 0,
        PRIMARY KEY (ProductId, ColorId, SizeId),
        CONSTRAINT FK_ProductVariantStock_ProductColor
            FOREIGN KEY (ProductId, ColorId) REFERENCES ProductColor(ProductId, ColorId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductVariantStock_ProductSize
            FOREIGN KEY (ProductId, SizeId) REFERENCES ProductSize(ProductId, SizeId)
    );
END
GO

-- Ensure each existing product has all standard sizes to preserve existing UI behavior.
INSERT INTO ProductSize (ProductId, SizeId, SortOrder)
SELECT p.Id, s.Id,
       CASE s.Name WHEN 'XS' THEN 0 WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 ELSE 5 END
FROM Product p
CROSS JOIN Size s
WHERE s.Name IN ('XS', 'S', 'M', 'L', 'XL')
  AND NOT EXISTS (
      SELECT 1
      FROM ProductSize ps
      WHERE ps.ProductId = p.Id AND ps.SizeId = s.Id
  );
GO

-- Set default size to M where available.
UPDATE p
SET DefaultSizeId = s.Id
FROM Product p
JOIN Size s ON s.Name = 'M'
WHERE p.DefaultSizeId IS NULL
  AND EXISTS (
      SELECT 1 FROM ProductSize ps
      WHERE ps.ProductId = p.Id AND ps.SizeId = s.Id
  );
GO

-- If still missing default size, use "One Size".
UPDATE p
SET DefaultSizeId = s.Id
FROM Product p
JOIN Size s ON s.Name = 'One Size'
WHERE p.DefaultSizeId IS NULL;
GO

-- Backfill color+size images from existing color images: copy each color gallery to all product sizes.
INSERT INTO ProductColorSizeImage (ProductId, ColorId, SizeId, ImageUrl, SortOrder)
SELECT pci.ProductId, pci.ColorId, ps.SizeId, pci.ImageUrl, pci.SortOrder
FROM ProductColorImage pci
JOIN ProductSize ps ON ps.ProductId = pci.ProductId
WHERE NOT EXISTS (
    SELECT 1
    FROM ProductColorSizeImage pcsi
    WHERE pcsi.ProductId = pci.ProductId
      AND pcsi.ColorId = pci.ColorId
      AND pcsi.SizeId = ps.SizeId
      AND pcsi.ImageUrl = pci.ImageUrl
);
GO
