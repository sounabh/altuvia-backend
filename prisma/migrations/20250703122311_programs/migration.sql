/*
  Warnings:

  - You are about to drop the `Program` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `University` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UniversityImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Program" DROP CONSTRAINT "Program_universityId_fkey";

-- DropForeignKey
ALTER TABLE "UniversityImage" DROP CONSTRAINT "UniversityImage_universityId_fkey";

-- DropTable
DROP TABLE "Program";

-- DropTable
DROP TABLE "University";

-- DropTable
DROP TABLE "UniversityImage";

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "fullAddress" TEXT,
    "shortDescription" TEXT,
    "overview" TEXT,
    "history" TEXT,
    "missionStatement" TEXT,
    "visionStatement" TEXT,
    "accreditationDetails" TEXT,
    "whyChooseHighlights" TEXT,
    "careerOutcomes" TEXT,
    "ftGlobalRanking" INTEGER,
    "ftRegionalRanking" INTEGER,
    "ftRankingYear" INTEGER,
    "usNewsRanking" INTEGER,
    "qsRanking" INTEGER,
    "timesRanking" INTEGER,
    "acceptanceRate" DOUBLE PRECISION,
    "gmatAverageScore" INTEGER,
    "gmatScoreMin" INTEGER,
    "gmatScoreMax" INTEGER,
    "minimumGpa" DOUBLE PRECISION,
    "languageTestRequirements" TEXT,
    "tuitionFees" DOUBLE PRECISION,
    "additionalFees" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "scholarshipInfo" TEXT,
    "financialAidDetails" TEXT,
    "admissionsOfficeContact" TEXT,
    "internationalOfficeContact" TEXT,
    "generalInquiriesContact" TEXT,
    "websiteUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "canonicalUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_images" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" TEXT,
    "imageTitle" TEXT,
    "imageAltText" TEXT NOT NULL,
    "imageCaption" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "university_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "programSlug" TEXT NOT NULL,
    "degreeType" TEXT,
    "programLength" INTEGER,
    "specializations" TEXT,
    "programDescription" TEXT,
    "curriculumOverview" TEXT,
    "admissionRequirements" TEXT,
    "averageEntranceScore" DOUBLE PRECISION,
    "programTuitionFees" DOUBLE PRECISION,
    "programAdditionalFees" DOUBLE PRECISION,
    "programMetaTitle" TEXT,
    "programMetaDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabi" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "syllabi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_rankings" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_links" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "departments_universityId_slug_key" ON "departments"("universityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "programs_universityId_programSlug_key" ON "programs"("universityId", "programSlug");

-- CreateIndex
CREATE UNIQUE INDEX "syllabi_programId_key" ON "syllabi"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "program_rankings_programId_year_key" ON "program_rankings"("programId", "year");

-- AddForeignKey
ALTER TABLE "university_images" ADD CONSTRAINT "university_images_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_rankings" ADD CONSTRAINT "program_rankings_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_links" ADD CONSTRAINT "external_links_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
