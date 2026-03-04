/**
 * cvSummaryBuilder.js
 * Transforms a raw Prisma CV row into the lightweight summary shape.
 * Pure function — no I/O, fully testable.
 */

export function buildCvSummary(cvData) {
  if (!cvData) return null;

  return {
    id: cvData.id,
    title: cvData.title,
    slug: cvData.slug,
    isActive: cvData.isActive,
    completionPercentage: cvData.completionPercentage,
    atsScore: cvData.atsScore,
    lastATSCheckAt: cvData.lastATSCheckAt,
    updatedAt: cvData.updatedAt,

    personalInfo: cvData.personalInfo
      ? {
          fullName: cvData.personalInfo.fullName,
          email: cvData.personalInfo.email,
          headline: cvData.personalInfo.headline,
          // Truncate summary to 150 chars to keep payload small
          summary: cvData.personalInfo.summary?.substring(0, 150) ?? null,
        }
      : null,

    education:
      cvData.educations?.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        gpa: edu.gpa,
        isCurrent: edu.isCurrent,
      })) ?? [],

    experience:
      cvData.experiences?.map((exp) => ({
        company: exp.company,
        position: exp.position,
        isCurrent: exp.isCurrent,
      })) ?? [],

    skills:
      cvData.skills?.map((skill) => ({
        category: skill.categoryName,
        skillCount: skill.skills?.length ?? 0,
      })) ?? [],

    latestAIAnalysis: cvData.aiAnalysis?.[0] ?? null,
  };
}