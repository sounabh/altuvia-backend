// controllers/admissionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ========== ADMISSION CONTROLLERS ==========

// Get all admissions with filtering and pagination
const getAllAdmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      universityId,
      programId,
      status,
      intakeType,
      search
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = {};
    
    if (universityId) where.universityId = universityId;
    if (programId) where.programId = programId;
    if (status) where.admissionStatus = status;
    
    if (search) {
      where.OR = [
        { university: { universityName: { contains: search, mode: 'insensitive' } } },
        { program: { programName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        skip,
        take,
        include: {
          university: {
            select: {
              id: true,
              universityName: true,
              city: true,
              country: true
            }
          },
          program: {
            select: {
              id: true,
              programName: true,
              degreeType: true,
              programLength: true
            }
          },
          intakes: {
            where: { isActive: true },
            orderBy: { intakeYear: 'desc' }
          },
          deadlines: {
            where: { isActive: true },
            orderBy: { deadlineDate: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.admission.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        admissions,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admissions',
      error: error.message
    });
  }
};

// Get admission by ID
const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        university: true,
        program: true,
        intakes: {
          where: { isActive: true },
          orderBy: { intakeYear: 'desc' }
        },
        deadlines: {
          where: { isActive: true },
          orderBy: { deadlineDate: 'asc' }
        },
        applications: {
          select: {
            id: true,
            applicationStatus: true,
            submissionDate: true
          }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission not found'
      });
    }

    res.json({
      success: true,
      data: admission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admission',
      error: error.message
    });
  }
};

// Get admissions by university
const getAdmissionsByUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;

    const admissions = await prisma.admission.findMany({
      where: { universityId },
      include: {
        program: true,
        intakes: {
          where: { isActive: true },
          orderBy: { intakeYear: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: admissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admissions by university',
      error: error.message
    });
  }
};

// Get admissions by program
const getAdmissionsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;

    const admissions = await prisma.admission.findMany({
      where: { programId },
      include: {
        university: true,
        intakes: {
          where: { isActive: true },
          orderBy: { intakeYear: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: admissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admissions by program',
      error: error.message
    });
  }
};

// Create new admission
const createAdmission = async (req, res) => {
  try {
    const admissionData = req.body;

    const admission = await prisma.admission.create({
      data: admissionData,
      include: {
        university: true,
        program: true
      }
    });

    res.status(201).json({
      success: true,
      data: admission,
      message: 'Admission created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating admission',
      error: error.message
    });
  }
};

// Update admission
const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const admission = await prisma.admission.update({
      where: { id },
      data: updateData,
      include: {
        university: true,
        program: true
      }
    });

    res.json({
      success: true,
      data: admission,
      message: 'Admission updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating admission',
      error: error.message
    });
  }
};

// Delete admission
const deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.admission.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Admission deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting admission',
      error: error.message
    });
  }
};

// Toggle admission status
const toggleAdmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const admission = await prisma.admission.update({
      where: { id },
      data: { admissionStatus: status },
      include: {
        university: true,
        program: true
      }
    });

    res.json({
      success: true,
      data: admission,
      message: 'Admission status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating admission status',
      error: error.message
    });
  }
};

// ========== INTAKE CONTROLLERS ==========

// Get intakes by admission
const getIntakesByAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;

    const intakes = await prisma.intake.findMany({
      where: { admissionId },
      include: {
        deadlines: {
          where: { isActive: true },
          orderBy: { deadlineDate: 'asc' }
        }
      },
      orderBy: { intakeYear: 'desc' }
    });

    res.json({
      success: true,
      data: intakes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching intakes',
      error: error.message
    });
  }
};

// Create new intake
const createIntake = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const intakeData = { ...req.body, admissionId };

    const intake = await prisma.intake.create({
      data: intakeData,
      include: {
        admission: {
          include: {
            university: true,
            program: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: intake,
      message: 'Intake created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating intake',
      error: error.message
    });
  }
};

// Update intake
const updateIntake = async (req, res) => {
  try {
    const { intakeId } = req.params;
    const updateData = req.body;

    const intake = await prisma.intake.update({
      where: { id: intakeId },
      data: updateData
    });

    res.json({
      success: true,
      data: intake,
      message: 'Intake updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating intake',
      error: error.message
    });
  }
};

// Delete intake
const deleteIntake = async (req, res) => {
  try {
    const { intakeId } = req.params;

    await prisma.intake.delete({
      where: { id: intakeId }
    });

    res.json({
      success: true,
      message: 'Intake deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting intake',
      error: error.message
    });
  }
};

// ========== DEADLINE CONTROLLERS ==========

// Get deadlines by admission
const getDeadlinesByAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;

    const deadlines = await prisma.admissionDeadline.findMany({
      where: { admissionId },
      include: {
        intake: true
      },
      orderBy: { deadlineDate: 'asc' }
    });

    res.json({
      success: true,
      data: deadlines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching deadlines',
      error: error.message
    });
  }
};

// Create new deadline
const createDeadline = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const deadlineData = { ...req.body, admissionId };

    const deadline = await prisma.admissionDeadline.create({
      data: deadlineData,
      include: {
        intake: true
      }
    });

    res.status(201).json({
      success: true,
      data: deadline,
      message: 'Deadline created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating deadline',
      error: error.message
    });
  }
};

// Update deadline
const updateDeadline = async (req, res) => {
  try {
    const { deadlineId } = req.params;
    const updateData = req.body;

    const deadline = await prisma.admissionDeadline.update({
      where: { id: deadlineId },
      data: updateData
    });

    res.json({
      success: true,
      data: deadline,
      message: 'Deadline updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating deadline',
      error: error.message
    });
  }
};

// Delete deadline
const deleteDeadline = async (req, res) => {
  try {
    const { deadlineId } = req.params;

    await prisma.admissionDeadline.delete({
      where: { id: deadlineId }
    });

    res.json({
      success: true,
      message: 'Deadline deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting deadline',
      error: error.message
    });
  }
};

// ========== APPLICATION CONTROLLERS ==========

// Get applications by admission
const getApplicationsByAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { admissionId };
    if (status) where.applicationStatus = status;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take,
        include: {
          intake: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { submissionDate: 'desc' }
      }),
      prisma.application.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Create new application
const createApplication = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const applicationData = { ...req.body, admissionId };

    const application = await prisma.application.create({
      data: applicationData,
      include: {
        admission: {
          include: {
            university: true,
            program: true
          }
        },
        intake: true
      }
    });

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating application',
      error: error.message
    });
  }
};

// Get user applications
const getUserApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        admission: {
          include: {
            university: true,
            program: true
          }
        },
        intake: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user applications',
      error: error.message
    });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, notes } = req.body;

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        applicationStatus: status,
        contactNotes: notes,
        reviewDate: new Date()
      },
      include: {
        admission: {
          include: {
            university: true,
            program: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: application,
      message: 'Application status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// ========== UTILITY CONTROLLERS ==========

// Get admission statistics
const getAdmissionStatistics = async (req, res) => {
  try {
    const { admissionId } = req.params;

    const [
      totalApplications,
      acceptedApplications,
      rejectedApplications,
      pendingApplications,
      admission
    ] = await Promise.all([
      prisma.application.count({ where: { admissionId } }),
      prisma.application.count({ where: { admissionId, applicationStatus: 'ACCEPTED' } }),
      prisma.application.count({ where: { admissionId, applicationStatus: 'REJECTED' } }),
      prisma.application.count({ where: { admissionId, applicationStatus: 'UNDER_REVIEW' } }),
      prisma.admission.findUnique({ where: { id: admissionId } })
    ]);

    const acceptanceRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalApplications,
        acceptedApplications,
        rejectedApplications,
        pendingApplications,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        admission
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admission statistics',
      error: error.message
    });
  }
};

// Get upcoming deadlines
const getUpcomingDeadlines = async (req, res) => {
  try {
    const { limit = 10, universityId, programId } = req.query;
    const now = new Date();

    const where = {
      deadlineDate: { gte: now },
      isActive: true
    };

    if (universityId) where.admission = { universityId };
    if (programId) where.admission = { programId };

    const deadlines = await prisma.admissionDeadline.findMany({
      where,
      take: parseInt(limit),
      include: {
        admission: {
          include: {
            university: {
              select: {
                id: true,
                universityName: true,
                city: true,
                country: true
              }
            },
            program: {
              select: {
                id: true,
                programName: true,
                degreeType: true
              }
            }
          }
        },
        intake: true
      },
      orderBy: { deadlineDate: 'asc' }
    });

    res.json({
      success: true,
      data: deadlines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming deadlines',
      error: error.message
    });
  }
};

// Get active intakes
const getActiveIntakes = async (req, res) => {
  try {
    const { limit = 10, universityId, programId } = req.query;
    const now = new Date();

    const where = {
      isActive: true,
      intakeStatus: 'UPCOMING',
      applicationOpenDate: { lte: now },
      applicationCloseDate: { gte: now }
    };

    const intakes = await prisma.intake.findMany({
      where,
      take: parseInt(limit),
      include: {
        admission: {
          include: {
            university: {
              select: {
                id: true,
                universityName: true,
                city: true,
                country: true
              }
            },
            program: {
              select: {
                id: true,
                programName: true,
                degreeType: true
              }
            }
          }
        },
        deadlines: {
          where: { isActive: true },
          orderBy: { deadlineDate: 'asc' }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json({
      success: true,
      data: intakes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active intakes',
      error: error.message
    });
  }
};

// Check eligibility
const checkEligibility = async (req, res) => {
  try {
    const { admissionId, gpa, gmatScore, greScore, workExperience } = req.body;

    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        university: true,
        program: true
      }
    });

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission not found'
      });
    }

    const eligibilityCheck = {
      eligible: true,
      requirements: [],
      warnings: []
    };

    // Check GPA
    if (admission.minimumGpa && gpa < admission.minimumGpa) {
      eligibilityCheck.eligible = false;
      eligibilityCheck.requirements.push({
        type: 'GPA',
        required: admission.minimumGpa,
        provided: gpa,
        status: 'FAILED'
      });
    } else if (admission.minimumGpa) {
      eligibilityCheck.requirements.push({
        type: 'GPA',
        required: admission.minimumGpa,
        provided: gpa,
        status: 'PASSED'
      });
    }

    // Check GMAT Score
    if (admission.gmatMinScore && gmatScore < admission.gmatMinScore) {
      eligibilityCheck.eligible = false;
      eligibilityCheck.requirements.push({
        type: 'GMAT',
        required: admission.gmatMinScore,
        provided: gmatScore,
        status: 'FAILED'
      });
    } else if (admission.gmatMinScore) {
      eligibilityCheck.requirements.push({
        type: 'GMAT',
        required: admission.gmatMinScore,
        provided: gmatScore,
        status: 'PASSED'
      });
    }

    // Check GRE Score
    if (admission.greMinScore && greScore < admission.greMinScore) {
      eligibilityCheck.eligible = false;
      eligibilityCheck.requirements.push({
        type: 'GRE',
        required: admission.greMinScore,
        provided: greScore,
        status: 'FAILED'
      });
    } else if (admission.greMinScore) {
      eligibilityCheck.requirements.push({
        type: 'GRE',
        required: admission.greMinScore,
        provided: greScore,
        status: 'PASSED'
      });
    }

    // Check Work Experience
    if (admission.workExperienceRequired && admission.minWorkExperience) {
      if (workExperience < admission.minWorkExperience) {
        eligibilityCheck.eligible = false;
        eligibilityCheck.requirements.push({
          type: 'WORK_EXPERIENCE',
          required: admission.minWorkExperience,
          provided: workExperience,
          status: 'FAILED'
        });
      } else {
        eligibilityCheck.requirements.push({
          type: 'WORK_EXPERIENCE',
          required: admission.minWorkExperience,
          provided: workExperience,
          status: 'PASSED'
        });
      }
    }

    // Add warnings for competitive scores
    if (admission.gmatAverageScore && gmatScore < admission.gmatAverageScore) {
      eligibilityCheck.warnings.push({
        type: 'GMAT_BELOW_AVERAGE',
        message: `Your GMAT score (${gmatScore}) is below the average (${admission.gmatAverageScore})`
      });
    }

    res.json({
      success: true,
      data: {
        admission: {
          id: admission.id,
          university: admission.university.universityName,
          program: admission.program.programName
        },
        eligibilityCheck
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking eligibility',
      error: error.message
    });
  }
};



module.exports = {
  // Admission controllers
  getAllAdmissions,
  getAdmissionById,
  getAdmissionsByUniversity,
  getAdmissionsByProgram,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  toggleAdmissionStatus,
  
  // Intake controllers
  getIntakesByAdmission,
  createIntake,
  updateIntake,
  deleteIntake,
  
  // Deadline controllers
  getDeadlinesByAdmission,
  createDeadline,
  updateDeadline,
  deleteDeadline,
  
  // Application controllers
  getApplicationsByAdmission,
  createApplication,
  getUserApplications,
  updateApplicationStatus,
  
  // Utility controllers
  getAdmissionStatistics,
  getUpcomingDeadlines,
  getActiveIntakes,
  checkEligibility
};