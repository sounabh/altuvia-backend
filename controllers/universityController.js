import prisma from "../lib/prisma.js";

export async function toggleAdded(req, res) {
  try {
    const userId = req.userId; // Assumes middleware added this
    const { universityId } = req.body;
    console.log(universityId);

    if (!userId) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    if (!universityId) {
      return res.status(400).json({ error: "University ID is required" });
    }

    // ✅ Check if the user exists and include savedUniversities
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        savedUniversities: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Check if the university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // ✅ Check if university is already saved
    const isAlreadySaved = user.savedUniversities.some(
      (u) => u.id === universityId
    );

    let updatedUser;

    if (isAlreadySaved) {
      // ❌ Remove the university from saved list
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          savedUniversities: {
            disconnect: { id: universityId },
          },
        },
      });
    } else {
      // ✅ Add the university to saved list
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          savedUniversities: {
            connect: { id: universityId },
          },
        },
      });
    }

    return res.status(200).json({ isAdded: !isAlreadySaved });
  } catch (error) {
    console.error("Error toggling university save status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSavedUniversities(req, res) {
  try {
    const userId = req.userId; // From authentication middleware

    if (!userId) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    // Fetch user with saved universities
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        savedUniversities: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return saved universities with all necessary data
    const savedUniversities = user.savedUniversities.map((university) => ({
      id: university.id,
      universityName: university.universityName,
      slug: university.slug,
      city: university.city,
      state: university.state,
      country: university.country,
      location: `${university.city}${
        university.state ? ", " + university.state : ""
      }, ${university.country}`,
      images: university.images,
      image: university.images[0]?.imageUrl || "/default-university.jpg",
      ftGlobalRanking: university.ftGlobalRanking,
      rank: university.ftGlobalRanking
        ? `#${university.ftGlobalRanking}`
        : "N/A",
      gmatAverageScore: university.gmatAverageScore,
      gmatAverage: university.gmatAverageScore || "N/A",
      acceptanceRate: university.acceptanceRate,
      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      averageDeadlines: university.averageDeadlines,
      deadline: university.averageDeadlines
        ? university.averageDeadlines.split(",")[0].trim()
        : "TBD",
      shortDescription: university.shortDescription,
      overview: university.overview,
      whyChooseHighlights: university.whyChooseHighlights || [],
      isActive: university.isActive,
      isFeatured: university.isFeatured,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
      isAdded: true, // Since these are saved universities
    }));

    return res.status(200).json(savedUniversities);
  } catch (error) {
    console.error("Error fetching saved universities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUniversityBySlug(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    const university = await prisma.university.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        programs: {
          orderBy: { programName: "asc" },
        },
        departments: {
          orderBy: { name: "asc" },
        },
        tuitionBreakdowns: true,
        scholarships: true,
        feeStructures: true,
        financialAids: true,
      },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Format university data for client with all important fields
    const formattedUniversity = {
      id: university.id,
      name: university.universityName,
      slug: university.slug,
      location: `${university.city}${
        university.state ? ", " + university.state : ""
      }, ${university.country}`,
      city: university.city,
      state: university.state,
      country: university.country,
      fullAddress: university.fullAddress,

      // Images
      images: university.images.map((img) => img.imageUrl),

      // Descriptions
      description: university.shortDescription,
      shortDescription: university.shortDescription,
      overview: university.overview,
      biography: university.overview, // Keep for backward compatibility
      history: university.history,

      // Mission and Vision
      missionStatement: university.missionStatement,
      visionStatement: university.visionStatement,

      // Highlights
      whyChooseHighlights: university.whyChooseHighlights || [],

      // Basic info
      rating: 4.9, // Default rating - you might want to calculate this from reviews
      websiteUrl: university.websiteUrl,
      brochureUrl: university.brochureUrl,

      // Academic info
      programs: university.programs.map((p) => p.programName),
      departments: university.departments.map((d) => d.departmentName),
      accreditationDetails: university.accreditationDetails,

      // Rankings
      ftGlobalRanking: university.ftGlobalRanking,
      ftRegionalRanking: university.ftRegionalRanking,
      usNewsRanking: university.usNewsRanking,
      qsRanking: university.qsRanking,
      timesRanking: university.timesRanking,

      // Academic requirements
      acceptanceRate: university.acceptanceRate,
      gmatAverageScore: university.gmatAverageScore,
      gmatScoreMin: university.gmatScoreMin,
      gmatScoreMax: university.gmatScoreMax,
      minimumGpa: university.minimumGpa,
      languageTestRequirements: university.languageTestRequirements,

      // Financial information
      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      totalCost: university.totalCost,
      currency: university.currency,
      scholarshipInfo: university.scholarshipInfo,
      financialAidDetails: university.financialAidDetails,

      // Program details
      averageDeadlines: university.averageDeadlines,
      studentsPerYear: university.studentsPerYear,
      averageProgramLengthMonths: university.averageProgramLengthMonths,
      intakes: university.intakes,

      // Contact information
      admissionsOfficeContact: university.admissionsOfficeContact,
      internationalOfficeContact: university.internationalOfficeContact,
      generalInquiriesContact: university.generalInquiriesContact,

      // Career outcomes
      careerOutcomes: university.careerOutcomes,

      // Additional documents
      additionalDocumentUrls: university.additionalDocumentUrls || [],

      // Status flags
      isActive: university.isActive,
      isFeatured: university.isFeatured,

      // Stats for display (formatted for UI)
      stats: {
        students: university.studentsPerYear
          ? `${university.studentsPerYear.toLocaleString()}+`
          : "N/A",
        acceptance: university.acceptanceRate
          ? `${(university.acceptanceRate * 100).toFixed(1)}%`
          : "N/A",
        avgGmat: university.gmatAverageScore || "N/A",
      },

      // Additional data (keep for backward compatibility)
      additionalData: {
        ftGlobalRanking: university.ftGlobalRanking,
        ftRegionalRanking: university.ftRegionalRanking,
        usNewsRanking: university.usNewsRanking,
        qsRanking: university.qsRanking,
        timesRanking: university.timesRanking,
        tuitionFees: university.tuitionFees,
        additionalFees: university.additionalFees,
        totalCost: university.totalCost,
        averageDeadlines: university.averageDeadlines,
        gmatAverageScore: university.gmatAverageScore,
        acceptanceRate: university.acceptanceRate,
        studentsPerYear: university.studentsPerYear,
        averageProgramLengthMonths: university.averageProgramLengthMonths,
      },

      // Timestamps
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    };

    return res.status(200).json(formattedUniversity);
  } catch (error) {
    console.error("Error fetching university:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUniversityDepartments(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    const university = await prisma.university.findUnique({
      where: { slug },
      include: {
        departments: {
          orderBy: { name: 'asc' },
          include: {
            programs: {
              orderBy: { programName: 'asc' },
              select: {
                id: true,
                programName: true,
                programSlug: true,
                degreeType: true,
                programDescription: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    const formattedData = {
      university: {
        id: university.id,
        name: university.universityName,
        slug: university.slug
      },
      departments: university.departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description || null,
        programs: dept.programs.filter(prog => prog.isActive).map(prog => ({
          id: prog.id,
          name: prog.programName,
          slug: prog.programSlug,
          degreeType: prog.degreeType,
          description: prog.programDescription
        }))
      }))
    };

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching university departments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
export async function getUniversityPrograms(req, res) {
  try {
    const { slug } = req.params;
    const { department, degreeType, search } = req.query;

    if (!slug) {
      return res
        .status(400)
        .json({ error: "University slug parameter is required" });
    }

    // Build the where clause for programs
    const programsWhere = {};

    if (department) {
      programsWhere.departmentId = department;
    }

    if (degreeType) {
      programsWhere.degreeType = degreeType;
    }

    if (search) {
      programsWhere.OR = [
        { programName: { contains: search, mode: "insensitive" } },
        { programDescription: { contains: search, mode: "insensitive" } },
        { specializations: { contains: search, mode: "insensitive" } },
      ];
    }

    const university = await prisma.university.findUnique({
      where: { slug },
      include: {
        programs: {
          where: programsWhere,
          orderBy: { programName: "asc" },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            rankings: {
              orderBy: { year: "desc" },
              take: 1,
            },
            scholarships: {
              where: { isActive: true },
              take: 3,
            },
          },
        },
        departments: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { programs: true },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Get degree types for filtering
    const degreeTypes = await prisma.program.findMany({
      where: {
        universityId: university.id,
        degreeType: { not: null },
      },
      select: { degreeType: true },
      distinct: ["degreeType"],
    });

    const formattedData = {
      university: {
        id: university.id,
        name: university.universityName,
        slug: university.slug,
        city: university.city,
        state: university.state,
        country: university.country,
      },
      departments: university.departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        programCount: dept._count.programs,
      })),
      degreeTypes: degreeTypes.map((dt) => dt.degreeType).filter(Boolean),
      programs: university.programs.map((prog) => ({
        id: prog.id,
        name: prog.programName,
        slug: prog.programSlug,
        degreeType: prog.degreeType,
        duration: prog.programLength,
        description: prog.programDescription,
        specializations: prog.specializations,
        tuitionFees: prog.programTuitionFees,
        additionalFees: prog.programAdditionalFees,
        admissionRequirements: prog.admissionRequirements,
        averageEntranceScore: prog.averageEntranceScore,
        isActive: prog.isActive,
        department: prog.department,
        latestRanking: prog.rankings[0] || null,
        scholarships: prog.scholarships.map((scholarship) => ({
          id: scholarship.id,
          name: scholarship.name,
          amount: scholarship.amount,
          currency: scholarship.currency,
        })),
      })),
    };

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching university programs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProgramDetails(req, res) {
  try {
    const { slug, programId } = req.params;

    if (!slug || !programId) {
      return res
        .status(400)
        .json({ error: "University slug and program ID are required" });
    }

    // Try to find by programSlug first, then by id
    const program = await prisma.program.findFirst({
      where: {
        OR: [
          { programSlug: programId, university: { slug } },
          { id: programId, university: { slug } },
        ],
      },
      include: {
        university: {
          select: {
            id: true,
            universityName: true,
            slug: true,
            city: true,
            state: true,
            country: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        syllabus: true,
        rankings: {
          orderBy: { year: "desc" },
        },
        externalLinks: true,
        scholarships: {
          where: { isActive: true },
        },
        tuitionBreakdowns: true,
        feeStructures: true,
        financialAids: {
          where: { isActive: true },
        },
        EssayPrompt: true,
      },
    });

    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    const formattedData = {
      program: {
        id: program.id,
        name: program.programName,
        slug: program.programSlug,
        degreeType: program.degreeType,
        duration: program.programLength,
        description: program.programDescription,
        curriculumOverview: program.curriculumOverview,
        specializations: program.specializations,
        admissionRequirements: program.admissionRequirements,
        averageEntranceScore: program.averageEntranceScore,
        tuitionFees: program.programTuitionFees,
        additionalFees: program.programAdditionalFees,
        metaTitle: program.programMetaTitle,
        metaDescription: program.programMetaDescription,
        isActive: program.isActive,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      },
      university: {
        id: program.university.id,
        name: program.university.universityName, // ✅ renamed for frontend
        slug: program.university.slug,
        city: program.university.city,
        state: program.university.state,
        country: program.university.country,
      },
      department: program.department,
      syllabus: program.syllabus,
      rankings: program.rankings,
      externalLinks: program.externalLinks,
      scholarships: program.scholarships,
      tuitionBreakdowns: program.tuitionBreakdowns,
      feeStructures: program.feeStructures,
      financialAids: program.financialAids,
      essayPrompts: program.EssayPrompt,
    };

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching program details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
