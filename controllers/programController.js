// controllers/programController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper function for common error handling
const handleError = (res, error, message = "An error occurred") => {
  console.error(error);
  return res.status(500).json({ error: message });
};

// Helper function for pagination
const getPagination = (page, limit) => {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

// PROGRAM CONTROLLERS
const programController = {
  // GET /programs - List programs with advanced filtering
  getAllPrograms: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        universityId,
        departmentId,
        degreeType,
        programLength,
        minTuition,
        maxTuition,
        minScore,
        maxScore,
        search,
        sortBy = "programName",
        sortOrder = "asc",
      } = req.query;

      // Build filter conditions
      const where = {
        isActive: true,
        ...(universityId && { universityId }),
        ...(departmentId && { departmentId }),
        ...(degreeType && { degreeType }),
        ...(programLength && { programLength: parseInt(programLength) }),
        ...(minTuition && {
          programTuitionFees: { gte: parseFloat(minTuition) },
        }),
        ...(maxTuition && {
          programTuitionFees: { lte: parseFloat(maxTuition) },
        }),
        ...(minScore && {
          averageEntranceScore: { gte: parseFloat(minScore) },
        }),
        ...(maxScore && {
          averageEntranceScore: { lte: parseFloat(maxScore) },
        }),
        ...(search && {
          OR: [
            { programName: { contains: search, mode: "insensitive" } },
            { programDescription: { contains: search, mode: "insensitive" } },
            { specializations: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      // Handle tuition range filter
      if (minTuition && maxTuition) {
        where.programTuitionFees = {
          gte: parseFloat(minTuition),
          lte: parseFloat(maxTuition),
        };
      }

      const { skip, take } = getPagination(parseInt(page), parseInt(limit));

      const [programs, total] = await Promise.all([
        prisma.program.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            university: { select: { name: true, slug: true } },
            department: { select: { name: true, slug: true } },
            rankings: { orderBy: { year: "desc" }, take: 1 },
            _count: { select: { externalLinks: true } },
          },
        }),
        prisma.program.count({ where }),
      ]);

      res.json({
        programs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      handleError(res, error, "Failed to fetch programs");
    }
  },

  // GET /programs/:id - Get single program with full details
  getProgramById: async (req, res) => {
    try {
      const { id } = req.params;
      const program = await prisma.program.findUnique({
        where: { id },
        include: {
          university: true,
          department: true,
          syllabus: true,
          rankings: { orderBy: { year: "desc" } },
          externalLinks: true,
        },
      });

      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }

      res.json(program);
    } catch (error) {
      handleError(res, error, "Failed to fetch program");
    }
  },

  // POST /programs - Create new program
 createProgram: async (req, res) => {
  try {
    const {
      universityId,
      departmentId,
      programName,
      programSlug,
      degreeType,
      programLength,
      specializations,
      programDescription,
      curriculumOverview,
      admissionRequirements,
      averageEntranceScore,
      programTuitionFees,
      programAdditionalFees,
      programMetaTitle,
      programMetaDescription,
    } = req.body;

    // ✅ Check if program slug already exists for this university
    const existingProgram = await prisma.program.findUnique({
      where: { universityId_programSlug: { universityId, programSlug } },
    });

    if (existingProgram) {
      return res
        .status(400)
        .json({ error: "Program slug already exists for this university" });
    }

    // ✅ Fix: Ensure correct field names in select
    const program = await prisma.program.create({
      data: {
        universityId,
        departmentId,
        programName,
        programSlug,
        degreeType,
        programLength,
        specializations,
        programDescription,
        curriculumOverview,
        admissionRequirements,
        averageEntranceScore,
        programTuitionFees,
        programAdditionalFees,
        programMetaTitle,
        programMetaDescription,
      },
      include: {
        university: { select: { universityName: true } }, // 🛠️ Fixed: use the correct field name as per your Prisma schema
        department: { select: { name: true } },
      },
    });

    res.status(201).json(program);
  } catch (error) {
    handleError(res, error, "Failed to create program");
  }
},


  // PUT /programs/:id - Update program
  updateProgram: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const program = await prisma.program.update({
        where: { id },
        data: updateData,
        include: {
          university: { select: { universityName: true } }, // ✅ Correct
          department: { select: { name: true } },
        },
      });

      res.json(program);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Program not found" });
      }
      handleError(res, error, "Failed to update program");
    }
  },

  // DELETE /programs/:id - Delete program
  deleteProgram: async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.program.delete({ where: { id } });
      res.json({ message: "Program deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Program not found" });
      }
      handleError(res, error, "Failed to delete program");
    }
  },

  // DEPARTMENT CONTROLLERS
  getAllDepartments: async (req, res) => {
    try {
      const { universityId, search } = req.query;

      const where = {
        ...(universityId && { universityId }),
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      };

      const departments = await prisma.department.findMany({
        where,
        include: {
          university: { select: { name: true } },
          _count: { select: { programs: true } },
        },
        orderBy: { name: "asc" },
      });

      res.json(departments);
    } catch (error) {
      handleError(res, error, "Failed to fetch departments");
    }
  },

  getDepartmentById: async (req, res) => {
    try {
      const { id } = req.params;
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          university: true,
          programs: {
            select: {
              id: true,
              programName: true,
              programSlug: true,
              degreeType: true,
              isActive: true,
            },
          },
        },
      });

      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }

      res.json(department);
    } catch (error) {
      handleError(res, error, "Failed to fetch department");
    }
  },

  createDepartment: async (req, res) => {
    try {
      const { universityId, name, slug } = req.body;

      const department = await prisma.department.create({
        data: { universityId, name, slug },
        include: { university: { select: { name: true } } },
      });

      res.status(201).json(department);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(400)
          .json({
            error: "Department slug already exists for this university",
          });
      }
      handleError(res, error, "Failed to create department");
    }
  },

  updateDepartment: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const department = await prisma.department.update({
        where: { id },
        data: updateData,
        include: { university: { select: { name: true } } },
      });

      res.json(department);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Department not found" });
      }
      handleError(res, error, "Failed to update department");
    }
  },

  deleteDepartment: async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.department.delete({ where: { id } });
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Department not found" });
      }
      handleError(res, error, "Failed to delete department");
    }
  },

  // SYLLABUS CONTROLLERS
  uploadSyllabus: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const { fileUrl } = req.body;

      const syllabus = await prisma.syllabus.upsert({
        where: { programId },
        update: { fileUrl },
        create: { programId, fileUrl },
      });

      res.json(syllabus);
    } catch (error) {
      handleError(res, error, "Failed to upload syllabus");
    }
  },

  getSyllabus: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const syllabus = await prisma.syllabus.findUnique({
        where: { programId },
      });

      if (!syllabus) {
        return res.status(404).json({ error: "Syllabus not found" });
      }

      res.json(syllabus);
    } catch (error) {
      handleError(res, error, "Failed to fetch syllabus");
    }
  },

  deleteSyllabus: async (req, res) => {
    try {
      const { id: programId } = req.params;

      await prisma.syllabus.delete({ where: { programId } });
      res.json({ message: "Syllabus deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Syllabus not found" });
      }
      handleError(res, error, "Failed to delete syllabus");
    }
  },

  // RANKING CONTROLLERS
  addRanking: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const { year, rank, source } = req.body;

      const ranking = await prisma.programRanking.create({
        data: { programId, year, rank, source },
      });

      res.status(201).json(ranking);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(400)
          .json({ error: "Ranking already exists for this program and year" });
      }
      handleError(res, error, "Failed to add ranking");
    }
  },

  getRankings: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const rankings = await prisma.programRanking.findMany({
        where: { programId },
        orderBy: { year: "desc" },
      });

      res.json(rankings);
    } catch (error) {
      handleError(res, error, "Failed to fetch rankings");
    }
  },

  updateRanking: async (req, res) => {
    try {
      const { rankingId } = req.params;
      const updateData = req.body;

      const ranking = await prisma.programRanking.update({
        where: { id: rankingId },
        data: updateData,
      });

      res.json(ranking);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Ranking not found" });
      }
      handleError(res, error, "Failed to update ranking");
    }
  },

  deleteRanking: async (req, res) => {
    try {
      const { rankingId } = req.params;

      await prisma.programRanking.delete({ where: { id: rankingId } });
      res.json({ message: "Ranking deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Ranking not found" });
      }
      handleError(res, error, "Failed to delete ranking");
    }
  },

  // EXTERNAL LINKS CONTROLLERS
  addExternalLink: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const { title, url } = req.body;

      const link = await prisma.externalLink.create({
        data: { programId, title, url },
      });

      res.status(201).json(link);
    } catch (error) {
      handleError(res, error, "Failed to add external link");
    }
  },

  getExternalLinks: async (req, res) => {
    try {
      const { id: programId } = req.params;
      const links = await prisma.externalLink.findMany({
        where: { programId },
        orderBy: { createdAt: "desc" },
      });

      res.json(links);
    } catch (error) {
      handleError(res, error, "Failed to fetch external links");
    }
  },

  updateExternalLink: async (req, res) => {
    try {
      const { linkId } = req.params;
      const updateData = req.body;

      const link = await prisma.externalLink.update({
        where: { id: linkId },
        data: updateData,
      });

      res.json(link);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "External link not found" });
      }
      handleError(res, error, "Failed to update external link");
    }
  },

  deleteExternalLink: async (req, res) => {
    try {
      const { linkId } = req.params;

      await prisma.externalLink.delete({ where: { id: linkId } });
      res.json({ message: "External link deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "External link not found" });
      }
      handleError(res, error, "Failed to delete external link");
    }
  },
};

export default programController;
