-- AlterTable
ALTER TABLE "GA4Connection" ALTER COLUMN "accessToken" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SearchConsoleConnection" ALTER COLUMN "accessToken" DROP NOT NULL;