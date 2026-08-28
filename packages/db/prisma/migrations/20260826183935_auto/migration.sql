-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'STUDENT_PREMIUM', 'AGENCY_PRO');

-- CreateEnum
CREATE TYPE "ProductAudience" AS ENUM ('LISTING', 'OWNER', 'STUDENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'YENI_UYGUN_OTAQ_YOLDASI';
ALTER TYPE "NotificationType" ADD VALUE 'ELAN_YENILENDI';
ALTER TYPE "NotificationType" ADD VALUE 'QIYMET_DEYISDI';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "boosted_until" TIMESTAMP(3),
ADD COLUMN     "featured_until" TIMESTAMP(3),
ADD COLUMN     "is_boosted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_featured_on_home" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premium_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "emailed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "plan_expires_at" TIMESTAMP(3),
ADD COLUMN     "plan_started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "monetization_products" (
    "code" TEXT NOT NULL,
    "name_az" VARCHAR(120) NOT NULL,
    "description_az" VARCHAR(400),
    "price_qepik" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "audience" "ProductAudience" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monetization_products_pkey" PRIMARY KEY ("code")
);