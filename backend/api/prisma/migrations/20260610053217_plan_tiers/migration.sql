-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';
