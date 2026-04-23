-- Convert MonitorType enum column to plain text
ALTER TABLE "Monitor" ALTER COLUMN "type" TYPE TEXT;
ALTER TABLE "Monitor" ALTER COLUMN "type" SET DEFAULT 'HTTP';

-- Convert AlertType enum column to plain text
ALTER TABLE "Alert" ALTER COLUMN "type" TYPE TEXT;

-- Drop the now-unused PostgreSQL enum types
DROP TYPE IF EXISTS "MonitorType";
DROP TYPE IF EXISTS "AlertType";
