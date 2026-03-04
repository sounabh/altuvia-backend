/**
 * universityQueryBuilder.js
 * Pure query-shape definitions - zero logic, just Prisma select/where shapes.
 * Split out so the main controller stays thin and these can be unit-tested independently.
 */

export const USER_PROFILE_SELECT = {
  studyLevel: true,
  gpa: true,
  testScores: true,
  workExperience: true,
};

export const UNIVERSITY_IMAGE_SELECT = {
  where: { isPrimary: true },
  take: 1,
  select: { imageUrl: true, imageAltText: true },
};

export const ESSAY_PROMPT_SELECT = {
  where: { isActive: true },
  select: {
    id: true,
    promptTitle: true,
    isMandatory: true,
    wordLimit: true,
    minWordCount: true,
  },
};

export const buildEssaySelect = (userId) => ({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    wordCount: true,
    wordLimit: true,
    priority: true,
    lastModified: true,
    isCompleted: true,
    completionPercentage: true,
    essayPromptId: true,
    essayPrompt: {
      select: {
        id: true,
        promptTitle: true,
        isMandatory: true,
        wordLimit: true,
        minWordCount: true,
      },
    },
  },
});

export const DEADLINE_SELECT = {
  where: {
    isActive: true,
    deadlineDate: { gte: new Date() },
  },
  orderBy: { deadlineDate: 'asc' },
  take: 3,
  select: {
    id: true,
    deadlineType: true,
    deadlineDate: true,
    title: true,
    priority: true,
    isExtended: true,
  },
};

export const INTAKE_SELECT = {
  where: { isActive: true },
  orderBy: { intakeYear: 'desc' },
  take: 2,
  select: {
    id: true,
    intakeName: true,
    intakeType: true,
    intakeYear: true,
    applicationOpenDate: true,
    applicationCloseDate: true,
  },
};

export const ADMISSION_SELECT = {
  where: { isActive: true },
  take: 1,
  select: {
    id: true,
    minimumGpa: true,
    maximumGpa: true,
    gmatMinScore: true,
    gmatMaxScore: true,
    gmatAverageScore: true,
    greMinScore: true,
    greMaxScore: true,
    greAverageScore: true,
    ieltsMinScore: true,
    toeflMinScore: true,
    pteMinScore: true,
    workExperienceRequired: true,
    minWorkExperience: true,
    maxWorkExperience: true,
    acceptanceRate: true,
    applicationFee: true,
    currency: true,
    deadlines: DEADLINE_SELECT,
    intakes: INTAKE_SELECT,
  },
};

export const buildProgramSelect = (userId) => ({
  where: { isActive: true },
  select: {
    id: true,
    programName: true,
    programSlug: true,
    degreeType: true,
    programLength: true,
    specializations: true,
    programDescription: true,
    essays: buildEssaySelect(userId),
    essayPrompts: ESSAY_PROMPT_SELECT,
    admissions: ADMISSION_SELECT,
  },
});

export const buildCalendarEventWhere = (userId) => ({
  userId,
  isVisible: true,
  startDate: {
    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
});

export const CALENDAR_EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  eventType: true,
  eventStatus: true,
  completionStatus: true,
  startDate: true,
  endDate: true,
  priority: true,
  completedAt: true,
  createdAt: true,
};

export const buildUniversitySelect = (userId) => ({
  where: { isActive: true },
  select: {
    id: true,
    universityName: true,
    slug: true,
    city: true,
    state: true,
    country: true,
    shortDescription: true,
    overview: true,
    whyChooseHighlights: true,
    ftGlobalRanking: true,
    gmatAverageScore: true,
    acceptanceRate: true,
    tuitionFees: true,
    additionalFees: true,
    totalCost: true,
    currency: true,
    averageDeadlines: true,
    intakes: true,
    websiteUrl: true,
    isActive: true,
    isFeatured: true,
    createdAt: true,
    updatedAt: true,
    images: UNIVERSITY_IMAGE_SELECT,
    programs: buildProgramSelect(userId),
    calendarEvents: {
      where: buildCalendarEventWhere(userId),
      select: CALENDAR_EVENT_SELECT,
      orderBy: { startDate: 'asc' },
      take: 50,
    },
  },
});

export const CV_SELECT = {
  id: true,
  title: true,
  slug: true,
  isActive: true,
  completionPercentage: true,
  atsScore: true,
  lastATSCheckAt: true,
  updatedAt: true,
  personalInfo: {
    select: {
      fullName: true,
      email: true,
      headline: true,
      summary: true,
    },
  },
  educations: {
    orderBy: { displayOrder: 'asc' },
    take: 2,
    select: {
      institution: true,
      degree: true,
      fieldOfStudy: true,
      gpa: true,
      endDate: true,
      isCurrent: true,
    },
  },
  experiences: {
    orderBy: { displayOrder: 'asc' },
    take: 2,
    select: {
      company: true,
      position: true,
      endDate: true,
      isCurrent: true,
    },
  },
  skills: {
    take: 3,
    select: { categoryName: true, skills: true },
  },
  aiAnalysis: {
    where: { analysisType: 'overall' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { overallScore: true, atsScore: true, createdAt: true },
  },
};

export const AI_TIMELINE_SELECT = {
  id: true,
  universityId: true,
  programId: true,
  timelineName: true,
  completionStatus: true,
  overallProgress: true,
  totalPhases: true,
  totalTasks: true,
  targetDeadline: true,
  generatedAt: true,
  // Only fetch IDs for count — avoids pulling full task rows
  tasks: {
    where: { isCompleted: true },
    select: { id: true },
  },
};