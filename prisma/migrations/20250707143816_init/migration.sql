/*
  Warnings:

  - You are about to drop the `fee_structures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `financial_aid_applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `financial_aids` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scholarship_applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scholarship_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scholarships` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tuition_breakdowns` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[universityId,programSlug]` on the table `programs` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "fee_structures" DROP CONSTRAINT "fee_structures_programId_fkey";

-- DropForeignKey
ALTER TABLE "fee_structures" DROP CONSTRAINT "fee_structures_universityId_fkey";

-- DropForeignKey
ALTER TABLE "financial_aid_applications" DROP CONSTRAINT "financial_aid_applications_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "financial_aid_applications" DROP CONSTRAINT "financial_aid_applications_financialAidId_fkey";

-- DropForeignKey
ALTER TABLE "financial_aid_applications" DROP CONSTRAINT "financial_aid_applications_userId_fkey";

-- DropForeignKey
ALTER TABLE "financial_aids" DROP CONSTRAINT "financial_aids_programId_fkey";

-- DropForeignKey
ALTER TABLE "financial_aids" DROP CONSTRAINT "financial_aids_universityId_fkey";

-- DropForeignKey
ALTER TABLE "payment_schedules" DROP CONSTRAINT "payment_schedules_tuitionBreakdownId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_applications" DROP CONSTRAINT "scholarship_applications_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_applications" DROP CONSTRAINT "scholarship_applications_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_applications" DROP CONSTRAINT "scholarship_applications_userId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_documents" DROP CONSTRAINT "scholarship_documents_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_programId_fkey";

-- DropForeignKey
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_universityId_fkey";

-- DropForeignKey
ALTER TABLE "tuition_breakdowns" DROP CONSTRAINT "tuition_breakdowns_programId_fkey";

-- DropForeignKey
ALTER TABLE "tuition_breakdowns" DROP CONSTRAINT "tuition_breakdowns_universityId_fkey";

-- DropIndex
DROP INDEX "programs_programSlug_key";

-- AlterTable
ALTER TABLE "payment_events" ALTER COLUMN "currency" DROP NOT NULL;

-- DropTable
DROP TABLE "fee_structures";

-- DropTable
DROP TABLE "financial_aid_applications";

-- DropTable
DROP TABLE "financial_aids";

-- DropTable
DROP TABLE "payment_schedules";

-- DropTable
DROP TABLE "scholarship_applications";

-- DropTable
DROP TABLE "scholarship_documents";

-- DropTable
DROP TABLE "scholarships";

-- DropTable
DROP TABLE "tuition_breakdowns";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "phone" TEXT,
    "profileImageUrl" TEXT,
    "lastLogin" TIMESTAMP(3),
    "lastLoginIP" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "programs_universityId_programSlug_key" ON "programs"("universityId", "programSlug");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
