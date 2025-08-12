import prisma from "../lib/prisma.js";

export async function toggleAdded(req, res) {
  try {
    const userId = req.userId; // Assumes middleware added this
    const { universityId } = req.body;
    console.log("University ID:", universityId);
    console.log("User ID:", userId);

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
        savedUniversities: {
          select: { id: true } // Only select id for efficiency
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Check if the university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true, universityName: true } // Only select what we need
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // ✅ Check if university is already saved
    const isAlreadySaved = user.savedUniversities.some(
      (u) => u.id === universityId
    );

    let result;

    if (isAlreadySaved) {
      // ❌ Remove the university from saved list
      await prisma.user.update({
        where: { id: userId },
        data: {
          savedUniversities: {
            disconnect: { id: universityId },
          },
        },
      });
      result = { isAdded: false, action: 'removed', message: 'University removed from saved list' };
    } else {
      // ✅ Add the university to saved list
      await prisma.user.update({
        where: { id: userId },
        data: {
          savedUniversities: {
            connect: { id: universityId },
          },
        },
      });
      result = { isAdded: true, action: 'added', message: 'University added to saved list' };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error toggling university save status:", error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Record not found" });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Constraint violation" });
    }
    
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
          where: { isActive: true }, // Only get active universities
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
              select: {
                imageUrl: true,
                imageAltText: true,
                imageTitle: true
              }
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }




    // Return saved universities with all necessary data
    const savedUniversities = user?.savedUniversities?.map((university) => ({
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
      imageAlt: university.images[0]?.imageAltText || university.universityName,
      ftGlobalRanking: university.ftGlobalRanking,
      rank: university.ftGlobalRanking
        ? `#${university.ftGlobalRanking}`
        : "N/A",
      gmatAverageScore: university.gmatAverageScore,
      gmatAverage: university.gmatAverageScore || "N/A",
      acceptanceRate: university.acceptanceRate,
      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      totalCost: university.totalCost,
      currency: university.currency || "USD",
      averageDeadlines: university.averageDeadlines,
      deadline: university.averageDeadlines
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
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


    console.log(savedUniversities,"saved");
    
    return res.status(200).json({
      count: savedUniversities.length,
      universities: savedUniversities
    });
  } catch (error) {
    console.error("Error fetching saved universities:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


export async function getUniversityBySlug(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    const university = await prisma.university.findUnique({
      where: { 
        slug,
        isActive: true
      },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            imageUrl: true,
            imageType: true,
            imageTitle: true,
            imageAltText: true,
            imageCaption: true,
            isPrimary: true,
            displayOrder: true
          }
        },
        programs: {
          where: { isActive: true },
          orderBy: { programName: "asc" },
          select: {
            id: true,
            programName: true,
            programSlug: true,
            degreeType: true,
            programDescription: true,
            programTuitionFees: true
          }
        },
        departments: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: { programs: true }
            }
          }
        },
        tuitionBreakdowns: {
          where: { isActive: true },
          orderBy: { academicYear: "desc" }
        },
        scholarships: {
          where: { isActive: true },
          orderBy: { scholarshipName: "asc" }
        },
        feeStructures: {
          where: { isActive: true },
          orderBy: { academicYear: "desc" }
        },
        financialAids: {
          where: { isActive: true },
          orderBy: { aidName: "asc" }
        },
      },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    const formattedUniversity = {
      id: university.id,
      name: university.universityName,
      universityName: university.universityName,
      slug: university.slug,
      location: `${university.city}${university.state ? ", " + university.state : ""}, ${university.country}`,
      city: university.city,
      state: university.state,
      country: university.country,
      fullAddress: university.fullAddress,

      // Images
      images: university.images.map((img) => ({
        url: img.imageUrl,
        alt: img.imageAltText || university.universityName,
        title: img.imageTitle,
        caption: img.imageCaption,
        isPrimary: img.isPrimary,
        type: img.imageType
      })),
      primaryImage: university.images.find(img => img.isPrimary)?.imageUrl ||
                    university.images[0]?.imageUrl ||
                    "/default-university.jpg",

      // ✅ Added for parity with getSavedUniversities
      image: university.images[0]?.imageUrl || "/default-university.jpg",
      imageAlt: university.images[0]?.imageAltText || university.universityName,
      isAdded: false, // Default false, frontend can set true if saved
      rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : "N/A",
      gmatAverage: university.gmatAverageScore || "N/A",
      deadline: university.averageDeadlines
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD",

      // Descriptions
      description: university.shortDescription,
      shortDescription: university.shortDescription,
      overview: university.overview,
      biography: university.overview,
      history: university.history,

      // Mission & Vision
      missionStatement: university.missionStatement,
      visionStatement: university.visionStatement,

      // Highlights
      whyChooseHighlights: university.whyChooseHighlights || [],

      // Basic info
      rating: 4.9,
      websiteUrl: university.websiteUrl,
      brochureUrl: university.brochureUrl,

      // Academic info
      programs: university.programs.map((p) => ({
        id: p.id,
        name: p.programName,
        slug: p.programSlug,
        degreeType: p.degreeType,
        description: p.programDescription,
        tuitionFees: p.programTuitionFees
      })),
      departments: university.departments.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        programCount: d._count.programs
      })),
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

      // Financial
      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      totalCost: university.totalCost,
      currency: university.currency || "USD",
      scholarshipInfo: university.scholarshipInfo,
      financialAidDetails: university.financialAidDetails,

      // Program details
      averageDeadlines: university.averageDeadlines,
      studentsPerYear: university.studentsPerYear,
      averageProgramLengthMonths: university.averageProgramLengthMonths,
      intakes: university.intakes,

      // Contacts
      admissionsOfficeContact: university.admissionsOfficeContact,
      internationalOfficeContact: university.internationalOfficeContact,
      generalInquiriesContact: university.generalInquiriesContact,

      // Career outcomes
      careerOutcomes: university.careerOutcomes,

      // Additional docs
      additionalDocumentUrls: university.additionalDocumentUrls || [],

      // Flags
      isActive: university.isActive,
      isFeatured: university.isFeatured,

      // Stats
      stats: {
        students: university.studentsPerYear
          ? `${university.studentsPerYear.toLocaleString()}+`
          : "N/A",
        acceptance: university.acceptanceRate
          ? `${(university.acceptanceRate * 100).toFixed(1)}%`
          : "N/A",
        avgGmat: university.gmatAverageScore || "N/A",
      },

      // Relational
      tuitionBreakdowns: university.tuitionBreakdowns,
      scholarships: university.scholarships,
      feeStructures: university.feeStructures,
      financialAids: university.financialAids,

      // Timestamps
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    };

    return res.status(200).json(formattedUniversity);
  } catch (error) {
    console.error("Error fetching university:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


export async function getUniversityDepartments(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    const university = await prisma.university.findUnique({
      where: { 
        slug,
        isActive: true
      },
      select: {
        id: true,
        universityName: true,
        slug: true
      }
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    const departments = await prisma.department.findMany({
      where: { 
        universityId: university.id
      },
      orderBy: { name: 'asc' },
      include: {
        programs: {
          where: { isActive: true },
          orderBy: { programName: 'asc' },
          select: {
            id: true,
            programName: true,
            programSlug: true,
            degreeType: true,
            programDescription: true,
            isActive: true
          }
        },
        _count: {
          select: { programs: true }
        }
      }
    });

    const formattedData = {
      university: {
        id: university.id,
        name: university.universityName,
        slug: university.slug
      },
      departments: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        programCount: dept._count.programs,
        programs: dept.programs.map(prog => ({
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
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function getUniversityPrograms(req, res) {
  try {
    const { slug } = req.params;
    const { department, degreeType, search, page = 1, limit = 20 } = req.query;

    if (!slug) {
      return res
        .status(400)
        .json({ error: "University slug parameter is required" });
    }

    // First get the university
    const university = await prisma.university.findUnique({
      where: { 
        slug,
        isActive: true 
      },
      select: {
        id: true,
        universityName: true,
        slug: true,
        city: true,
        state: true,
        country: true,
      }
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Build the where clause for programs
    const programsWhere = {
      universityId: university.id,
      isActive: true
    };

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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get programs with pagination
    const [programs, totalPrograms] = await Promise.all([
      prisma.program.findMany({
        where: programsWhere,
        orderBy: { programName: "asc" },
        skip,
        take: parseInt(limit),
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
            select: {
              id: true,
              scholarshipName: true,
              amount: true,
              currency: true
            }
          },
        },
      }),
      prisma.program.count({
        where: programsWhere
      })
    ]);

    // Get departments for filtering
    const departments = await prisma.department.findMany({
      where: { universityId: university.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: { programs: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get degree types for filtering
    const degreeTypes = await prisma.program.findMany({
      where: {
        universityId: university.id,
        degreeType: { not: null },
        isActive: true
      },
      select: { degreeType: true },
      distinct: ["degreeType"],
    });

    const formattedData = {
      university,
      departments: departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        programCount: dept._count.programs,
      })),
      degreeTypes: degreeTypes.map((dt) => dt.degreeType).filter(Boolean),
      programs: programs.map((prog) => ({
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
        scholarships: prog.scholarships,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPrograms,
        totalPages: Math.ceil(totalPrograms / parseInt(limit)),
        hasNext: skip + programs.length < totalPrograms,
        hasPrevious: parseInt(page) > 1
      }
    };

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching university programs:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
        AND: [
          { university: { slug, isActive: true } },
          { isActive: true },
          {
            OR: [
              { programSlug: programId },
              { id: programId },
            ]
          }
        ]
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
            websiteUrl: true,
            admissionsOfficeContact: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            slug: true
          },
        },
        syllabus: true,
        rankings: {
          orderBy: { year: "desc" },
        },
        externalLinks: {
          orderBy: { title: "asc" }
        },
        scholarships: {
          where: { isActive: true },
          orderBy: { scholarshipName: "asc" }
        },
        tuitionBreakdowns: {
          where: { isActive: true },
          orderBy: { academicYear: "desc" }
        },
        feeStructures: {
          where: { isActive: true },
          orderBy: { academicYear: "desc" }
        },
        financialAids: {
          where: { isActive: true },
          orderBy: { aidName: "asc" }
        },
        EssayPrompt: {
          where: { isActive: true },
          orderBy: { promptTitle: "asc" }
        },
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
        name: program.university.universityName,
        slug: program.university.slug,
        city: program.university.city,
        state: program.university.state,
        country: program.university.country,
        websiteUrl: program.university.websiteUrl,
        admissionsContact: program.university.admissionsOfficeContact
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
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}