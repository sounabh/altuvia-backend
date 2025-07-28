generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ==================== USER MODELS ====================

model User {
  id                         String                         @id @default(cuid())
  email                      String                         @unique
  name                       String?
  image                      String?
  password                   String?
  provider                   String?
  emailVerified              Boolean                        @default(false)
  createdAt                  DateTime                       @default(now())
  updatedAt                  DateTime                       @updatedAt

  profile                    UserProfile?
  subscription               Subscription?
  applications               Application[]
  scholarshipApplications    ScholarshipApplication[]
  financialAidApplications   FinancialAidApplication[]

  @@map("users")
}

model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  countries     String[]
  courses       String[]
  studyLevel    String?
  gpa           String?
  testScores    String?
  workExperience String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model Subscription {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  plan                   String
  status                 String
  billingCycle           String?
  trialStartDate         DateTime?
  trialEndDate           DateTime?
  currentPeriodStart     DateTime?
  currentPeriodEnd       DateTime?
  stripeCustomerId       String?
  stripeSubscriptionId   String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

model PaymentEvent {
  id            String   @id @default(cuid())
  userId        String?
  eventType     String?
  plan          String?
  amount        Float?
  currency      String   @default("USD")
  stripeEventId String?
  createdAt     DateTime @default(now())

  @@map("payment_events")
}

// ==================== UNIVERSITY MODELS ====================

model University {
  id                          String                  @id @default(cuid())
  universityName              String
  slug                        String                  @unique
  city                        String
  state                       String?
  country                     String
  fullAddress                 String?
  shortDescription            String?
  overview                    String?
  history                     String?
  missionStatement            String?
  visionStatement             String?
  accreditationDetails        String?
  whyChooseHighlights         String?
  careerOutcomes              String?
  ftGlobalRanking             Int?
  ftRegionalRanking           Int?
  ftRankingYear               Int?
  usNewsRanking               Int?
  qsRanking                   Int?
  timesRanking                Int?
  acceptanceRate              Float?
  gmatAverageScore            Int?
  gmatScoreMin                Int?
  gmatScoreMax                Int?
  minimumGpa                  Float?
  languageTestRequirements    String?
  tuitionFees                 Float?
  additionalFees              Float?
  totalCost                   Float?
  currency                    String                  @default("USD")
  scholarshipInfo             String?
  financialAidDetails         String?
  admissionsOfficeContact     String?
  internationalOfficeContact  String?
  generalInquiriesContact     String?
  websiteUrl                  String?
  metaTitle                   String?
  metaDescription             String?
  metaKeywords                String?
  canonicalUrl                String?
  isActive                    Boolean                 @default(true)
  isFeatured                  Boolean                 @default(false)
  createdAt                   DateTime                @default(now())
  updatedAt                   DateTime                @updatedAt

  images                      UniversityImage[]
  programs                    Program[]
  departments                 Department[]
  admissions                  Admission[]
  tuitionBreakdowns           TuitionBreakdown[]
  scholarships                Scholarship[]
  feeStructures               FeeStructure[]
  financialAids               FinancialAid[]

  @@map("universities")
}

model UniversityImage {
  id              String     @id @default(cuid())
  universityId    String
  imageUrl        String
  imageType       String?
  imageTitle      String?
  imageAltText    String
  imageCaption    String?
  fileSize        Int?
  width           Int?
  height          Int?
  isPrimary       Boolean    @default(false)
  displayOrder    Int        @default(0)
  createdAt       DateTime   @default(now())

  university      University @relation(fields: [universityId], references: [id], onDelete: Cascade)

  @@map("university_images")
}

model Department {
  id           String     @id @default(cuid())
  universityId String
  name         String
  slug         String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  university   University @relation(fields: [universityId], references: [id], onDelete: Cascade)
  programs     Program[]

  @@unique([universityId, slug])
  @@map("departments")
}

model Program {
  id                       String                   @id @default(cuid())
  universityId             String
  departmentId             String
  programName              String
  programSlug              String                   @unique
  degreeType               String?
  programLength            Int?
  specializations          String?
  programDescription       String?
  curriculumOverview       String?
  admissionRequirements    String?
  averageEntranceScore     Float?
  programTuitionFees       Float?
  programAdditionalFees    Float?
  programMetaTitle         String?
  programMetaDescription   String?
  isActive                 Boolean                  @default(true)
  createdAt                DateTime                 @default(now())
  updatedAt                DateTime                 @updatedAt

  university               University               @relation(fields: [universityId], references: [id], onDelete: Cascade)
  department               Department               @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  syllabus                 Syllabus?
  rankings                 ProgramRanking[]
  externalLinks            ExternalLink[]
  admissions               Admission[]
  tuitionBreakdowns        TuitionBreakdown[]
  scholarships             Scholarship[]
  feeStructures            FeeStructure[]
  financialAids            FinancialAid[]

  @@map("programs")
}

model Syllabus {
  id         String   @id @default(cuid())
  programId  String   @unique
  fileUrl    String
  uploadedAt DateTime @default(now())

  program    Program  @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@map("syllabi")
}

model ProgramRanking {
  id         String   @id @default(cuid())
  programId  String
  year       Int
  rank       Int
  source     String?
  createdAt  DateTime @default(now())

  program    Program  @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@unique([programId, year])
  @@map("program_rankings")
}

model ExternalLink {
  id         String   @id @default(cuid())
  programId  String
  title      String
  url        String
  createdAt  DateTime @default(now())

  program    Program  @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@map("external_links")
}

// ==================== ADMISSIONS MODELS ====================

model Admission {
  id                      String                     @id @default(cuid())
  universityId            String
  programId               String
  minimumGpa              Float?
  maximumGpa              Float?
  gmatMinScore            Int?
  gmatMaxScore            Int?
  gmatAverageScore        Int?
  greMinScore             Int?
  greMaxScore             Int?
  greAverageScore         Int?
  ieltsMinScore           Float?
  toeflMinScore           Int?
  pteMinScore             Int?
  duolingoMinScore        Int?
  languageExemptions      String?
  workExperienceRequired  Boolean                   @default(false)
  minWorkExperience       Int?
  maxWorkExperience       Int?
  preferredIndustries     String?
  applicationFee          Float?
  currency                 String                   @default("USD")
  documentsRequired       String?
  additionalRequirements  String?
  acceptanceRate          Float?
  totalApplications       Int?
  totalAccepted           Int?
  statisticsYear          Int?
  isActive                Boolean                   @default(true)
  admissionStatus         String                    @default("OPEN")
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  university              University                @relation(fields: [universityId], references: [id], onDelete: Cascade)
  program                 Program                   @relation(fields: [programId], references: [id], onDelete: Cascade)
  intakes                 Intake[]
  deadlines               AdmissionDeadline[]
  applications            Application[]

  @@unique([universityId, programId])
  @@map("admissions")
}

model Intake {
  id                       String              @id @default(cuid())
  admissionId              String
  intakeName               String
  intakeType               String
  intakeYear               Int
  intakeMonth              Int
  totalSeats               Int?
  availableSeats           Int?
  internationalSeats       Int?
  domesticSeats            Int?
  startDate                DateTime?
  endDate                  DateTime?
  applicationOpenDate      DateTime?
  applicationCloseDate     DateTime?
  isActive                 Boolean             @default(true)
  intakeStatus             String              @default("UPCOMING")
  createdAt                DateTime            @default(now())
  updatedAt                DateTime            @updatedAt

  admission                Admission           @relation(fields: [admissionId], references: [id], onDelete: Cascade)
  deadlines                AdmissionDeadline[]
  applications             Application[]

  @@unique([admissionId, intakeType, intakeYear])
  @@map("intakes")
}

model AdmissionDeadline {
  id                     String     @id @default(cuid())
  admissionId            String
  intakeId               String?
  deadlineType           String
  deadlineDate           DateTime
  deadlineTime           String?
  timezone               String    @default("UTC")
  title                  String
  description            String?
  isExtended             Boolean   @default(false)
  originalDeadline       DateTime?
  priority               String    @default("MEDIUM")
  isActive               Boolean   @default(true)
  reminderSent           Boolean   @default(false)
  reminderDate           DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  admission              Admission         @relation(fields: [admissionId], references: [id], onDelete: Cascade)
  intake                 Intake?           @relation(fields: [intakeId], references: [id], onDelete: Cascade)

  @@map("admission_deadlines")
}

model Application {
  id                       String     @id @default(cuid())
  admissionId              String
  intakeId                 String?
  userId                   String?
  firstName                String
  lastName                 String
  email                    String
  phone                    String?
  dateOfBirth              DateTime?
  nationality              String?
  currentGpa               Float?
  gmatScore                Int?
  greScore                 Int?
  ieltsScore               Float?
  toeflScore               Int?
  pteScore                 Int?
  duolingoScore            Int?
  workExperienceMonths     Int?
  workExperienceDetails    String?
  applicationStatus        String     @default("DRAFT")
  submissionDate           DateTime?
  reviewDate               DateTime?
  decisionDate             DateTime?
  documentsUploaded        String?
  documentsVerified        Boolean    @default(false)
  lastContactDate          DateTime?
  contactNotes             String?
  createdAt                DateTime   @default(now())
  updatedAt                DateTime   @updatedAt

  admission                Admission  @relation(fields: [admissionId], references: [id], onDelete: Cascade)
  intake                   Intake?    @relation(fields: [intakeId], references: [id], onDelete: Cascade)
  user                     User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents                ApplicationDocument[]
  interviews               Interview[]
  scholarshipApplications  ScholarshipApplication[]
  financialAidApplications FinancialAidApplication[]

  @@map("applications")
}

model ApplicationDocument {
  id                    String   @id @default(cuid())
  applicationId         String
  documentType          String
  documentTitle         String
  fileName              String
  fileUrl               String
  fileSize              Int?
  mimeType              String?
  isVerified            Boolean  @default(false)
  verifiedBy            String?
  verifiedAt            DateTime?
  verificationNotes     String?
  documentStatus        String   @default("PENDING")
  uploadedAt            DateTime @default(now())
  updatedAt             DateTime @updatedAt

  application           Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("application_documents")
}

model Interview {
  id                     String     @id @default(cuid())
  applicationId          String
  interviewType          String
  scheduledDate          DateTime?
  scheduledTime          String?
  timezone               String     @default("UTC")
  duration               Int?
  interviewerName        String?
  interviewerEmail       String?
  meetingLink            String?
  meetingPassword        String?
  location               String?
  interviewStatus        String     @default("SCHEDULED")
  interviewScore         Float?
  interviewFeedback      String?
  reminderSent           Boolean    @default(false)
  confirmationReceived   Boolean    @default(false)
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  application            Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("interviews")
}

// ==================== FINANCIAL MODELS ====================

model TuitionBreakdown {
  id                    String       @id @default(cuid())
  universityId          String
  programId             String?
  academicYear          String
  yearNumber            Int
  baseTuition           Float
  labFees               Float?       @default(0)
  libraryFees           Float?       @default(0)
  technologyFees        Float?       @default(0)
  activityFees          Float?       @default(0)
  healthInsurance       Float?       @default(0)
  dormitoryFees         Float?       @default(0)
  mealPlanFees          Float?       @default(0)
  applicationFee        Float?       @default(0)
  registrationFee       Float?       @default(0)
  examFees              Float?       @default(0)
  graduationFee         Float?       @default(0)
  totalTuition          Float
  totalAdditionalFees   Float
  grandTotal            Float
  currency              String       @default("USD")
  currencySymbol        String       @default("$")
  paymentTerms          String?
  installmentCount      Int?         @default(1)
  isActive              Boolean      @default(true)
  effectiveDate         DateTime     @default(now())
  expiryDate            DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  university            University   @relation(fields: [universityId], references: [id], onDelete: Cascade)
  program               Program?     @relation(fields: [programId], references: [id], onDelete: Cascade)
  paymentSchedule       PaymentSchedule[]

  @@unique([universityId, programId, academicYear, yearNumber])
  @@map("tuition_breakdowns")
}

model PaymentSchedule {
  id                    String              @id @default(cuid())
  tuitionBreakdownId    String
  installmentNumber     Int
  dueDate               DateTime
  amount                Float
  description           String?
  lateFee               Float?     @default(0)
  gracePeroidDays       Int?       @default(0)
  isActive              Boolean    @default(true)
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  tuitionBreakdown      TuitionBreakdown   @relation(fields: [tuitionBreakdownId], references: [id], onDelete: Cascade)

  @@map("payment_schedules")
}

model Scholarship {
  id                    String                    @id @default(cuid())
  universityId          String
  programId             String?
  scholarshipName       String
  scholarshipSlug       String
  scholarshipType       String
  description           String?
  eligibilityCriteria   String?
  amount                Float?
  percentage            Float?
  maxAmount             Float?
  currency              String       @default("USD")
  coverageTuition       Boolean      @default(false)
  coverageFees          Boolean      @default(false)
  coverageLiving        Boolean      @default(false)
  coverageBooks         Boolean      @default(false)
  applicationRequired   Boolean      @default(true)
  applicationDeadline   DateTime?
  documentsRequired     String?
  totalAvailable        Int?
  currentlyAwarded      Int?         @default(0)
  minimumGpa            Float?
  minimumTestScore      Int?
  testType              String?
  citizenshipRequired   String?
  isActive              Boolean      @default(true)
  applicationOpenDate   DateTime?
  applicationCloseDate  DateTime?
  awardDate             DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  university            University              @relation(fields: [universityId], references: [id], onDelete: Cascade)
  program               Program?                @relation(fields: [programId], references: [id], onDelete: Cascade)
  documents             ScholarshipDocument[]
  applications          ScholarshipApplication[]

  @@unique([universityId, scholarshipSlug])
  @@map("scholarships")
}

model ScholarshipDocument {
  id                    String       @id @default(cuid())
  scholarshipId         String
  documentType          String
  documentTitle         String
  fileName              String
  fileUrl               String
  fileSize              Int?
  mimeType              String?
  isRequired            Boolean      @default(false)
  displayOrder          Int          @default(0)
  isPublic              Boolean      @default(true)
  downloadCount         Int          @default(0)
  uploadedAt            DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  scholarship           Scholarship  @relation(fields: [scholarshipId], references: [id], onDelete: Cascade)

  @@map("scholarship_documents")
}

model ScholarshipApplication {
  id                    String       @id @default(cuid())
  scholarshipId         String
  userId                String?
  applicationId         String?
  firstName             String
  lastName              String
  email                 String
  phone                 String?
  currentGpa            Float?
  testScore             Int?
  testType              String?
  familyIncome          Float?
  financialNeed         String?
  applicationStatus     String       @default("DRAFT")
  submissionDate        DateTime?
  reviewDate            DateTime?
  decisionDate          DateTime?
  awardAmount           Float?
  documentsUploaded     String?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  scholarship           Scholarship  @relation(fields: [scholarshipId], references: [id], onDelete: Cascade)
  user                  User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  application           Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("scholarship_applications")
}

model FeeStructure {
  id                    String       @id @default(cuid())
  universityId          String
  programId             String?
  structureName         String
  structureType         String
  academicYear          String
  tuitionFee            Float
  admissionFee          Float?       @default(0)
  registrationFee       Float?       @default(0)
  examFee               Float?       @default(0)
  libraryFee            Float?       @default(0)
  labFee                Float?       @default(0)
  hostelFee             Float?       @default(0)
  messFee               Float?       @default(0)
  transportFee          Float?       @default(0)
  sportsFee             Float?       @default(0)
  medicalFee            Float?       @default(0)
  healthInsurance       Float?       @default(0)
  accidentInsurance     Float?       @default(0)
  studentActivityFee    Float?       @default(0)
  technologyFee         Float?       @default(0)
  securityDeposit       Float?       @default(0)
  cautionMoney          Float?       @default(0)
  isDepositRefundable   Boolean      @default(true)
  totalMandatoryFees    Float
  totalOptionalFees     Float
  grandTotal            Float
  currency              String       @default("USD")
  currencySymbol        String       @default("$")
  isActive              Boolean      @default(true)
  effectiveDate         DateTime     @default(now())
  expiryDate            DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  university            University   @relation(fields: [universityId], references: [id], onDelete: Cascade)
  program               Program?     @relation(fields: [programId], references: [id], onDelete: Cascade)

  @@unique([universityId, programId, structureType, academicYear])
  @@map("fee_structures")
}

model FinancialAid {
  id                    String       @id @default(cuid())
  universityId          String
  programId             String?
  aidName               String
  aidType               String
  description           String?
  amount                Float?
  percentage            Float?
  maxAmount             Float?
  currency              String       @default("USD")
  interestRate          Float?
  repaymentPeriod       Int?
  gracePeriod           Int?
  eligibilityCriteria   String?
  minimumGpa            Float?
  maximumFamilyIncome   Float?
  citizenshipRequired   String?
  applicationRequired   Boolean      @default(true)
  applicationDeadline   DateTime?
  documentsRequired     String?
  isActive              Boolean      @default(true)
  applicationOpenDate   DateTime?
  applicationCloseDate  DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  university            University   @relation(fields: [universityId], references: [id], onDelete: Cascade)
  program               Program?     @relation(fields: [programId], references: [id], onDelete: Cascade)
  applications          FinancialAidApplication[]

  @@map("financial_aids")
}

model FinancialAidApplication {
  id                    String       @id @default(cuid())
  financialAidId        String
  userId                String?
  applicationId         String?
  firstName             String
  lastName              String
  email                 String
  phone                 String?
  familyIncome          Float?
  assets                Float?
  liabilities           Float?
  dependents            Int?         @default(0)
  applicationStatus     String       @default("DRAFT")
  submissionDate        DateTime?
  reviewDate            DateTime?
  decisionDate          DateTime?
  approvedAmount        Float?
  documentsUploaded     String?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  financialAid          FinancialAid @relation(fields: [financialAidId], references: [id], onDelete: Cascade)
  user                  User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  application           Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("financial_aid_applications")
}
