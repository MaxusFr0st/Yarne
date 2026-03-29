-- Promote max@gmail.com to Admin (run if user already registered before the fix)
USE [Yarne1.0];
GO

-- Add Admin role for max@gmail.com if not already assigned
INSERT INTO CustomerRole (CustomerId, RoleId)
SELECT c.Id, r.Id
FROM Customer c, Role r
WHERE c.Email = 'max@gmail.com' AND r.Name = 'Admin'
  AND NOT EXISTS (SELECT 1 FROM CustomerRole cr WHERE cr.CustomerId = c.Id AND cr.RoleId = r.Id);
GO
