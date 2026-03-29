-- =============================================
-- DATABASE: Yarne1.0
-- E-Commerce Schema | SQL Server
-- Tables + Seed Data Only
-- =============================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'Yarne1.0')
BEGIN
    ALTER DATABASE [Yarne1.0] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [Yarne1.0];
END
GO

-- Create DB.
-- In Docker volumes, it's possible that the physical MDF file exists while the DB entry was removed,
-- which makes plain `CREATE DATABASE [Yarne1.0];` fail. We fall back to using different filenames.
BEGIN TRY
    CREATE DATABASE [Yarne1.0];
END TRY
BEGIN CATCH
    IF ERROR_MESSAGE() LIKE '%already exists%' OR ERROR_MESSAGE() LIKE '%Cannot create file%'
    BEGIN
        DECLARE @DataPath NVARCHAR(260) = CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(260));
        DECLARE @LogPath  NVARCHAR(260) = CAST(SERVERPROPERTY('InstanceDefaultLogPath')  AS NVARCHAR(260));

        -- Avoid embedding backslashes in string literals (can be parsed differently per environment).
        DECLARE @sepData NVARCHAR(2) = CASE WHEN RIGHT(@DataPath, 1) IN (CHAR(92),'/') THEN '' ELSE CHAR(92) END;
        DECLARE @sepLog  NVARCHAR(2) = CASE WHEN RIGHT(@LogPath, 1)  IN (CHAR(92),'/') THEN '' ELSE CHAR(92) END;

        DECLARE @DataFile NVARCHAR(520) = @DataPath + @sepData + 'Yarne1.0_Data.mdf';
        DECLARE @LogFile  NVARCHAR(520) = @LogPath  + @sepLog  + 'Yarne1.0_Log.ldf';
        
        -- CREATE DATABASE does not accept variables in FILENAME, so use dynamic SQL.
        DECLARE @sql NVARCHAR(MAX) =
            N'CREATE DATABASE [Yarne1.0] ' +
            N'ON PRIMARY (NAME = N''Yarne1.0_Data'', FILENAME = N''' + @DataFile + N''') ' +
            N'LOG ON (NAME = N''Yarne1.0_Log'', FILENAME = N''' + @LogFile + N''');';
        EXEC sp_executesql @sql;
    END
    ELSE
        THROW;
END CATCH;
GO

USE [Yarne1.0];
GO

-- =============================================
-- 1. ROLE
-- =============================================
CREATE TABLE Role (
    Id    INT IDENTITY(1,1) PRIMARY KEY,
    Name  NVARCHAR(50) NOT NULL UNIQUE
);
GO

-- =============================================
-- 2. CUSTOMER
-- =============================================
CREATE TABLE Customer (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    FirstName     NVARCHAR(100)  NOT NULL,
    LastName      NVARCHAR(100)  NOT NULL,
    UserName      NVARCHAR(100)  NOT NULL UNIQUE,
    Email         NVARCHAR(255)  NOT NULL UNIQUE,
    PhoneNumber   NVARCHAR(20)       NULL,
    PasswordHash  NVARCHAR(255)  NOT NULL,
    PasswordSalt  NVARCHAR(255)  NOT NULL,
    IsActive      BIT            NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- =============================================
-- 3. CUSTOMER ROLE (Many-to-Many)
-- =============================================
CREATE TABLE CustomerRole (
    CustomerId  INT       NOT NULL REFERENCES Customer(Id) ON DELETE CASCADE,
    RoleId      INT       NOT NULL REFERENCES Role(Id)     ON DELETE CASCADE,
    AssignedAt  DATETIME2 NOT NULL DEFAULT GETDATE(),
    PRIMARY KEY (CustomerId, RoleId)
);
GO

-- =============================================
-- 4. COUNTRY
-- =============================================
CREATE TABLE Country (
    Id    INT IDENTITY(1,1) PRIMARY KEY,
    Name  NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- =============================================
-- 5. CUSTOMER ADDRESS
-- =============================================
CREATE TABLE CustomerAddress (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId    INT           NOT NULL REFERENCES Customer(Id) ON DELETE CASCADE,
    CountryId     INT           NOT NULL REFERENCES Country(Id),
    AddressLine1  NVARCHAR(255) NOT NULL,
    AddressLine2  NVARCHAR(255)     NULL,
    City          NVARCHAR(100) NOT NULL,
    PostalCode    NVARCHAR(20)      NULL,
    IsDefault     BIT           NOT NULL DEFAULT 0
);
GO

-- =============================================
-- 6. CATEGORY
-- =============================================
CREATE TABLE Category (
    Id    INT IDENTITY(1,1) PRIMARY KEY,
    Name  NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- =============================================
-- 7. COLLECTION
-- =============================================
CREATE TABLE Collection (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Name       NVARCHAR(100) NOT NULL,
    StartDate  DATE              NULL,
    EndDate    DATE              NULL,
    CONSTRAINT CHK_Collection_Dates CHECK (EndDate IS NULL OR EndDate >= StartDate)
);
GO

-- =============================================
-- 8. PRODUCT
-- =============================================
CREATE TABLE Product (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    ProductCode      NVARCHAR(50)   NOT NULL UNIQUE,
    Name             NVARCHAR(255)  NOT NULL,
    Description      NVARCHAR(MAX)      NULL,
    Price            DECIMAL(18,2)  NOT NULL CHECK (Price >= 0),
    QuantityInStock  INT            NOT NULL DEFAULT 0 CHECK (QuantityInStock >= 0),
    Material         NVARCHAR(100)      NULL,
    ImageUrl         NVARCHAR(500)      NULL,
    CategoryId       INT            NOT NULL REFERENCES Category(Id),
    CollectionId     INT                NULL REFERENCES Collection(Id),
    ProducerName     NVARCHAR(255)      NULL,
    IsActive         BIT            NOT NULL DEFAULT 1,
    CreatedAt        DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- =============================================
-- 8b. PRODUCT IMAGE (One product, many images)
-- =============================================
CREATE TABLE ProductImage (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    ProductId     INT            NOT NULL REFERENCES Product(Id) ON DELETE CASCADE,
    ImageUrl      NVARCHAR(500)  NOT NULL,
    SortOrder     INT            NOT NULL DEFAULT 0,
    IsPrimary     BIT            NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX IX_ProductImage_ProductId ON ProductImage(ProductId);
GO

-- =============================================
-- 9. PRODUCT COUNTRY (Many-to-Many)
-- =============================================
CREATE TABLE ProductCountry (
    ProductId  INT NOT NULL REFERENCES Product(Id)  ON DELETE CASCADE,
    CountryId  INT NOT NULL REFERENCES Country(Id)  ON DELETE CASCADE,
    PRIMARY KEY (ProductId, CountryId)
);
GO

-- =============================================
-- 9b. COLOR (Product color variants)
-- =============================================
CREATE TABLE Color (
    Id      INT IDENTITY(1,1) PRIMARY KEY,
    Name    NVARCHAR(100) NOT NULL,
    HexCode NVARCHAR(20) NOT NULL DEFAULT '#2D241E'
);
GO

-- =============================================
-- 9c. PRODUCT COLOR (Many-to-Many)
-- =============================================
CREATE TABLE ProductColor (
    ProductId  INT NOT NULL REFERENCES Product(Id)  ON DELETE CASCADE,
    ColorId    INT NOT NULL REFERENCES Color(Id)    ON DELETE CASCADE,
    SortOrder  INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ProductId, ColorId)
);
GO

-- =============================================
-- 9d. PRODUCT COLOR IMAGE (Multiple images per product-color)
-- =============================================
CREATE TABLE ProductColorImage (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL,
    ColorId   INT NOT NULL,
    ImageUrl  NVARCHAR(500) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_ProductColorImage_ProductColor
        FOREIGN KEY (ProductId, ColorId) REFERENCES ProductColor(ProductId, ColorId) ON DELETE CASCADE
);
GO

CREATE INDEX IX_ProductColorImage_ProductColor ON ProductColorImage(ProductId, ColorId);
GO

-- =============================================
-- 10. PAYMENT METHOD
-- =============================================
CREATE TABLE PaymentMethod (
    Id    INT IDENTITY(1,1) PRIMARY KEY,
    Name  NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- =============================================
-- 11. ORDER
-- =============================================
CREATE TABLE [Order] (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId       INT           NOT NULL REFERENCES Customer(Id),
    PaymentMethodId  INT           NOT NULL REFERENCES PaymentMethod(Id),
    ShippingAddrId   INT               NULL REFERENCES CustomerAddress(Id),
    Total            DECIMAL(18,2) NOT NULL CHECK (Total >= 0),
    Status           NVARCHAR(50)  NOT NULL DEFAULT 'Pending',
    OrderDate        DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_Order_Status CHECK (Status IN ('Pending','Confirmed','Shipped','Delivered','Cancelled'))
);
GO

-- =============================================
-- 12. ORDER ITEM
-- =============================================
CREATE TABLE OrderItem (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    OrderId    INT           NOT NULL REFERENCES [Order](Id) ON DELETE CASCADE,
    ProductId  INT           NOT NULL REFERENCES Product(Id),
    CountryId  INT               NULL REFERENCES Country(Id),
    Quantity   INT           NOT NULL CHECK (Quantity > 0),
    UnitPrice  DECIMAL(18,2) NOT NULL CHECK (UnitPrice >= 0)
);
GO

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO Role (Name) VALUES ('Admin'), ('Customer');

INSERT INTO PaymentMethod (Name) VALUES
    ('Credit Card'),
    ('Debit Card'),
    ('PayPal'),
    ('Cash on Delivery'),
    ('Bank Transfer');

INSERT INTO Country (Name) VALUES
    ('United States'),
    ('United Kingdom'),
    ('Germany'),
    ('France'),
    ('Croatia');

INSERT INTO Color (Name, HexCode) VALUES
    ('Black', '#1a1a1a'),
    ('White', '#f5f5f5'),
    ('Navy', '#0A1128'),
    ('Burgundy', '#722F37'),
    ('Cream', '#F5F2ED'),
    ('Brown', '#2D241E'),
    ('Gray', '#6B6B6B'),
    ('Parchment', '#E8DCC8'),
    ('Oxblood', '#4A0E0E'),
    ('Midnight', '#0A1128'),
    ('Moss', '#3D5040'),
    ('Ivory', '#F5F0E8'),
    ('Slate', '#8B9099'),
    ('Ecru', '#F0EBD8'),
    ('Caramel', '#9B6B2E'),
    ('Ebony', '#1A1510'),
    ('Oat', '#D4C5A0'),
    ('Bordeaux', '#6B1E1E'),
    ('Smoke', '#9DA3AE'),
    ('Cobalt', '#0A1128'),
    ('Camel', '#C09060');

INSERT INTO Category (Name) VALUES
    ('Tops'),
    ('Bottoms'),
    ('Outerwear'),
    ('Accessories'),
    ('Footwear'),
    ('Sweaters'),
    ('Cardigans'),
    ('Vests'),
    ('Jackets');

INSERT INTO Collection (Name, StartDate, EndDate) VALUES
    ('Summer 2025', '2025-06-01', '2025-08-31'),
    ('Winter 2025', '2025-11-01', '2026-02-28'),
    ('Spring 2026', '2026-03-01', '2026-05-31');

-- Products from products.ts (Arles Cocoon, Mistral, Provence Vest, Bretagne, Riviera, Côte Jacket)
INSERT INTO Product (ProductCode, Name, Description, Price, QuantityInStock, Material, CategoryId, CollectionId, ProducerName) VALUES
    ('arles-cocoon', 'Arles Cocoon Sweater', 'Draped in the spirit of southern France, the Arles Cocoon wraps you in a cloud of extra-fine merino. Its oversized silhouette and deep dropped shoulders create a languid, effortless luxury that moves with you.', 285, 50, 'Merino Wool Blend', 6, 3, 'Yarne Studios'),
    ('mistral-turtleneck', 'Mistral Turtleneck', 'The Mistral is our purest expression of effortless warmth. Knit from grade-A Scottish cashmere, its elongated turtleneck can be worn high and folded or draped loosely around the décolletage.', 360, 35, 'Pure Cashmere', 6, 2, 'Yarne Studios'),
    ('provence-vest', 'Provence Knit Vest', 'A warm-weather essential reimagined. The Provence Vest is knit from a breathable lambswool-linen blend, offering texture and weight without warmth—ideal for layering through the seasons.', 195, 40, 'Lambswool & Linen', 8, NULL, 'Yarne Studios'),
    ('bretagne-pullover', 'Bretagne Pullover', 'Named for the rugged coast of Brittany, the Bretagne is constructed from a sculptural bouclé wool that catches the light and holds its shape beautifully. A statement piece that becomes a staple.', 320, 45, 'Bouclé Wool', 6, 3, 'Yarne Studios'),
    ('riviera-cardigan', 'Riviera Cardigan', 'The Riviera is the cardigan of a quiet, sun-drenched afternoon. Its fine-gauge merino drapes in a long, lean silhouette with mother-of-pearl buttons and deep side pockets for effortless carry.', 245, 55, 'Fine-Gauge Merino', 7, 2, 'Yarne Studios'),
    ('cote-boucle-jacket', 'Côte Bouclé Jacket', 'Our most refined outerwear piece. The Côte is constructed in a dense bouclé weave, then lined in a whisper-soft satin for a jacket that is as comfortable from inside as it is striking from outside.', 395, 30, 'Structured Bouclé', 9, 2, 'Yarne Studios');

-- ProductImage: primary image per product (first color image as fallback)
INSERT INTO ProductImage (ProductId, ImageUrl, SortOrder, IsPrimary) VALUES
    (1, 'https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1),
    (2, 'https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1),
    (3, 'https://images.unsplash.com/photo-1641839272138-5b4eb047e0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1),
    (4, 'https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1),
    (5, 'https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1),
    (6, 'https://images.unsplash.com/photo-1698135857846-b683004283cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0, 1);

-- ProductColor + ProductColorImage (Color ids: 8=Parchment, 9=Oxblood, 10=Midnight, 11=Moss, 12=Ivory, 13=Slate, 14=Ecru, 15=Caramel, 16=Ebony, 17=Oat, 18=Bordeaux, 19=Smoke, 20=Cobalt, 21=Camel)
-- 1 Arles: Parchment, Oxblood, Midnight, Moss
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (1, 8, 0), (1, 9, 1), (1, 10, 2), (1, 11, 3);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (1, 8, 'https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (1, 9, 'https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (1, 10, 'https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (1, 11, 'https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);
-- 2 Mistral: Midnight, Ivory, Slate
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (2, 10, 0), (2, 12, 1), (2, 13, 2);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (2, 10, 'https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (2, 12, 'https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (2, 13, 'https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);
-- 3 Provence: Ecru, Caramel, Ebony
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (3, 14, 0), (3, 15, 1), (3, 16, 2);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (3, 14, 'https://images.unsplash.com/photo-1641839272138-5b4eb047e0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (3, 15, 'https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (3, 16, 'https://images.unsplash.com/photo-1764697907425-62696b280b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);
-- 4 Bretagne: Oat, Bordeaux, Smoke
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (4, 17, 0), (4, 18, 1), (4, 19, 2);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (4, 17, 'https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (4, 18, 'https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (4, 19, 'https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);
-- 5 Riviera: Bordeaux, Ivory, Cobalt
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (5, 18, 0), (5, 12, 1), (5, 20, 2);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (5, 18, 'https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (5, 12, 'https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (5, 20, 'https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);
-- 6 Côte: Camel, Ivory, Ebony
INSERT INTO ProductColor (ProductId, ColorId, SortOrder) VALUES (6, 21, 0), (6, 12, 1), (6, 16, 2);
INSERT INTO ProductColorImage (ProductId, ColorId, ImageUrl, SortOrder) VALUES
    (6, 21, 'https://images.unsplash.com/photo-1698135857846-b683004283cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (6, 12, 'https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0),
    (6, 16, 'https://images.unsplash.com/photo-1764697907425-62696b280b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 0);

INSERT INTO Customer (FirstName, LastName, UserName, Email, PhoneNumber, PasswordHash, PasswordSalt) VALUES
    ('Max', 'Admin', 'maxadmin', 'max@gmail.com', NULL, '$2a$12$MU0ceadtXpoWD8J6pO5cdeEkBtom17wglTzeAl7FxTmUAmgq2BWjC', '$2a$12$MU0ceadtXpoWD8J6pO5cde'),
    ('Admin', 'User', 'admin',   'admin@yarne.com',  NULL,          '$2b$10$exampleHashAdmin', '$2b$10$exampleSaltAdmin'),
    ('John',  'Doe',  'johndoe', 'john@example.com', '+1234567890', '$2b$10$exampleHashJohn',  '$2b$10$exampleSaltJohn');

INSERT INTO CustomerRole (CustomerId, RoleId) VALUES (1, 1), (2, 1), (3, 2);

INSERT INTO CustomerAddress (CustomerId, CountryId, AddressLine1, City, PostalCode, IsDefault)
VALUES (3, 1, '123 Main Street', 'New York', '10001', 1);

INSERT INTO ProductCountry (ProductId, CountryId) VALUES
    (1,1),(1,2),(1,3),(1,4),(1,5),
    (2,1),(2,2),(2,3),(2,4),(2,5),
    (3,1),(3,2),(3,3),(3,4),(3,5),
    (4,1),(4,2),(4,3),(4,4),(4,5),
    (5,1),(5,2),(5,3),(5,4),(5,5),
    (6,1),(6,2),(6,3),(6,4),(6,5);

INSERT INTO [Order] (CustomerId, PaymentMethodId, ShippingAddrId, Total, Status)
VALUES (3, 1, 1, 930.00, 'Confirmed');

INSERT INTO OrderItem (OrderId, ProductId, CountryId, Quantity, UnitPrice) VALUES
    (1, 1, 1, 2, 285.00),
    (1, 2, 1, 1, 360.00);
GO

PRINT 'Yarne1.0 database created successfully!';