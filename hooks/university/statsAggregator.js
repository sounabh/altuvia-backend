/**
 * statsAggregator.js
 * Single-pass aggregation of per-university data into dashboard summary stats.
 * Pure function — no I/O, fully testable.
 */

/**
 * Build timeline lookup Map from raw AITimeline rows.
 * Called once; O(n) with no repeated work.
 *
 * @param {Array} timelineData
 * @returns {Map<string, object>}
 */
export function buildTimelineMap(timelineData) {
  const map = new Map();
  if (!timelineData?.length) return map;

  for (const t of timelineData) {
    const key = `${t.universityId}-${t.programId ?? 'null'}`;
    map.set(key, {
      id: t.id,
      timelineName: t.timelineName,
      completionStatus: t.completionStatus,
      overallProgress: t.overallProgress,
      totalPhases: t.totalPhases,
      totalTasks: t.totalTasks,
      completedTasks: t.tasks?.length ?? 0,
      targetDeadline: t.targetDeadline,
      generatedAt: t.generatedAt,
    });
  }

  return map;
}

/**
 * Aggregate per-university objects into dashboard-level stats.
 * Single pass — O(n).
 *
 * @param {Array}       savedUniversities  - already-transformed university objects
 * @param {string|null} userStudyLevel
 * @returns {object}
 */
export function aggregateStats(savedUniversities, userStudyLevel) {
  const acc = {
    total: 0,
    inProgress: 0,
    submitted: 0,
    notStarted: 0,
    upcomingDeadlines: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalEssays: 0,
    completedEssays: 0,
    inProgressEssays: 0,
    notStartedEssays: 0,
    totalProgress: 0,
    fullyCompletedUniversities: 0,
    universitiesReadyForSubmission: 0,
  };

  for (const u of savedUniversities) {
    acc.total++;

    if (u.status === 'in-progress') acc.inProgress++;
    else if (u.status === 'submitted') {
      acc.submitted++;
      acc.fullyCompletedUniversities++;
    } else {
      acc.notStarted++;
    }

    acc.upcomingDeadlines += u.upcomingDeadlines;
    acc.totalTasks += u.totalTasks;
    acc.completedTasks += u.tasks;
    acc.totalEssays += u.totalEssays;
    acc.completedEssays += u.completedEssays;
    acc.inProgressEssays += u.inProgressEssays;
    acc.notStartedEssays += u.notStartedEssays;
    acc.totalProgress += u.overallProgress;

    if (u.stats?.applicationHealth?.readyForSubmission)
      acc.universitiesReadyForSubmission++;
  }

  acc.averageProgress =
    acc.total > 0 ? Math.round(acc.totalProgress / acc.total) : 0;
  acc.filteredByStudyLevel = userStudyLevel ?? null;

  return acc;
}