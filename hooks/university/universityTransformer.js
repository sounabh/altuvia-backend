/**
 * universityTransformer.js
 * Transforms raw Prisma university rows into the API response shape.
 * Pure functions — no I/O, fully testable.
 */

const DATE_FORMAT = { month: 'short', day: 'numeric', year: 'numeric' };

// ─── Essay Stats ──────────────────────────────────────────────────────────────

/**
 * Single-pass aggregation of essay completion stats.
 * @param {Array} essays
 * @returns {{ completed: number, inProgress: number }}
 */
export function calcEssayStats(essays) {
  return essays.reduce(
    (stats, essay) => {
      const pct =
        essay.wordLimit > 0 ? (essay.wordCount / essay.wordLimit) * 100 : 0;

      const done =
        essay.isCompleted ||
        essay.status === 'COMPLETED' ||
        essay.status === 'SUBMITTED' ||
        pct >= 98;

      if (done) stats.completed++;
      else if (essay.status === 'IN_PROGRESS' || essay.wordCount > 0)
        stats.inProgress++;

      return stats;
    },
    { completed: 0, inProgress: 0 }
  );
}

// ─── Program Aggregation ──────────────────────────────────────────────────────

/**
 * Reduce filtered programs into flat essay / prompt / admission arrays
 * in a single pass — avoids three separate .reduce() calls.
 */
export function aggregatePrograms(programs) {
  const allEssays = [];
  const allEssayPrompts = [];
  const allAdmissions = [];

  for (const program of programs) {
    if (program.essays?.length) allEssays.push(...program.essays);
    if (program.essayPrompts?.length) allEssayPrompts.push(...program.essayPrompts);
    if (program.admissions?.length) allAdmissions.push(...program.admissions);
  }

  return { allEssays, allEssayPrompts, allAdmissions };
}

// ─── Application Status ───────────────────────────────────────────────────────

export function deriveApplicationStatus({
  hasAnyActivity,
  allEssaysCompleted,
  allTasksCompleted,
  totalEssayPrompts,
  totalTasks,
}) {
  if (!hasAnyActivity) return 'not-started';
  if (
    allEssaysCompleted &&
    allTasksCompleted &&
    (totalEssayPrompts > 0 || totalTasks > 0)
  )
    return 'submitted';
  return 'in-progress';
}

// ─── Location ─────────────────────────────────────────────────────────────────

export const buildLocation = (city, state, country) =>
  `${city}${state ? ', ' + state : ''}, ${country}`;

// ─── Deadline label ───────────────────────────────────────────────────────────

export function buildDeadlineLabel(upcomingDeadlines, averageDeadlines) {
  if (upcomingDeadlines[0]) {
    return new Date(upcomingDeadlines[0].startDate).toLocaleDateString(
      'en-US',
      DATE_FORMAT
    );
  }
  return averageDeadlines?.split(',')[0]?.trim() || 'TBD';
}

// ─── Main transform ───────────────────────────────────────────────────────────

/**
 * Transform a single raw university into the response shape.
 * @param {object} university  - raw Prisma row (with nested relations)
 * @param {object} opts
 * @param {string|null} opts.userStudyLevel
 * @param {object}      opts.testScores    - parsed test scores
 * @param {Map}         opts.timelineMap   - keyed by `${uniId}-${programId|null}`
 * @param {Date}        opts.now           - reference date (pass once, reuse)
 */
export function transformUniversity(university, { userStudyLevel, testScores, timelineMap, now }) {
  // Filter programs by study level
  const filteredPrograms =
    userStudyLevel
      ? university.programs.filter(
          (p) => p.degreeType?.toLowerCase() === userStudyLevel
        )
      : university.programs;

  // Single-pass aggregation
  const { allEssays, allEssayPrompts, allAdmissions } =
    aggregatePrograms(filteredPrograms);

  const calendarEvents = university.calendarEvents ?? [];

  // Essay stats — single pass
  const essayStats = calcEssayStats(allEssays);
  const totalEssayPrompts = allEssayPrompts.length;
  const { completed: completedEssays, inProgress: inProgressEssays } = essayStats;
  const notStartedEssays = totalEssayPrompts - allEssays.length;
  const essayProgress =
    totalEssayPrompts > 0
      ? Math.round((completedEssays / totalEssayPrompts) * 100)
      : 0;

  // Task stats
  const totalTasks = calendarEvents.length;
  // Pre-count completed in one pass to avoid a second filter sweep
  let completedTasks = 0;
  const upcomingDeadlines = [];
  for (const e of calendarEvents) {
    if (e.completionStatus === 'completed') completedTasks++;
    if (new Date(e.startDate) > now && e.completionStatus !== 'completed')
      upcomingDeadlines.push(e);
  }

  const taskProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Application status
  const hasAnyActivity = allEssays.length > 0 || calendarEvents.length > 0;
  const allEssaysCompleted =
    totalEssayPrompts === 0 ||
    (totalEssayPrompts > 0 && completedEssays === totalEssayPrompts);
  const allTasksCompleted =
    totalTasks === 0 || (totalTasks > 0 && completedTasks === totalTasks);

  const applicationStatus = deriveApplicationStatus({
    hasAnyActivity,
    allEssaysCompleted,
    allTasksCompleted,
    totalEssayPrompts,
    totalTasks,
  });

  // Overall progress
  const overallProgress =
    totalEssayPrompts > 0 && totalTasks > 0
      ? Math.round(essayProgress * 0.7 + taskProgress * 0.3)
      : totalEssayPrompts > 0
      ? essayProgress
      : taskProgress;

  // AI timeline lookup
  const timelineKey = `${university.id}-${filteredPrograms[0]?.id ?? 'null'}`;
  const aiTimelineData = timelineMap.get(timelineKey) ?? null;

  return {
    id: university.id,
    name: university.universityName,
    universityName: university.universityName, // ✅ Added alias
    slug: university.slug,
    city: university.city,
    state: university.state,
    country: university.country,
    location: buildLocation(university.city, university.state, university.country),

    image: university.images[0]?.imageUrl ?? '/default-university.jpg',
    imageAlt: university.images[0]?.imageAltText ?? university.universityName,

    ftGlobalRanking: university.ftGlobalRanking,
    rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : 'N/A',
    gmatAverageScore: university.gmatAverageScore,
    acceptanceRate: allAdmissions[0]?.acceptanceRate ?? university.acceptanceRate,

    tuitionFees: university.tuitionFees,
    totalCost: university.totalCost,
    currency: university.currency ?? 'USD',

    status: applicationStatus,
    essayProgress,
    taskProgress,
    overallProgress,

    tasks: completedTasks,
    totalTasks,
    totalEssays: totalEssayPrompts,
    completedEssays,
    inProgressEssays,
    notStartedEssays,
    upcomingDeadlines: upcomingDeadlines.length,

    deadline: buildDeadlineLabel(upcomingDeadlines, university.averageDeadlines),

    aiTimeline: aiTimelineData,

    requiresGMAT: allAdmissions.some((a) => a.gmatMinScore > 0),
    requiresGRE: allAdmissions.some((a) => a.greMinScore > 0),
    requiresIELTS: allAdmissions.some((a) => a.ieltsMinScore > 0),
    requiresTOEFL: allAdmissions.some((a) => a.toeflMinScore > 0),

    userHasGMAT: testScores.hasGMAT,
    userHasGRE: testScores.hasGRE,
    userHasIELTS: testScores.hasIELTS,
    userHasTOEFL: testScores.hasTOEFL,
    userTestScores: testScores,

    // ✅ CRITICAL: Preserve raw calendar events for Next30Days component
    calendarEvents: calendarEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      eventStatus: event.eventStatus,
      completionStatus: event.completionStatus,
      startDate: event.startDate,
      endDate: event.endDate,
      priority: event.priority,
      isAllDay: event.isAllDay || false,
      completedAt: event.completedAt,
      location: event.location || null,
      color: event.color || university.schoolColor || '#6b7280',
      timezone: event.timezone,
      isSystemGenerated: event.isSystemGenerated,
      createdAt: event.createdAt,
    })),

    // ✅ CRITICAL: Preserve programs data
    programs: filteredPrograms.map(p => ({
      id: p.id,
      programName: p.programName,
      programSlug: p.programSlug,
      degreeType: p.degreeType,
      programLength: p.programLength,
      specializations: p.specializations,
      programDescription: p.programDescription,
    })),

    // ✅ CRITICAL: Preserve admissions with deadlines for Next30Days
    admissions: allAdmissions.map(adm => ({
      id: adm.id,
      minimumGpa: adm.minimumGpa,
      maximumGpa: adm.maximumGpa,
      gmatMinScore: adm.gmatMinScore,
      gmatMaxScore: adm.gmatMaxScore,
      gmatAverageScore: adm.gmatAverageScore,
      acceptanceRate: adm.acceptanceRate,
      deadlines: (adm.deadlines || []).map(dl => ({
        id: dl.id,
        deadlineType: dl.deadlineType,
        deadlineDate: dl.deadlineDate,
        deadlineTime: dl.deadlineTime,
        timezone: dl.timezone,
        title: dl.title,
        description: dl.description,
        priority: dl.priority,
        isExtended: dl.isExtended,
        originalDeadline: dl.originalDeadline,
      })),
      intakes: (adm.intakes || []).map(intake => ({
        id: intake.id,
        intakeName: intake.intakeName,
        intakeType: intake.intakeType,
        intakeYear: intake.intakeYear,
        applicationOpenDate: intake.applicationOpenDate,
        applicationCloseDate: intake.applicationCloseDate,
      })),
    })),

    stats: {
      tasks: { total: totalTasks, completed: completedTasks, completionRate: taskProgress },
      essays: {
        total: totalEssayPrompts,
        completed: completedEssays,
        inProgress: inProgressEssays,
        notStarted: notStartedEssays,
        completionRate: essayProgress,
      },
      applicationHealth: {
        status: applicationStatus,
        overallProgress,
        essaysFullyComplete: allEssaysCompleted,
        tasksFullyComplete: allTasksCompleted,
        readyForSubmission: allEssaysCompleted && allTasksCompleted,
      },
    },

    shortDescription: university.shortDescription,
    overview: university.overview,
    whyChooseHighlights: university.whyChooseHighlights ?? [],
    averageDeadlines: university.averageDeadlines,
    websiteUrl: university.websiteUrl,
    schoolColor: university.schoolColor || '#6b7280', // ✅ Added for event colors
    primaryProgram: filteredPrograms[0]?.programName || null, // ✅ Added for event context
    isAdded: true,
    userStudyLevel,
  };
}