// controllers/financialController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { formatCurrency, calculateTotals, validateFinancialData } from '../utils/financialUtils';
import { createSlug } from '../utils/helpers';
import { uploadFile, deleteFile } from '../utils/fileUtils';

// ========== TUITION BREAKDOWN CONTROLLERS ==========

export async function getTuitionBreakdown(req, res) {
  try {
    const { universityId, programId } = req.params;
    const { academicYear, yearNumber } = req.query;

    const whereClause = {
      universityId,
      ...(programId && { programId }),
      ...(academicYear && { academicYear }),
      ...(yearNumber && { yearNumber: parseInt(yearNumber) }),
      isActive: true
    };

    const tuitionBreakdowns = await prisma.tuitionBreakdown.findMany({
      where: whereClause,
      include: {
        university: {
          select: { id: true, universityName: true }
        },
        program: {
          select: { id: true, programName: true }
        },
        paymentSchedule: {
          orderBy: { installmentNumber: 'asc' }
        }
      },
      orderBy: [
        { academicYear: 'asc' },
        { yearNumber: 'asc' }
      ]
    });

    // Format currency for each breakdown
    const formattedBreakdowns = tuitionBreakdowns.map(breakdown => ({
      ...breakdown,
      formattedTuition: formatCurrency(breakdown.baseTuition, breakdown.currency),
      formattedTotal: formatCurrency(breakdown.grandTotal, breakdown.currency),
      paymentSchedule: breakdown.paymentSchedule.map(payment => ({
        ...payment,
        formattedAmount: formatCurrency(payment.amount, breakdown.currency)
      }))
    }));

    res.json({
      success: true,
      data: formattedBreakdowns,
      total: formattedBreakdowns.length
    });
  } catch (error) {
    console.error('Error fetching tuition breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuition breakdown',
      error: error.message
    });
  }
}

export async function getTuitionBreakdownByYear(req, res) {
  try {
    const { universityId, academicYear } = req.params;

    const breakdowns = await prisma.tuitionBreakdown.findMany({
      where: {
        universityId,
        academicYear,
        isActive: true
      },
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        },
        paymentSchedule: true
      },
      orderBy: { yearNumber: 'asc' }
    });

    res.json({
      success: true,
      data: breakdowns,
      academicYear,
      totalYears: breakdowns.length
    });
  } catch (error) {
    console.error('Error fetching tuition breakdown by year:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuition breakdown by year',
      error: error.message
    });
  }
}

export async function createTuitionBreakdown(req, res) {
  try {
    const {
      universityId,
      programId,
      academicYear,
      yearNumber,
      baseTuition,
      labFees = 0,
      libraryFees = 0,
      technologyFees = 0,
      activityFees = 0,
      healthInsurance = 0,
      dormitoryFees = 0,
      mealPlanFees = 0,
      applicationFee = 0,
      registrationFee = 0,
      examFees = 0,
      graduationFee = 0,
      currency = 'USD',
      paymentTerms,
      installmentCount = 1
    } = req.body;

    // Calculate totals
    const totalAdditionalFees = labFees + libraryFees + technologyFees + activityFees + 
                               healthInsurance + dormitoryFees + mealPlanFees + 
                               applicationFee + registrationFee + examFees + graduationFee;
    
    const totalTuition = baseTuition;
    const grandTotal = totalTuition + totalAdditionalFees;

    // Get currency symbol
    const currencySymbol = getCurrencySymbol(currency);

    const tuitionBreakdown = await prisma.tuitionBreakdown.create({
      data: {
        universityId,
        programId,
        academicYear,
        yearNumber,
        baseTuition,
        labFees,
        libraryFees,
        technologyFees,
        activityFees,
        healthInsurance,
        dormitoryFees,
        mealPlanFees,
        applicationFee,
        registrationFee,
        examFees,
        graduationFee,
        totalTuition,
        totalAdditionalFees,
        grandTotal,
        currency,
        currencySymbol,
        paymentTerms,
        installmentCount
      },
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tuition breakdown created successfully',
      data: tuitionBreakdown
    });
  } catch (error) {
    console.error('Error creating tuition breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tuition breakdown',
      error: error.message
    });
  }
}

export async function updateTuitionBreakdown(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Recalculate totals if fee components are updated
    if (updateData.baseTuition || updateData.labFees || updateData.libraryFees || 
        updateData.technologyFees || updateData.activityFees || updateData.healthInsurance ||
        updateData.dormitoryFees || updateData.mealPlanFees || updateData.applicationFee ||
        updateData.registrationFee || updateData.examFees || updateData.graduationFee) {
      
      const currentBreakdown = await prisma.tuitionBreakdown.findUnique({
        where: { id }
      });

      if (!currentBreakdown) {
        return res.status(404).json({
          success: false,
          message: 'Tuition breakdown not found'
        });
      }

      const baseTuition = updateData.baseTuition || currentBreakdown.baseTuition;
      const labFees = updateData.labFees || currentBreakdown.labFees;
      const libraryFees = updateData.libraryFees || currentBreakdown.libraryFees;
      const technologyFees = updateData.technologyFees || currentBreakdown.technologyFees;
      const activityFees = updateData.activityFees || currentBreakdown.activityFees;
      const healthInsurance = updateData.healthInsurance || currentBreakdown.healthInsurance;
      const dormitoryFees = updateData.dormitoryFees || currentBreakdown.dormitoryFees;
      const mealPlanFees = updateData.mealPlanFees || currentBreakdown.mealPlanFees;
      const applicationFee = updateData.applicationFee || currentBreakdown.applicationFee;
      const registrationFee = updateData.registrationFee || currentBreakdown.registrationFee;
      const examFees = updateData.examFees || currentBreakdown.examFees;
      const graduationFee = updateData.graduationFee || currentBreakdown.graduationFee;

      const totalAdditionalFees = labFees + libraryFees + technologyFees + activityFees + 
                                 healthInsurance + dormitoryFees + mealPlanFees + 
                                 applicationFee + registrationFee + examFees + graduationFee;
      
      const totalTuition = baseTuition;
      const grandTotal = totalTuition + totalAdditionalFees;

      updateData.totalTuition = totalTuition;
      updateData.totalAdditionalFees = totalAdditionalFees;
      updateData.grandTotal = grandTotal;
    }

    const updatedBreakdown = await prisma.tuitionBreakdown.update({
      where: { id },
      data: updateData,
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Tuition breakdown updated successfully',
      data: updatedBreakdown
    });
  } catch (error) {
    console.error('Error updating tuition breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tuition breakdown',
      error: error.message
    });
  }
}

export async function deleteTuitionBreakdown(req, res) {
  try {
    const { id } = req.params;

    await prisma.tuitionBreakdown.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Tuition breakdown deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tuition breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tuition breakdown',
      error: error.message
    });
  }
}

// ========== PAYMENT SCHEDULE CONTROLLERS ==========

export async function getPaymentSchedule(req, res) {
  try {
    const { tuitionBreakdownId } = req.params;

    const paymentSchedule = await prisma.paymentSchedule.findMany({
      where: {
        tuitionBreakdownId,
        isActive: true
      },
      include: {
        tuitionBreakdown: {
          select: {
            currency: true,
            currencySymbol: true,
            academicYear: true
          }
        }
      },
      orderBy: { installmentNumber: 'asc' }
    });

    const formattedSchedule = paymentSchedule.map(payment => ({
      ...payment,
      formattedAmount: formatCurrency(payment.amount, payment.tuitionBreakdown.currency),
      formattedLateFee: formatCurrency(payment.lateFee || 0, payment.tuitionBreakdown.currency)
    }));

    res.json({
      success: true,
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment schedule',
      error: error.message
    });
  }
}

export async function createPaymentSchedule(req, res) {
  try {
    const {
      tuitionBreakdownId,
      installmentNumber,
      dueDate,
      amount,
      description,
      lateFee = 0,
      gracePeroidDays = 0
    } = req.body;

    const paymentSchedule = await prisma.paymentSchedule.create({
      data: {
        tuitionBreakdownId,
        installmentNumber,
        dueDate: new Date(dueDate),
        amount,
        description,
        lateFee,
        gracePeroidDays
      },
      include: {
        tuitionBreakdown: {
          select: {
            currency: true,
            academicYear: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment schedule created successfully',
      data: paymentSchedule
    });
  } catch (error) {
    console.error('Error creating payment schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment schedule',
      error: error.message
    });
  }
}

// ========== SCHOLARSHIP CONTROLLERS ==========

export async function getScholarships(req, res) {
  try {
    const { universityId } = req.params;
    const { programId, scholarshipType, isActive = true } = req.query;

    const whereClause = {
      universityId,
      ...(programId && { programId }),
      ...(scholarshipType && { scholarshipType }),
      isActive: isActive === 'true'
    };

    const scholarships = await prisma.scholarship.findMany({
      where: whereClause,
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        },
        documents: {
          where: { isPublic: true },
          select: {
            id: true,
            documentType: true,
            documentTitle: true,
            fileName: true,
            fileSize: true,
            downloadCount: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedScholarships = scholarships.map(scholarship => ({
      ...scholarship,
      formattedAmount: scholarship.amount ? formatCurrency(scholarship.amount, scholarship.currency) : null,
      formattedMaxAmount: scholarship.maxAmount ? formatCurrency(scholarship.maxAmount, scholarship.currency) : null,
      availableSlots: scholarship.totalAvailable ? scholarship.totalAvailable - scholarship.currentlyAwarded : null
    }));

    res.json({
      success: true,
      data: formattedScholarships,
      total: formattedScholarships.length
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarships',
      error: error.message
    });
  }
}

export async function getScholarshipBySlug(req, res) {
  try {
    const { universityId, scholarshipSlug } = req.params;

    const scholarship = await prisma.scholarship.findFirst({
      where: {
        universityId,
        scholarshipSlug,
        isActive: true
      },
      include: {
        university: {
          select: { universityName: true, city: true, country: true }
        },
        program: {
          select: { programName: true, degreeType: true }
        },
        documents: {
          where: { isPublic: true },
          orderBy: { displayOrder: 'asc' }
        },
        applications: {
          where: { applicationStatus: 'APPROVED' },
          select: { id: true, awardAmount: true }
        }
      }
    });

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found'
      });
    }

    const formattedScholarship = {
      ...scholarship,
      formattedAmount: scholarship.amount ? formatCurrency(scholarship.amount, scholarship.currency) : null,
      formattedMaxAmount: scholarship.maxAmount ? formatCurrency(scholarship.maxAmount, scholarship.currency) : null,
      availableSlots: scholarship.totalAvailable ? scholarship.totalAvailable - scholarship.currentlyAwarded : null,
      totalAwarded: scholarship.applications.length,
      totalAwardedAmount: scholarship.applications.reduce((sum, app) => sum + (app.awardAmount || 0), 0)
    };

    res.json({
      success: true,
      data: formattedScholarship
    });
  } catch (error) {
    console.error('Error fetching scholarship by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scholarship',
      error: error.message
    });
  }
}

export async function createScholarship(req, res) {
  try {
    const {
      universityId,
      programId,
      scholarshipName,
      scholarshipType,
      description,
      eligibilityCriteria,
      amount,
      percentage,
      maxAmount,
      currency = 'USD',
      coverageTuition = false,
      coverageFees = false,
      coverageLiving = false,
      coverageBooks = false,
      applicationRequired = true,
      applicationDeadline,
      documentsRequired,
      totalAvailable,
      minimumGpa,
      minimumTestScore,
      testType,
      citizenshipRequired,
      applicationOpenDate,
      applicationCloseDate
    } = req.body;

    const scholarshipSlug = createSlug(scholarshipName);

    const scholarship = await prisma.scholarship.create({
      data: {
        universityId,
        programId,
        scholarshipName,
        scholarshipSlug,
        scholarshipType,
        description,
        eligibilityCriteria,
        amount,
        percentage,
        maxAmount,
        currency,
        coverageTuition,
        coverageFees,
        coverageLiving,
        coverageBooks,
        applicationRequired,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        documentsRequired,
        totalAvailable,
        minimumGpa,
        minimumTestScore,
        testType,
        citizenshipRequired,
        applicationOpenDate: applicationOpenDate ? new Date(applicationOpenDate) : null,
        applicationCloseDate: applicationCloseDate ? new Date(applicationCloseDate) : null
      },
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Scholarship created successfully',
      data: scholarship
    });
  } catch (error) {
    console.error('Error creating scholarship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scholarship',
      error: error.message
    });
  }
}

export async function updateScholarship(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Generate new slug if name is changed
    if (updateData.scholarshipName) {
      updateData.scholarshipSlug = createSlug(updateData.scholarshipName);
    }

    const updatedScholarship = await prisma.scholarship.update({
      where: { id },
      data: updateData,
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Scholarship updated successfully',
      data: updatedScholarship
    });
  } catch (error) {
    console.error('Error updating scholarship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scholarship',
      error: error.message
    });
  }
}

export async function deleteScholarship(req, res) {
  try {
    const { id } = req.params;

    // Check if scholarship has applications
    const applicationCount = await prisma.scholarshipApplication.count({
      where: { scholarshipId: id }
    });

    if (applicationCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete scholarship with existing applications'
      });
    }

    await prisma.scholarship.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Scholarship deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scholarship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scholarship',
      error: error.message
    });
  }
}

// ========== SCHOLARSHIP APPLICATION CONTROLLERS ==========

export async function submitScholarshipApplication(req, res) {
  try {
    const { scholarshipId } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      currentGpa,
      testScore,
      testType,
      familyIncome,
      financialNeed,
      documentsUploaded
    } = req.body;

    const userId = req.user ? req.user.id : null;

    // Check if scholarship exists and is active
    const scholarship = await prisma.scholarship.findFirst({
      where: {
        id: scholarshipId,
        isActive: true
      }
    });

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found or not active'
      });
    }

    // Check if application deadline has passed
    if (scholarship.applicationCloseDate && new Date() > scholarship.applicationCloseDate) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if user already applied
    if (userId) {
      const existingApplication = await prisma.scholarshipApplication.findFirst({
        where: {
          scholarshipId,
          userId
        }
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this scholarship'
        });
      }
    }

    const application = await prisma.scholarshipApplication.create({
      data: {
        scholarshipId,
        userId,
        firstName,
        lastName,
        email,
        phone,
        currentGpa,
        testScore,
        testType,
        familyIncome,
        financialNeed,
        documentsUploaded,
        applicationStatus: 'SUBMITTED',
        submissionDate: new Date()
      },
      include: {
        scholarship: {
          select: {
            scholarshipName: true,
            university: {
              select: { universityName: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Scholarship application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Error submitting scholarship application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit scholarship application',
      error: error.message
    });
  }
}

// ========== FEE STRUCTURE CONTROLLERS ==========

export async function getFeeStructure(req, res) {
  try {
    const { universityId, programId } = req.params;
    const { structureType, academicYear } = req.query;

    const whereClause = {
      universityId,
      ...(programId && { programId }),
      ...(structureType && { structureType }),
      ...(academicYear && { academicYear }),
      isActive: true
    };

    const feeStructures = await prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      },
      orderBy: { academicYear: 'desc' }
    });

    const formattedStructures = feeStructures.map(structure => ({
      ...structure,
      formattedTuition: formatCurrency(structure.tuitionFee, structure.currency),
      formattedTotal: formatCurrency(structure.grandTotal, structure.currency),
      breakdown: {
        mandatory: {
          tuition: formatCurrency(structure.tuitionFee, structure.currency),
          admission: formatCurrency(structure.admissionFee || 0, structure.currency),
          registration: formatCurrency(structure.registrationFee || 0, structure.currency),
          exam: formatCurrency(structure.examFee || 0, structure.currency),
          library: formatCurrency(structure.libraryFee || 0, structure.currency),
          lab: formatCurrency(structure.labFee || 0, structure.currency),
          total: formatCurrency(structure.totalMandatoryFees, structure.currency)
        },
        optional: {
          hostel: formatCurrency(structure.hostelFee || 0, structure.currency),
          mess: formatCurrency(structure.messFee || 0, structure.currency),
          transport: formatCurrency(structure.transportFee || 0, structure.currency),
          sports: formatCurrency(structure.sportsFee || 0, structure.currency),
          medical: formatCurrency(structure.medicalFee || 0, structure.currency),
          total: formatCurrency(structure.totalOptionalFees, structure.currency)
        }
      }
    }));

    res.json({
      success: true,
      data: formattedStructures
    });
  } catch (error) {
    console.error('Error fetching fee structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee structure',
      error: error.message
    });
  }
}

export async function createFeeStructure(req, res) {
  try {
    const {
      universityId,
      programId,
      structureName,
      structureType,
      academicYear,
      tuitionFee,
      admissionFee = 0,
      registrationFee = 0,
      examFee = 0,
      libraryFee = 0,
      labFee = 0,
      hostelFee = 0,
      messFee = 0,
      transportFee = 0,
      sportsFee = 0,
      medicalFee = 0,
      healthInsurance = 0,
      accidentInsurance = 0,
      studentActivityFee = 0,
      technologyFee = 0,
      securityDeposit = 0,
      cautionMoney = 0,
      isDepositRefundable = true,
      currency = 'USD'
    } = req.body;

    // Calculate totals
    const totalMandatoryFees = tuitionFee + admissionFee + registrationFee + examFee + libraryFee + labFee;
    const totalOptionalFees = hostelFee + messFee + transportFee + sportsFee + medicalFee + 
                             healthInsurance + accidentInsurance + studentActivityFee + technologyFee;
    const grandTotal = totalMandatoryFees + totalOptionalFees + securityDeposit + cautionMoney;

    const currencySymbol = getCurrencySymbol(currency);

    const feeStructure = await prisma.feeStructure.create({
      data: {
        universityId,
        programId,
        structureName,
        structureType,
        academicYear,
        tuitionFee,
        admissionFee,
        registrationFee,
        examFee,
        libraryFee,
        labFee,
        hostelFee,
        messFee,
        transportFee,
        sportsFee,
        medicalFee,
        healthInsurance,
        accidentInsurance,
        studentActivityFee,
        technologyFee,
        securityDeposit,
        cautionMoney,
        isDepositRefundable,
        totalMandatoryFees,
        totalOptionalFees,
        grandTotal,
        currency,
        currencySymbol
      },
      include: {
        university: {
          select: { universityName: true }
        },
        program: {
          select: { programName: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Fee structure created successfully',
      data: feeStructure
    });
  } catch (error) {
    console.error('Error creating fee structure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fee structure',
      error: error.message
    });
  }
}

// ========== UTILITY FUNCTIONS ==========

function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
    'KRW': '₩',
    'SGD': 'S$'
  };
  return symbols[currency] || currency;
}

// ========== FINANCIAL OVERVIEW CONTROLLER ==========

export async function getFinancialOverview(req, res) {
  try {
    const { universityId, programId } = req.params;

    // Get tuition breakdown
    const tuitionBreakdown = await prisma.tuitionBreakdown.findMany({
      where: {
        universityId,
        ...(programId && { programId }),
        isActive: true
      },
      include: {
        paymentSchedule: true
      },
      orderBy: { academicYear: 'desc' }
    });

    // Get scholarships
    const scholarships = await prisma.scholarship.findMany({
      where: {
        universityId,
        ...(programId && { programId }),
        isActive: true
      },
      select: {
        id: true,
        scholarshipName: true,
        scholarshipType: true,
        amount: true,
        percentage: true,
        maxAmount: true,
        currency: true,
        totalAvailable: true,
        currentlyAwarded: true
      }
    });

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findMany({
      where: {
        universityId,
        ...(programId && { programId }),
        isActive: true
      },
      orderBy: { academicYear: 'desc' }
    });

    // Get financial aids
    const financialAids = await prisma.financialAid.findMany({
      where: {
        universityId,
        ...(programId && { programId }),
        isActive: true
      },
      select: {
        id: true,
        aidName: true,
        aidType: true,
        amount: true,
        percentage: true,
        maxAmount: true,
        currency: true
      }
    });

    res.json({
      success: true,
      data: {
        tuitionBreakdown,
        scholarships,
        feeStructure,
        financialAids
      }
    });
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial overview',
      error: error.message
    });
  }
}

export async function getFinancialCalculatorData(req, res) {
  try {
    const { universityId, programId } = req.params;

    // Get current year's data
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    // Get tuition data
    const tuitionData = await prisma.tuitionBreakdown.findFirst({
      where: {
        universityId,
        ...(programId && { programId }),
        academicYear,
        isActive: true
      }
    });

    // Get fee structure
    const feeData = await prisma.feeStructure.findFirst({
      where: {
        universityId,
        ...(programId && { programId }),
        academicYear,
        isActive: true
      }
    });

    // Get available scholarships
    const scholarships = await prisma.scholarship.findMany({
      where: {
        universityId,
        ...(programId && { programId }),
        isActive: true,
        OR: [
          { applicationCloseDate: null },
          { applicationCloseDate: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        scholarshipName: true,
        amount: true,
        percentage: true,
        maxAmount: true,
        currency: true
      }
    });

    res.json({
      success: true,
      data: {
        tuition: tuitionData,
        fees: feeData,
        scholarships,
        academicYear
      }
    });
  } catch (error) {
    console.error('Error fetching financial calculator data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial calculator data',
      error: error.message
    });
  }
}

export async function convertCurrency(req, res) {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    // Here you would integrate with a currency conversion API
    // For now, returning a mock response
    const mockRates = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'INR': 82.5, 'CAD': 1.25 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'INR': 97.2, 'CAD': 1.47 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'INR': 113.0, 'CAD': 1.71 },
      'INR': { 'USD': 0.012, 'EUR': 0.010, 'GBP': 0.009, 'CAD': 0.015 }
    };

    const rate = mockRates[fromCurrency]?.[toCurrency] || 1;
    const convertedAmount = amount * rate;

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        convertedAmount: convertedAmount,
        fromCurrency,
        toCurrency,
        exchangeRate: rate,
        formattedAmount: formatCurrency(convertedAmount, toCurrency)
      }
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
}

export async function compareCosts(req, res) {
  try {
    const { universityIds, programIds } = req.body;

    if (!universityIds || !Array.isArray(universityIds) || universityIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide university IDs to compare'
      });
    }

    const comparisons = [];

    for (let i = 0; i < universityIds.length; i++) {
      const universityId = universityIds[i];
      const programId = programIds ? programIds[i] : null;

      // Get university info
      const university = await prisma.university.findUnique({
        where: { id: universityId },
        select: {
          id: true,
          universityName: true,
          city: true,
          country: true
        }
      });

      // Get program info if specified
      const program = programId ? await prisma.program.findUnique({
        where: { id: programId },
        select: {
          id: true,
          programName: true,
          degreeType: true
        }
      }) : null;

      // Get tuition breakdown
      const tuitionBreakdown = await prisma.tuitionBreakdown.findFirst({
        where: {
          universityId,
          ...(programId && { programId }),
          isActive: true
        },
        orderBy: { academicYear: 'desc' }
      });

      // Get fee structure
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          universityId,
          ...(programId && { programId }),
          isActive: true
        },
        orderBy: { academicYear: 'desc' }
      });

      // Get available scholarships
      const scholarships = await prisma.scholarship.findMany({
        where: {
          universityId,
          ...(programId && { programId }),
          isActive: true
        },
        select: {
          scholarshipName: true,
          amount: true,
          percentage: true,
          maxAmount: true,
          currency: true
        }
      });

      comparisons.push({
        university,
        program,
        tuitionBreakdown,
        feeStructure,
        scholarships,
        totalCost: tuitionBreakdown?.grandTotal || feeStructure?.grandTotal || 0,
        currency: tuitionBreakdown?.currency || feeStructure?.currency || 'USD'
      });
    }

    res.json({
      success: true,
      data: comparisons,
      comparison: {
        lowestCost: comparisons.reduce((min, curr) => curr.totalCost < min.totalCost ? curr : min),
        highestCost: comparisons.reduce((max, curr) => curr.totalCost > max.totalCost ? curr : max),
        averageCost: comparisons.reduce((sum, curr) => sum + curr.totalCost, 0) / comparisons.length
      }
    });
  } catch (error) {
    console.error('Error comparing costs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare costs',
      error: error.message
    });
  }
}