-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "minimumGpa" DOUBLE PRECISION,
    "maximumGpa" DOUBLE PRECISION,
    "gmatMinScore" INTEGER,
    "gmatMaxScore" INTEGER,
    "gmatAverageScore" INTEGER,
    "greMinScore" INTEGER,
    "greMaxScore" INTEGER,
    "greAverageScore" INTEGER,
    "ieltsMinScore" DOUBLE PRECISION,
    "toeflMinScore" INTEGER,
    "pteMinScore" INTEGER,
    "duolingoMinScore" INTEGER,
    "languageExemptions" TEXT,
    "workExperienceRequired" BOOLEAN NOT NULL DEFAULT false,
    "minWorkExperience" INTEGER,
    "maxWorkExperience" INTEGER,
    "preferredIndustries" TEXT,
    "applicationFee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "documentsRequired" TEXT,
    "additionalRequirements" TEXT,
    "acceptanceRate" DOUBLE PRECISION,
    "totalApplications" INTEGER,
    "totalAccepted" INTEGER,
    "statisticsYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "admissionStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intakes" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "intakeName" TEXT NOT NULL,
    "intakeType" TEXT NOT NULL,
    "intakeYear" INTEGER NOT NULL,
    "intakeMonth" INTEGER NOT NULL,
    "totalSeats" INTEGER,
    "availableSeats" INTEGER,
    "internationalSeats" INTEGER,
    "domesticSeats" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "applicationOpenDate" TIMESTAMP(3),
    "applicationCloseDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "intakeStatus" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_deadlines" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "intakeId" TEXT,
    "deadlineType" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "deadlineTime" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isExtended" BOOLEAN NOT NULL DEFAULT false,
    "originalDeadline" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "intakeId" TEXT,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "currentGpa" DOUBLE PRECISION,
    "gmatScore" INTEGER,
    "greScore" INTEGER,
    "ieltsScore" DOUBLE PRECISION,
    "toeflScore" INTEGER,
    "pteScore" INTEGER,
    "duolingoScore" INTEGER,
    "workExperienceMonths" INTEGER,
    "workExperienceDetails" TEXT,
    "applicationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "documentsUploaded" TEXT,
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastContactDate" TIMESTAMP(3),
    "contactNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "documentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "duration" INTEGER,
    "interviewerName" TEXT,
    "interviewerEmail" TEXT,
    "meetingLink" TEXT,
    "meetingPassword" TEXT,
    "location" TEXT,
    "interviewStatus" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "interviewScore" DOUBLE PRECISION,
    "interviewFeedback" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationReceived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admissions_universityId_programId_key" ON "admissions"("universityId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "intakes_admissionId_intakeType_intakeYear_key" ON "intakes"("admissionId", "intakeType", "intakeYear");

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_deadlines" ADD CONSTRAINT "admission_deadlines_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_deadlines" ADD CONSTRAINT "admission_deadlines_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
