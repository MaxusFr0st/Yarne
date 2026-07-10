-- promote-user-to-admin.sql
-- Promotes an existing user to Admin by email (no passwords involved).
--
-- Usage (Railway psql or any Postgres client):
--   psql "$DATABASE_URL" -v email='user@example.com' -f promote-user-to-admin.sql
--
-- The script is idempotent: running it twice for the same email is safe.

DO $$
DECLARE
    v_email      TEXT    := :'email';
    v_customer   INT;
    v_admin_role INT;
BEGIN
    -- Resolve customer
    SELECT "Id" INTO v_customer
    FROM "Customer"
    WHERE "Email" = v_email
    LIMIT 1;

    IF v_customer IS NULL THEN
        RAISE EXCEPTION 'No user found with email: %', v_email;
    END IF;

    -- Ensure Admin role row exists
    SELECT "Id" INTO v_admin_role
    FROM "Role"
    WHERE "Name" = 'Admin'
    LIMIT 1;

    IF v_admin_role IS NULL THEN
        INSERT INTO "Role" ("Name")
        VALUES ('Admin')
        RETURNING "Id" INTO v_admin_role;

        RAISE NOTICE 'Created Admin role (Id = %).', v_admin_role;
    END IF;

    -- Grant role if not already assigned
    IF NOT EXISTS (
        SELECT 1
        FROM "CustomerRole"
        WHERE "CustomerId" = v_customer
          AND "RoleId"     = v_admin_role
    ) THEN
        INSERT INTO "CustomerRole" ("CustomerId", "RoleId", "AssignedAt")
        VALUES (v_customer, v_admin_role, NOW());

        RAISE NOTICE 'Granted Admin role to % (CustomerId = %).', v_email, v_customer;
    ELSE
        RAISE NOTICE '% already has the Admin role — no change made.', v_email;
    END IF;
END $$;
