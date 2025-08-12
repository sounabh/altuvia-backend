-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "provider" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countries" TEXT[],
    "courses" TEXT[],
    "studyLevel" TEXT,
    "gpa" TEXT,
    "testScores" TEXT,
    "workExperience" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billingCycle" TEXT,
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT,
    "plan" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

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
    "whyChooseHighlights" TEXT[],
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
    "averageDeadlines" TEXT,
    "studentsPerYear" INTEGER,
    "brochureUrl" TEXT,
    "additionalDocumentUrls" TEXT[],
    "averageProgramLengthMonths" INTEGER,
    "intakes" TEXT,

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
    "universityId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
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
    "currentStage" TEXT NOT NULL DEFAULT 'DRAFT',
    "stageUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "nextDeadlineId" TEXT,
    "completedDeadlines" TEXT,
    "missedDeadlines" TEXT,
    "submissionDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationFeesPaid" BOOLEAN NOT NULL DEFAULT false,
    "applicationFeesAmount" DOUBLE PRECISION,
    "documentsUploaded" TEXT,
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastContactDate" TIMESTAMP(3),
    "contactNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_progress" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentCategory" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "submissionDeadline" TIMESTAMP(3),
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "essay_prompts" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT,
    "programId" TEXT,
    "intakeId" TEXT,
    "promptTitle" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "wordLimit" INTEGER NOT NULL,
    "minWordCount" INTEGER NOT NULL DEFAULT 0,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "essay_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essay_submissions" (
    "id" TEXT NOT NULL,
    "essayPromptId" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDate" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUsingTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateVersion" TEXT,
    "reviewStatus" TEXT DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewerComment" TEXT,
    "internalRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "essay_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserSavedUniversities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserSavedUniversities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "departments_universityId_slug_key" ON "departments"("universityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "programs_programSlug_key" ON "programs"("programSlug");

-- CreateIndex
CREATE UNIQUE INDEX "syllabi_programId_key" ON "syllabi"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "program_rankings_programId_year_key" ON "program_rankings"("programId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_universityId_programId_key" ON "admissions"("universityId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "intakes_admissionId_intakeType_intakeYear_key" ON "intakes"("admissionId", "intakeType", "intakeYear");

-- CreateIndex
CREATE UNIQUE INDEX "application_progress_applicationId_stageName_key" ON "application_progress"("applicationId", "stageName");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_breakdowns_universityId_programId_academicYear_year_key" ON "tuition_breakdowns"("universityId", "programId", "academicYear", "yearNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scholarships_universityId_scholarshipSlug_key" ON "scholarships"("universityId", "scholarshipSlug");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_universityId_programId_structureType_academi_key" ON "fee_structures"("universityId", "programId", "structureType", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "_UserSavedUniversities_B_index" ON "_UserSavedUniversities"("B");
