/*
  Warnings:

  - You are about to drop the `admin_users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[programSlug]` on the table `programs` will be added. If there are existing duplicate values, this will fail.
  - Made the column `currency` on table `payment_events` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropIndex
DROP INDEX "programs_universityId_programSlug_key";

-- AlterTable
ALTER TABLE "payment_events" ALTER COLUMN "currency" SET NOT NULL;

-- DropTable
DROP TABLE "admin_users";

-- DropTable
DROP TABLE "refresh_tokens";

-- CreateTable
CREATE TABLE "tuition_breakdowns" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "academicYear" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "baseTuition" DOUBLE PRECISION NOT NULL,
    "labFees" DOUBLE PRECISION DEFAULT 0,
    "libraryFees" DOUBLE PRECISION DEFAULT 0,
    "technologyFees" DOUBLE PRECISION DEFAULT 0,
    "activityFees" DOUBLE PRECISION DEFAULT 0,
    "healthInsurance" DOUBLE PRECISION DEFAULT 0,
    "dormitoryFees" DOUBLE PRECISION DEFAULT 0,
    "mealPlanFees" DOUBLE PRECISION DEFAULT 0,
    "applicationFee" DOUBLE PRECISION DEFAULT 0,
    "registrationFee" DOUBLE PRECISION DEFAULT 0,
    "examFees" DOUBLE PRECISION DEFAULT 0,
    "graduationFee" DOUBLE PRECISION DEFAULT 0,
    "totalTuition" DOUBLE PRECISION NOT NULL,
    "totalAdditionalFees" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    "paymentTerms" TEXT,
    "installmentCount" INTEGER DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuition_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "tuitionBreakdownId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "lateFee" DOUBLE PRECISION DEFAULT 0,
    "gracePeroidDays" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "scholarshipName" TEXT NOT NULL,
    "scholarshipSlug" TEXT NOT NULL,
    "scholarshipType" TEXT NOT NULL,
    "description" TEXT,
    "eligibilityCriteria" TEXT,
    "amount" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coverageTuition" BOOLEAN NOT NULL DEFAULT false,
    "coverageFees" BOOLEAN NOT NULL DEFAULT false,
    "coverageLiving" BOOLEAN NOT NULL DEFAULT false,
    "coverageBooks" BOOLEAN NOT NULL DEFAULT false,
    "applicationRequired" BOOLEAN NOT NULL DEFAULT true,
    "applicationDeadline" TIMESTAMP(3),
    "documentsRequired" TEXT,
    "totalAvailable" INTEGER,
    "currentlyAwarded" INTEGER DEFAULT 0,
    "minimumGpa" DOUBLE PRECISION,
    "minimumTestScore" INTEGER,
    "testType" TEXT,
    "citizenshipRequired" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicationOpenDate" TIMESTAMP(3),
    "applicationCloseDate" TIMESTAMP(3),
    "awardDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_documents" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarship_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_applications" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "currentGpa" DOUBLE PRECISION,
    "testScore" INTEGER,
    "testType" TEXT,
    "familyIncome" DOUBLE PRECISION,
    "financialNeed" TEXT,
    "applicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "awardAmount" DOUBLE PRECISION,
    "documentsUploaded" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarship_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "structureName" TEXT NOT NULL,
    "structureType" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "tuitionFee" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION DEFAULT 0,
    "registrationFee" DOUBLE PRECISION DEFAULT 0,
    "examFee" DOUBLE PRECISION DEFAULT 0,
    "libraryFee" DOUBLE PRECISION DEFAULT 0,
    "labFee" DOUBLE PRECISION DEFAULT 0,
    "hostelFee" DOUBLE PRECISION DEFAULT 0,
    "messFee" DOUBLE PRECISION DEFAULT 0,
    "transportFee" DOUBLE PRECISION DEFAULT 0,
    "sportsFee" DOUBLE PRECISION DEFAULT 0,
    "medicalFee" DOUBLE PRECISION DEFAULT 0,
    "healthInsurance" DOUBLE PRECISION DEFAULT 0,
    "accidentInsurance" DOUBLE PRECISION DEFAULT 0,
    "studentActivityFee" DOUBLE PRECISION DEFAULT 0,
    "technologyFee" DOUBLE PRECISION DEFAULT 0,
    "securityDeposit" DOUBLE PRECISION DEFAULT 0,
    "cautionMoney" DOUBLE PRECISION DEFAULT 0,
    "isDepositRefundable" BOOLEAN NOT NULL DEFAULT true,
    "totalMandatoryFees" DOUBLE PRECISION NOT NULL,
    "totalOptionalFees" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_aids" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "aidName" TEXT NOT NULL,
    "aidType" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interestRate" DOUBLE PRECISION,
    "repaymentPeriod" INTEGER,
    "gracePeriod" INTEGER,
    "eligibilityCriteria" TEXT,
    "minimumGpa" DOUBLE PRECISION,
    "maximumFamilyIncome" DOUBLE PRECISION,
    "citizenshipRequired" TEXT,
    "applicationRequired" BOOLEAN NOT NULL DEFAULT true,
    "applicationDeadline" TIMESTAMP(3),
    "documentsRequired" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicationOpenDate" TIMESTAMP(3),
    "applicationCloseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_aids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_aid_applications" (
    "id" TEXT NOT NULL,
    "financialAidId" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "familyIncome" DOUBLE PRECISION,
    "assets" DOUBLE PRECISION,
    "liabilities" DOUBLE PRECISION,
    "dependents" INTEGER DEFAULT 0,
    "applicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "approvedAmount" DOUBLE PRECISION,
    "documentsUploaded" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_aid_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tuition_breakdowns_universityId_programId_academicYear_year_key" ON "tuition_breakdowns"("universityId", "programId", "academicYear", "yearNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_universityId_scholarshipSlug_key" ON "scholarships"("universityId", "scholarshipSlug");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_universityId_programId_structureType_academi_key" ON "fee_structures"("universityId", "programId", "structureType", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "programs_programSlug_key" ON "programs"("programSlug");

-- AddForeignKey
ALTER TABLE "tuition_breakdowns" ADD CONSTRAINT "tuition_breakdowns_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_breakdowns" ADD CONSTRAINT "tuition_breakdowns_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_tuitionBreakdownId_fkey" FOREIGN KEY ("tuitionBreakdownId") REFERENCES "tuition_breakdowns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_documents" ADD CONSTRAINT "scholarship_documents_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_aids" ADD CONSTRAINT "financial_aids_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_aids" ADD CONSTRAINT "financial_aids_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_aid_applications" ADD CONSTRAINT "financial_aid_applications_financialAidId_fkey" FOREIGN KEY ("financialAidId") REFERENCES "financial_aids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_aid_applications" ADD CONSTRAINT "financial_aid_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_aid_applications" ADD CONSTRAINT "financial_aid_applications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
