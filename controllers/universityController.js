import prisma from "../lib/prisma.js";


export async function toggleAdded(req, res) {
  try {
    const userId = req.userId;
    const { universityId } = req.body;

    console.log("University ID:", universityId);
    console.log("User ID:", userId);

    if (!userId) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    if (!universityId) {
      return res.status(400).json({ error: "University ID is required" });
    }

    // 🚀 SUPER FAST: Single query to check current state
    const userWithSavedUniversity = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        savedUniversities: {
          where: { id: universityId },
          select: { id: true }
        }
      }
    });

    if (!userWithSavedUniversity) {
      return res.status(404).json({ error: "User not found" });
    }

    const isAlreadySaved = userWithSavedUniversity.savedUniversities.length > 0;

    // 🚀 Direct update without transaction - much faster
    let result;

    if (isAlreadySaved) {
      // Remove the university from saved list
      await prisma.user.update({
        where: { id: userId },
        data: {
          savedUniversities: {
            disconnect: { id: universityId },
          },
        },
      });

      result = { 
        isAdded: false, 
        action: 'removed', 
        message: 'University removed from saved list' 
      };
    } else {
      // Add the university to saved list
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            savedUniversities: {
              connect: { id: universityId },
            },
          },
        });

        result = { 
          isAdded: true, 
          action: 'added', 
          message: 'University added to saved list' 
        };
      } catch (connectError) {
        // Handle case where university doesn't exist
        if (connectError.code === 'P2025') {
          return res.status(404).json({ error: "University not found" });
        }
        throw connectError;
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error toggling university save status:", error);

    // Handle Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Record not found" });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "Constraint violation" });
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: "University not found" });
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

    // **FETCH USER'S STUDY LEVEL PREFERENCE AND FULL PROFILE DATA**
    let userStudyLevel = null;
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { 
        studyLevel: true,
        gpa: true,
        testScores: true,
        workExperience: true,
        countries: true,
        courses: true
      },
    });
    userStudyLevel = userProfile?.studyLevel?.toLowerCase();
    console.log("User's Study Level:", userStudyLevel);

 // Parse test scores from user profile
let testScores = {
  hasGMAT: false,
  hasGRE: false,
  hasIELTS: false,
  hasTOEFL: false,
  gmatScore: null,
  greScore: null,
  ieltsScore: null,
  toeflScore: null
};

if (userProfile?.testScores) {
  try {
    let scores = {};
    
    if (typeof userProfile.testScores === 'string') {
      const testScoresStr = userProfile.testScores.trim();
      
      // Check if it looks like JSON (starts with { or [)
      if (testScoresStr.startsWith('{') || testScoresStr.startsWith('[')) {
        try {
          scores = JSON.parse(testScoresStr);
        } catch (jsonError) {
          console.error("Invalid JSON format for test scores:", jsonError);
        }
      } else {
        // Handle plain string format like "GMAT:789" or "GMAT:789,GRE:320,IELTS:7.5"
        const parts = testScoresStr.split(',');
        parts.forEach(part => {
          const [key, value] = part.split(':').map(s => s.trim());
          if (key && value) {
            const normalizedKey = key.toLowerCase();
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              scores[normalizedKey] = numValue;
            }
          }
        });
      }
    } else if (typeof userProfile.testScores === 'object' && userProfile.testScores !== null) {
      // Already an object
      scores = userProfile.testScores;
    }
    
    // Map to standardized format
    testScores = {
      hasGMAT: !!scores.gmat && scores.gmat > 0,
      hasGRE: !!scores.gre && scores.gre > 0,
      hasIELTS: !!scores.ielts && scores.ielts > 0,
      hasTOEFL: !!scores.toefl && scores.toefl > 0,
      gmatScore: scores.gmat || null,
      greScore: scores.gre || null,
      ieltsScore: scores.ielts || null,
      toeflScore: scores.toefl || null
    };
  } catch (e) {
    console.error("Error parsing test scores:", e);
    console.error("Test scores value:", userProfile.testScores);
    // testScores remains with default null values
  }
}

    // Fetch user with saved universities and all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        savedUniversities: {
          where: { isActive: true },
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
            programs: {
              // **Filter programs by user's study level**
              where: {
                isActive: true,
                ...(userStudyLevel && {
                  degreeType: {
                    equals: userStudyLevel,
                    mode: "insensitive",
                  },
                }),
              },
              include: {
                // Get essays for this user and program
                essays: {
                  where: { userId: userId },
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    status: true,
                    wordCount: true,
                    wordLimit: true,
                    priority: true,
                    lastModified: true,
                    isCompleted: true,
                    completionPercentage: true,
                    createdAt: true,
                    essayPromptId: true, // ✅ ADDED: Include essayPromptId for matching
                    essayPrompt: {
                      select: {
                        id: true,
                        promptTitle: true,
                        promptText: true,
                        isMandatory: true,
                        wordLimit: true,
                        minWordCount: true
                      }
                    }
                  }
                },
                // Get essay prompts for the program
                essayPrompts: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    promptTitle: true,
                    promptText: true,
                    isMandatory: true,
                    wordLimit: true,
                    minWordCount: true
                  }
                },
                // **Get admission requirements**
                admissions: {
                  where: { isActive: true },
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
                    deadlines: {
                      where: { isActive: true },
                      orderBy: { deadlineDate: 'asc' },
                      select: {
                        id: true,
                        deadlineType: true,
                        deadlineDate: true,
                        deadlineTime: true,
                        timezone: true,
                        title: true,
                        description: true,
                        priority: true,
                        isExtended: true
                      }
                    },
                    intakes: {
                      where: { isActive: true },
                      orderBy: { intakeYear: 'desc' },
                      select: {
                        id: true,
                        intakeName: true,
                        intakeType: true,
                        intakeYear: true,
                        intakeMonth: true,
                        startDate: true,
                        endDate: true,
                        applicationOpenDate: true,
                        applicationCloseDate: true,
                        totalSeats: true,
                        availableSeats: true
                      }
                    }
                  }
                }
              }
            },
            // Get ALL calendar events for this university and user
            calendarEvents: {
              where: {
                userId: userId,
                isVisible: true
              },
              select: {
                id: true,
                title: true,
                description: true,
                eventType: true,
                eventStatus: true,
                completionStatus: true,
                startDate: true,
                endDate: true,
                priority: true,
                isAllDay: true,
                completedAt: true,
                completionNotes: true,
                createdAt: true
              },
              orderBy: {
                startDate: 'asc'
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Process saved universities with enhanced completion logic
    const savedUniversities = user?.savedUniversities?.map((university) => {
      // Collect all essays from all programs (now filtered by study level)
      const allEssays = university.programs.flatMap(program => program.essays || []);
      const allEssayPrompts = university.programs.flatMap(program => program.essayPrompts || []);
      const allAdmissions = university.programs.flatMap(program => program.admissions || []);
      const allDeadlines = allAdmissions.flatMap(adm => adm.deadlines || []);
      
      // Calendar events for this university - THESE ARE THE TASKS!
      const calendarEvents = university.calendarEvents || [];
      
      // ENHANCED ESSAY COMPLETION LOGIC: 
      // Check both database status AND calculate completion based on word count
      const enhancedEssayCompletion = allEssays.map(essay => {
        const wordCountPercentage = essay.wordLimit > 0 
          ? (essay.wordCount / essay.wordLimit) * 100 
          : 0;
        
        // Essay is considered completed if:
        // 1. Database shows it's completed, OR
        // 2. Word count is >= 98% of word limit, OR  
        // 3. Status is 'SUBMITTED'
        const isActuallyCompleted = 
          essay.isCompleted || 
          essay.status === 'COMPLETED' || 
          essay.status === 'SUBMITTED' || 
          wordCountPercentage >= 98;
        
        return {
          ...essay,
          actualCompletionPercentage: Math.min(wordCountPercentage, 100),
          isActuallyCompleted: isActuallyCompleted,
          completionReason: isActuallyCompleted 
            ? (essay.status === 'COMPLETED' || essay.status === 'SUBMITTED' ? 'status' 
               : wordCountPercentage >= 98 ? 'word_count_98_percent' 
               : 'database_flag') 
            : 'not_complete'
        };
      });

      // ✅ FIXED: Calculate essay progress using allEssayPrompts as the total
      const totalEssayPrompts = allEssayPrompts.length;
      const completedEssays = enhancedEssayCompletion.filter(essay => 
        essay.isActuallyCompleted
      ).length;
      const inProgressEssays = enhancedEssayCompletion.filter(essay => 
        !essay.isActuallyCompleted && (essay.status === 'IN_PROGRESS' || essay.wordCount > 0)
      ).length;
      const draftEssays = enhancedEssayCompletion.filter(essay => 
        !essay.isActuallyCompleted && essay.status === 'DRAFT' && essay.wordCount === 0
      ).length;
      // ✅ FIXED: Calculate not started essays (prompts without any user essay)
      const notStartedEssays = totalEssayPrompts - allEssays.length;
      
      const essayProgress = totalEssayPrompts > 0 
        ? Math.round((completedEssays / totalEssayPrompts) * 100) 
        : 0;

      // Calculate task progress from calendar events
      const totalTasks = calendarEvents.length; 
      const completedTasks = calendarEvents.filter(event => 
        event.completionStatus === 'completed'
      ).length;
      const pendingTasks = calendarEvents.filter(event => 
        event.completionStatus === 'pending'
      ).length;
      const inProgressTasks = calendarEvents.filter(event => 
        event.completionStatus === 'in_progress'
      ).length;
      
      const taskProgress = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      // ENHANCED APPLICATION STATUS LOGIC:
      // Status should only be 'submitted' when BOTH conditions are met:
      // 1. ALL essays are completed (using enhanced completion logic)
      // 2. ALL calendar events/tasks are completed
      let applicationStatus = 'not-started';
      let hasAnyActivity = false;

      // Check if user has started any activity
      if (allEssays.length > 0 || calendarEvents.length > 0) {
        hasAnyActivity = true;
        
        // Check if EVERYTHING is completed (strict requirement)
        const allEssaysCompleted = totalEssayPrompts === 0 || 
          (totalEssayPrompts > 0 && completedEssays === totalEssayPrompts);
        const allTasksCompleted = totalTasks === 0 || 
          (totalTasks > 0 && completedTasks === totalTasks);
        
        // Only mark as submitted if BOTH essays and tasks are 100% complete
        if (allEssaysCompleted && allTasksCompleted && (totalEssayPrompts > 0 || totalTasks > 0)) {
          applicationStatus = 'submitted';
        } else if (hasAnyActivity) {
          applicationStatus = 'in-progress';
        }
      }

      // Count upcoming deadlines with more detail
      const now = new Date();
      const upcomingDeadlines = calendarEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate > now && 
               (event.eventType === 'deadline' || event.priority === 'high') &&
               event.completionStatus !== 'completed';
      });

      // Count overdue events
      const overdueEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate < now && 
               event.completionStatus === 'pending' &&
               event.eventStatus === 'active';
      });

      // Calculate overall progress (weighted average of essays and tasks)
      const overallProgress = totalEssayPrompts > 0 && totalTasks > 0 
        ? Math.round((essayProgress * 0.7) + (taskProgress * 0.3)) // Essays weighted more
        : totalEssayPrompts > 0 
        ? essayProgress 
        : taskProgress;

      // **Combine all deadlines (from admissions + calendar events) - PRIORITIZE USER EVENTS FIRST**
      const userCalendarDeadlines = calendarEvents
        .filter(e => e.eventType === 'deadline' && new Date(e.startDate) > now)
        .map(e => ({
          id: e.id,
          type: e.eventType,
          date: e.startDate,
          title: e.title,
          description: e.description,
          priority: e.priority,
          source: 'user_calendar'
        }));

      const dbDeadlines = allDeadlines
        .filter(d => new Date(d.deadlineDate) > now)
        .map(d => ({
          id: d.id,
          type: d.deadlineType,
          date: d.deadlineDate,
          title: d.title,
          description: d.description,
          priority: d.priority,
          source: 'database'
        }));

      const allDeadlinesCombined = [...userCalendarDeadlines, ...dbDeadlines]
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Determine next deadline
      const nextDeadlineEvent = calendarEvents
        .filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate > now && event.completionStatus !== 'completed';
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

      const nextDeadline = nextDeadlineEvent 
        ? new Date(nextDeadlineEvent.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : allDeadlinesCombined[0]
        ? new Date(allDeadlinesCombined[0].date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : university.averageDeadlines 
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD";

      // ✅ FIXED: Prepare essay details with ALL essay prompts (including not started)
      const essayDetails = allEssayPrompts.map(prompt => {
        const matchingEssay = enhancedEssayCompletion.find(
          essay => essay.essayPromptId === prompt.id || essay.essayPrompt?.id === prompt.id
        );
        
        if (matchingEssay) {
          return {
            id: matchingEssay.id,
            promptId: prompt.id,
            title: matchingEssay.title || prompt.promptTitle || 'Untitled Essay',
            promptTitle: prompt.promptTitle,
            promptText: prompt.promptText,
            status: matchingEssay.status,
            priority: matchingEssay.priority,
            wordCount: matchingEssay.wordCount || 0,
            wordLimit: matchingEssay.wordLimit || prompt.wordLimit || 0,
            progressPercentage: matchingEssay.actualCompletionPercentage,
            isMandatory: prompt.isMandatory || false,
            lastModified: matchingEssay.lastModified,
            isComplete: matchingEssay.isActuallyCompleted,
            completionReason: matchingEssay.completionReason,
            displayStatus: matchingEssay.isActuallyCompleted ? 'completed' : matchingEssay.status,
            hasUserEssay: true
          };
        } else {
          // No user essay for this prompt - NOT STARTED
          return {
            id: null,
            promptId: prompt.id,
            title: prompt.promptTitle || 'Untitled Essay',
            promptTitle: prompt.promptTitle,
            promptText: prompt.promptText,
            status: 'NOT_STARTED',
            priority: prompt.isMandatory ? 'high' : 'medium',
            wordCount: 0,
            wordLimit: prompt.wordLimit || 0,
            progressPercentage: 0,
            isMandatory: prompt.isMandatory || false,
            lastModified: null,
            isComplete: false,
            completionReason: 'not_started',
            displayStatus: 'not_started',
            hasUserEssay: false
          };
        }
      });

      // Prepare calendar events with status information
      const taskDetails = calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        eventStatus: event.eventStatus,
        completionStatus: event.completionStatus,
        priority: event.priority,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        completedAt: event.completedAt,
        completionNotes: event.completionNotes,
        isComplete: event.completionStatus === 'completed',
        isOverdue: new Date(event.startDate) < now && event.completionStatus === 'pending',
        daysUntilDue: Math.ceil((new Date(event.startDate) - now) / (1000 * 60 * 60 * 24))
      }));

      // **Test score requirements vs user scores**
      const requiresGMAT = allAdmissions.some(a => a.gmatMinScore > 0);
      const requiresGRE = allAdmissions.some(a => a.greMinScore > 0);
      const requiresIELTS = allAdmissions.some(a => a.ieltsMinScore > 0);
      const requiresTOEFL = allAdmissions.some(a => a.toeflMinScore > 0);

      // ✅ FIXED: Get acceptance rate from admissions or university level
      const acceptanceRate = allAdmissions[0]?.acceptanceRate || university.acceptanceRate || null;

      return {
        id: university.id,
        // Basic Information
        name: university.universityName,
        universityName: university.universityName,
        slug: university.slug,
        city: university.city,
        state: university.state,
        country: university.country,
        location: `${university.city}${
          university.state ? ", " + university.state : ""
        }, ${university.country}`,
        
        // Images
        images: university.images,
        image: university.images[0]?.imageUrl || "/default-university.jpg",
        imageAlt: university.images[0]?.imageAltText || university.universityName,
        
        // Rankings and scores
        ftGlobalRanking: university.ftGlobalRanking,
        rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : "N/A",
        gmatAverageScore: university.gmatAverageScore,
        gmatAverage: university.gmatAverageScore || "N/A",
        acceptanceRate: acceptanceRate, // ✅ FIXED: Use the calculated acceptance rate
        
        // Financial information
        tuitionFees: university.tuitionFees,
        additionalFees: university.additionalFees,
        totalCost: university.totalCost,
        currency: university.currency || "USD",
        
        // Progress and status information - ENHANCED
        status: applicationStatus,
        essayProgress: essayProgress,
        taskProgress: taskProgress,
        overallProgress: overallProgress,
        
        // Task and deadline information
        tasks: completedTasks,        
        totalTasks: totalTasks,       
        deadline: nextDeadline,
        upcomingDeadlines: upcomingDeadlines.length,
        overdueEvents: overdueEvents.length,
        
        // ✅ FIXED: Essay information with proper counts
        totalEssays: totalEssayPrompts,
        completedEssays: completedEssays,
        inProgressEssays: inProgressEssays,
        notStartedEssays: notStartedEssays,
        
        // Calendar Events
        calendarEvents: calendarEvents,
        
        // **Programs data for AI timeline**
        programs: university.programs.map(p => ({
          id: p.id,
          programName: p.programName,
          programSlug: p.programSlug,
          degreeType: p.degreeType,
          programLength: p.programLength,
          specializations: p.specializations,
          programDescription: p.programDescription,
          admissions: p.admissions,
          essays: p.essays,
          essayPrompts: p.essayPrompts
        })),
        
        // **Deadlines from admissions + calendar (USER EVENTS PRIORITIZED)**
        deadlines: allDeadlinesCombined.slice(0, 5),
        
        // **Admission requirements**
        admissionRequirements: allAdmissions[0] || null,
        
        // **Test score requirements vs user scores**
        requiresGMAT: requiresGMAT,
        requiresGRE: requiresGRE,
        requiresIELTS: requiresIELTS,
        requiresTOEFL: requiresTOEFL,
        
        userHasGMAT: testScores.hasGMAT,
        userHasGRE: testScores.hasGRE,
        userHasIELTS: testScores.hasIELTS,
        userHasTOEFL: testScores.hasTOEFL,
        
        // ✅ ADDED: Include user's actual test scores for timeline
        userTestScores: testScores,
        
        // Enhanced Stats
        stats: {
          // Tasks Statistics
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            overdue: overdueEvents.length,
            upcoming: upcomingDeadlines.length,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            details: taskDetails
          },
          
          // Calendar Events Statistics
          calendarEvents: {
            total: calendarEvents.length,
            completed: completedTasks,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            overdue: overdueEvents.length,
            upcoming: upcomingDeadlines.length,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            events: taskDetails
          },
          
          // ✅ FIXED: Essay Statistics with proper counts
          essays: {
            total: totalEssayPrompts,
            completed: completedEssays,
            inProgress: inProgressEssays,
            draft: draftEssays,
            notStarted: notStartedEssays,
            completionRate: totalEssayPrompts > 0 ? Math.round((completedEssays / totalEssayPrompts) * 100) : 0,
            averageProgress: essayDetails.length > 0 
              ? Math.round(essayDetails.reduce((sum, essay) => {
                  return sum + essay.progressPercentage;
                }, 0) / essayDetails.length)
              : 0,
            essays: essayDetails, // ✅ Now includes ALL essay prompts
            enhancedCompletionBreakdown: {
              completedByStatus: enhancedEssayCompletion.filter(e => e.completionReason === 'status').length,
              completedByWordCount98: enhancedEssayCompletion.filter(e => e.completionReason === 'word_count_98_percent').length,
              completedByDatabaseFlag: enhancedEssayCompletion.filter(e => e.completionReason === 'database_flag').length,
              notStarted: notStartedEssays
            },
            filteredByStudyLevel: userStudyLevel || null
          },
          
          // Overall Application Health - ENHANCED
          applicationHealth: {
            status: applicationStatus,
            overallProgress: overallProgress,
            hasOverdueItems: overdueEvents.length > 0,
            upcomingDeadlinesCount: upcomingDeadlines.length,
            nextImportantDate: nextDeadline,
            isFullyComplete: applicationStatus === 'submitted',
            essaysFullyComplete: totalEssayPrompts === 0 || completedEssays === totalEssayPrompts,
            tasksFullyComplete: totalTasks === 0 || completedTasks === totalTasks,
            readyForSubmission: (totalEssayPrompts === 0 || completedEssays === totalEssayPrompts) && 
                               (totalTasks === 0 || completedTasks === totalTasks),
            lastActivity: allEssays.length > 0 || calendarEvents.length > 0 
              ? Math.max(
                  ...allEssays.map(e => new Date(e.lastModified).getTime()),
                  ...calendarEvents.map(e => new Date(e.createdAt).getTime()),
                  0
                )
              : null
          }
        },
        
        // Additional metadata
        shortDescription: university.shortDescription,
        overview: university.overview,
        whyChooseHighlights: university.whyChooseHighlights || [],
        averageDeadlines: university.averageDeadlines,
        intakes: university.intakes,
        websiteUrl: university.websiteUrl,
        isActive: university.isActive,
        isFeatured: university.isFeatured,
        createdAt: university.createdAt,
        updatedAt: university.updatedAt,
        isAdded: true,
        
        // **Include user's study level in response**
        userStudyLevel: userStudyLevel,
        
        // Debug information
        _debug: process.env.NODE_ENV === 'development' ? {
          totalPrograms: university.programs.length,
          totalCalendarEvents: calendarEvents.length,
          userStudyLevel: userStudyLevel,
          totalEssayPrompts: totalEssayPrompts,
          userEssaysCount: allEssays.length,
          enhancedCompletionLogic: {
            essaysWithEnhancedCompletion: enhancedEssayCompletion.map(e => ({
              id: e.id,
              title: e.title,
              wordCount: e.wordCount,
              wordLimit: e.wordLimit,
              percentage: e.actualCompletionPercentage,
              isComplete: e.isActuallyCompleted,
              reason: e.completionReason
            })),
            applicationStatusCalculation: {
              allEssaysCompleted: totalEssayPrompts === 0 || completedEssays === totalEssayPrompts,
              allTasksCompleted: totalTasks === 0 || completedTasks === totalTasks,
              finalStatus: applicationStatus
            }
          },
          essayBreakdown: {
            completed: completedEssays,
            inProgress: inProgressEssays,
            draft: draftEssays,
            notStarted: notStartedEssays
          },
          taskBreakdown: {
            completed: completedTasks,
            pending: pendingTasks,
            inProgress: inProgressTasks,
            overdue: overdueEvents.length
          }
        } : undefined
      };
    });

    // Calculate enhanced summary statistics
    const stats = {
      total: savedUniversities.length,
      inProgress: savedUniversities.filter(u => u.status === 'in-progress').length,
      submitted: savedUniversities.filter(u => u.status === 'submitted').length,
      notStarted: savedUniversities.filter(u => u.status === 'not-started').length,
      upcomingDeadlines: savedUniversities.reduce((sum, u) => sum + u.upcomingDeadlines, 0),
      overdueEvents: savedUniversities.reduce((sum, u) => sum + u.overdueEvents, 0),
      
      // Aggregated task statistics
      totalTasks: savedUniversities.reduce((sum, u) => sum + u.totalTasks, 0),
      completedTasks: savedUniversities.reduce((sum, u) => sum + u.tasks, 0),
      
      // ✅ FIXED: Aggregated essay statistics
      totalEssays: savedUniversities.reduce((sum, u) => sum + u.totalEssays, 0),
      completedEssays: savedUniversities.reduce((sum, u) => sum + u.completedEssays, 0),
      inProgressEssays: savedUniversities.reduce((sum, u) => sum + u.inProgressEssays, 0),
      notStartedEssays: savedUniversities.reduce((sum, u) => sum + u.notStartedEssays, 0),
      
      // Average progress across all universities
      averageProgress: savedUniversities.length > 0
        ? Math.round(savedUniversities.reduce((sum, u) => sum + u.overallProgress, 0) / savedUniversities.length)
        : 0,
      
      // Universities requiring attention
      universitiesNeedingAttention: savedUniversities.filter(u => u.overdueEvents > 0).length,
      
      // Enhanced completion tracking
      fullyCompletedUniversities: savedUniversities.filter(u => u.status === 'submitted').length,
      universitiesReadyForSubmission: savedUniversities.filter(u => 
        u.stats?.applicationHealth?.readyForSubmission
      ).length,
      
      filteredByStudyLevel: userStudyLevel || null
    };

    return res.status(200).json({
      success: true,
      count: savedUniversities.length,
      universities: savedUniversities,
      stats: stats,
      userProfile: {
        studyLevel: userStudyLevel,
        gpa: userProfile?.gpa,
        testScores: testScores,
        workExperience: userProfile?.workExperience
      },
      timestamp: new Date().toISOString(),
      userStudyLevel: userStudyLevel,
      enhancedFeatures: {
        essayCompletionAt98Percent: true,
        strictSubmissionRequirements: true,
        enhancedProgressTracking: true,
        filteredByStudyLevel: !!userStudyLevel,
        includesAllEssayPrompts: true // ✅ NEW: Flag indicating all prompts are included
      }
    });
    
  } catch (error) {
    console.error("Error fetching saved universities:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


export async function getUniversityBySlug(req, res) {
  try {
    const { slug } = req.params;
    const userId = req.userId; // From authentication middleware (optional)
    
    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    // **NEW: Fetch user's study level preference if user is authenticated**
    let userStudyLevel = null;
    if (userId) {
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: userId },
        select: { studyLevel: true },
      });
      userStudyLevel = userProfile?.studyLevel?.toLowerCase();
      console.log("User's Study Level:", userStudyLevel);
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
          where: { 
            isActive: true,
            // **NEW: Filter programs by user's study level if available**
            ...(userStudyLevel && {
              degreeType: {
                equals: userStudyLevel,
                mode: "insensitive",
              },
            }),
          },
          orderBy: { programName: "asc" },
          include: {
            essayPrompts: {
              where: { isActive: true },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                promptTitle: true,
                promptText: true,
                wordLimit: true,
                minWordCount: true,
                isMandatory: true,
                isActive: true,
                programId: true
              }
            },
            // Get essays for this user and program (if user is authenticated)
            essays: userId ? {
              where: { userId: userId },
              select: {
                id: true,
                title: true,
                content: true,
                status: true,
                wordCount: true,
                wordLimit: true,
                priority: true,
                lastModified: true,
                isCompleted: true,
                completedAt: true,
                completionPercentage: true,
                essayPromptId: true,
                essayPrompt: {
                  select: {
                    id: true,
                    promptTitle: true,
                    promptText: true,
                    isMandatory: true,
                    wordLimit: true,
                    minWordCount: true
                  }
                }
              }
            } : false
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
        savedByUsers: {
          select: {
            id: true
          }
        },
        admissions: {
          where: { isActive: true },
          include: {
            deadlines: {
              where: { isActive: true },
              orderBy: { deadlineDate: "asc" },
              select: {
                id: true,
                deadlineType: true,
                deadlineDate: true,
                deadlineTime: true,
                timezone: true,
                title: true,
                description: true,
                priority: true,
                isExtended: true,
                originalDeadline: true,
                isActive: true,
                admissionId: true
              }
            },
            intakes: {
              where: { isActive: true },
              orderBy: { intakeYear: "desc" },
              select: {
                id: true,
                intakeName: true,
                intakeType: true,
                intakeYear: true,
                intakeMonth: true,
                startDate: true,
                endDate: true,
                applicationOpenDate: true,
                applicationCloseDate: true,
                intakeStatus: true,
                isActive: true,
                admissionId: true
              }
            }
          }
        },
        calendarEvents: userId ? {
          where: {
            userId: userId,
            isVisible: true
          },
          select: {
            id: true,
            title: true,
            description: true,
            eventType: true,
            eventStatus: true,
            completionStatus: true,
            startDate: true,
            endDate: true,
            priority: true,
            isAllDay: true,
            completedAt: true,
            completionNotes: true,
            createdAt: true,
            location: true,
            color: true,
            timezone: true,
            isSystemGenerated: true
          },
          orderBy: {
            startDate: 'asc'
          }
        } : false
      },
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Check if current user has saved this university
    let isAddedByCurrentUser = false;
    if (userId) {
      isAddedByCurrentUser = university.savedByUsers.some(user => user.id === userId);
    }

    // ENHANCED ESSAY AND PROGRESS CALCULATION
    let enhancedStats = null;
    let enhancedProgress = {
      essayProgress: 0,
      taskProgress: 0,
      overallProgress: 0,
      applicationStatus: 'not-started'
    };

    if (userId) {
      // Collect all essays from all programs with their prompts (now filtered by study level)
      const allEssaysByPrompt = new Map(); // Map to track essays by prompt ID
      const allEssayPrompts = [];
      
      university.programs.forEach(program => {
        if (program.essayPrompts && program.essayPrompts.length > 0) {
          program.essayPrompts.forEach(prompt => {
            // Find matching essay for this prompt
            const matchingEssay = program.essays?.find(essay => 
              essay.essayPromptId === prompt.id
            );
            
            if (matchingEssay) {
              allEssaysByPrompt.set(prompt.id, {
                essay: matchingEssay,
                prompt: prompt,
                programId: program.id,
                programName: program.programName
              });
            }
            
            allEssayPrompts.push({
              ...prompt,
              programId: program.id,
              programName: program.programName
            });
          });
        }
      });
      
      // Calendar events for this university
      const calendarEvents = university.calendarEvents || [];
      
      // ENHANCED ESSAY COMPLETION LOGIC WITH INDIVIDUAL TRACKING
      const enhancedEssayCompletion = allEssayPrompts.map(prompt => {
        const essayData = allEssaysByPrompt.get(prompt.id);
        
        if (!essayData) {
          // No essay started for this prompt
          return {
            promptId: prompt.id,
            promptTitle: prompt.promptTitle,
            promptText: prompt.promptText,
            wordLimit: prompt.wordLimit,
            minWordCount: prompt.minWordCount,
            isMandatory: prompt.isMandatory,
            programId: prompt.programId,
            programName: prompt.programName,
            status: 'not-started',
            wordCount: 0,
            actualCompletionPercentage: 0,
            isActuallyCompleted: false,
            completionReason: 'not_started',
            hasEssay: false,
            essayId: null,
            content: '',
            lastModified: null
          };
        }
        
        const essay = essayData.essay;
        const wordCountPercentage = essay.wordLimit > 0 
          ? (essay.wordCount / essay.wordLimit) * 100 
          : 0;
        
        // Essay is considered completed if:
        // 1. Database shows it's completed, OR
        // 2. Word count is >= 98% of word limit, OR  
        // 3. Status is 'SUBMITTED' or 'COMPLETED'
        const isActuallyCompleted = 
          essay.isCompleted || 
          essay.status === 'COMPLETED' || 
          essay.status === 'SUBMITTED' || 
          wordCountPercentage >= 98;
        
        // Determine actual status
        let actualStatus = essay.status;
        if (isActuallyCompleted && essay.status !== 'COMPLETED' && essay.status !== 'SUBMITTED') {
          actualStatus = 'COMPLETED';
        } else if (essay.wordCount > 0 && essay.wordCount < (essay.wordLimit * 0.98) && essay.status === 'DRAFT') {
          actualStatus = 'IN_PROGRESS';
        }
        
        return {
          promptId: prompt.id,
          promptTitle: prompt.promptTitle,
          promptText: prompt.promptText,
          wordLimit: prompt.wordLimit,
          minWordCount: prompt.minWordCount,
          isMandatory: prompt.isMandatory,
          programId: prompt.programId,
          programName: prompt.programName,
          essayId: essay.id,
          title: essay.title,
          content: essay.content,
          status: actualStatus,
          wordCount: essay.wordCount,
          actualCompletionPercentage: Math.min(wordCountPercentage, 100),
          isActuallyCompleted: isActuallyCompleted,
          completionReason: isActuallyCompleted 
            ? (essay.status === 'COMPLETED' || essay.status === 'SUBMITTED' ? 'status' 
               : wordCountPercentage >= 98 ? 'word_count_98_percent' 
               : 'database_flag') 
            : (essay.wordCount > 0 ? 'in_progress' : 'not_complete'),
          hasEssay: true,
          lastModified: essay.lastModified,
          completedAt: essay.completedAt,
          priority: essay.priority
        };
      });

      // Calculate essay progress with enhanced completion logic (now filtered by study level)
      const totalEssayPrompts = allEssayPrompts.length;
      const completedEssays = enhancedEssayCompletion.filter(essay => 
        essay.isActuallyCompleted
      ).length;
      const inProgressEssays = enhancedEssayCompletion.filter(essay => 
        !essay.isActuallyCompleted && essay.completionReason === 'in_progress'
      ).length;
      const notStartedEssays = enhancedEssayCompletion.filter(essay => 
        essay.completionReason === 'not_started'
      ).length;
      
      const essayProgress = totalEssayPrompts > 0 
        ? Math.round((completedEssays / totalEssayPrompts) * 100) 
        : 0;

      // Calculate task progress from calendar events
      const totalTasks = calendarEvents.length; 
      const completedTasks = calendarEvents.filter(event => 
        event.completionStatus === 'completed'
      ).length;
      const pendingTasks = calendarEvents.filter(event => 
        event.completionStatus === 'pending'
      ).length;
      const inProgressTasks = calendarEvents.filter(event => 
        event.completionStatus === 'in_progress'
      ).length;
      
      const taskProgress = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      // APPLICATION STATUS LOGIC
      let applicationStatus = 'not-started';
      let hasAnyActivity = enhancedEssayCompletion.some(e => e.hasEssay) || calendarEvents.length > 0;

      if (hasAnyActivity) {
        const allEssaysCompleted = totalEssayPrompts === 0 || 
          (totalEssayPrompts > 0 && completedEssays === totalEssayPrompts);
        const allTasksCompleted = totalTasks === 0 || 
          (totalTasks > 0 && completedTasks === totalTasks);
        
        if (allEssaysCompleted && allTasksCompleted && (totalEssayPrompts > 0 || totalTasks > 0)) {
          applicationStatus = 'submitted';
        } else if (hasAnyActivity) {
          applicationStatus = 'in-progress';
        }
      }

      // Count upcoming deadlines
      const now = new Date();
      const upcomingDeadlines = calendarEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate > now && 
               (event.eventType === 'deadline' || event.priority === 'high') &&
               event.completionStatus !== 'completed';
      });

      const overdueEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate < now && 
               event.completionStatus === 'pending' &&
               event.eventStatus === 'active';
      });

      const overallProgress = totalEssayPrompts > 0 && totalTasks > 0 
        ? Math.round((essayProgress * 0.7) + (taskProgress * 0.3))
        : totalEssayPrompts > 0 
        ? essayProgress 
        : taskProgress;

      const nextDeadlineEvent = calendarEvents
        .filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate > now && event.completionStatus !== 'completed';
        })
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

      const nextDeadline = nextDeadlineEvent 
        ? new Date(nextDeadlineEvent.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : university.averageDeadlines 
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD";

      // Prepare task details
      const taskDetails = calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        eventStatus: event.eventStatus,
        completionStatus: event.completionStatus,
        priority: event.priority,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        completedAt: event.completedAt,
        completionNotes: event.completionNotes,
        location: event.location,
        color: event.color,
        timezone: event.timezone,
        isSystemGenerated: event.isSystemGenerated,
        isComplete: event.completionStatus === 'completed',
        isOverdue: new Date(event.startDate) < now && event.completionStatus === 'pending',
        daysUntilDue: Math.ceil((new Date(event.startDate) - now) / (1000 * 60 * 60 * 24))
      }));

      enhancedProgress = {
        essayProgress,
        taskProgress,
        overallProgress,
        applicationStatus,
        nextDeadline,
        upcomingDeadlines: upcomingDeadlines.length,
        overdueEvents: overdueEvents.length
      };

      enhancedStats = {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          overdue: overdueEvents.length,
          upcoming: upcomingDeadlines.length,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          details: taskDetails
        },
        
        calendarEvents: {
          total: calendarEvents.length,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          overdue: overdueEvents.length,
          upcoming: upcomingDeadlines.length,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          events: taskDetails
        },
        
        essays: {
          total: totalEssayPrompts,
          completed: completedEssays,
          inProgress: inProgressEssays,
          notStarted: notStartedEssays,
          completionRate: totalEssayPrompts > 0 ? Math.round((completedEssays / totalEssayPrompts) * 100) : 0,
          averageProgress: enhancedEssayCompletion.length > 0 
            ? Math.round(enhancedEssayCompletion.reduce((sum, essay) => {
                return sum + essay.actualCompletionPercentage;
              }, 0) / enhancedEssayCompletion.length)
            : 0,
          essays: enhancedEssayCompletion,
          enhancedCompletionBreakdown: {
            completedByStatus: enhancedEssayCompletion.filter(e => e.completionReason === 'status').length,
            completedByWordCount98: enhancedEssayCompletion.filter(e => e.completionReason === 'word_count_98_percent').length,
            completedByDatabaseFlag: enhancedEssayCompletion.filter(e => e.completionReason === 'database_flag').length
          },
          // **NEW: Include study level filter info**
          filteredByStudyLevel: userStudyLevel || null
        },
        
        applicationHealth: {
          status: applicationStatus,
          overallProgress: overallProgress,
          hasOverdueItems: overdueEvents.length > 0,
          upcomingDeadlinesCount: upcomingDeadlines.length,
          nextImportantDate: nextDeadline,
          isFullyComplete: applicationStatus === 'submitted',
          essaysFullyComplete: totalEssayPrompts === 0 || completedEssays === totalEssayPrompts,
          tasksFullyComplete: totalTasks === 0 || completedTasks === totalTasks,
          readyForSubmission: (totalEssayPrompts === 0 || completedEssays === totalEssayPrompts) && 
                             (totalTasks === 0 || completedTasks === totalTasks),
          lastActivity: enhancedEssayCompletion.some(e => e.hasEssay) || calendarEvents.length > 0 
            ? Math.max(
                ...enhancedEssayCompletion.filter(e => e.hasEssay).map(e => new Date(e.lastModified).getTime()),
                ...calendarEvents.map(e => new Date(e.createdAt).getTime()),
                0
              )
            : null
        }
      };
    }

    // Process essay prompts - USE ENHANCED DATA (now filtered by study level)
    const allEssayPrompts = [];
    let primaryEssay = null;

    if (userId && enhancedStats && enhancedStats.essays && enhancedStats.essays.essays) {
      // Use enhanced essay data with individual progress
      enhancedStats.essays.essays.forEach((essayData, index) => {
        const formattedEssay = {
          id: essayData.promptId,
          essayId: essayData.essayId,
          title: essayData.promptTitle,
          text: essayData.promptText,
          wordLimit: essayData.wordLimit,
          minWordCount: essayData.minWordCount,
          isMandatory: essayData.isMandatory,
          programId: essayData.programId,
          programName: essayData.programName,
          status: essayData.status,
          progress: essayData.actualCompletionPercentage,
          wordCount: essayData.wordCount,
          content: essayData.content || "",
          lastEditedAt: essayData.lastModified,
          hasEssay: essayData.hasEssay,
          isComplete: essayData.isActuallyCompleted,
          completionReason: essayData.completionReason,
          completedAt: essayData.completedAt
        };
        
        allEssayPrompts.push(formattedEssay);
        
        if (index === 0 && !primaryEssay) {
          primaryEssay = formattedEssay;
        }
      });
    } else {
      // Fallback for non-authenticated users (programs already filtered by study level in query)
      university.programs.forEach(program => {
        if (program.essayPrompts && program.essayPrompts.length > 0) {
          program.essayPrompts.forEach(prompt => {
            const essayData = {
              id: prompt.id,
              title: prompt.promptTitle,
              text: prompt.promptText,
              wordLimit: prompt.wordLimit,
              minWordCount: prompt.minWordCount,
              isMandatory: prompt.isMandatory,
              programId: program.id,
              programName: program.programName,
              status: "not-started",
              progress: 0,
              wordCount: 0,
              content: "",
              lastEditedAt: null,
              hasEssay: false
            };

            allEssayPrompts.push(essayData);
            
            if (!primaryEssay) {
              primaryEssay = essayData;
            }
          });
        }
      });
    }

    // Process deadlines and calendar events (keep existing logic)
    const deadlines = [];
    university.admissions.forEach(admission => {
      if (admission.deadlines && admission.deadlines.length > 0) {
        admission.deadlines.forEach(deadline => {
          const now = new Date();
          const deadlineDate = new Date(deadline.deadlineDate);
          const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
          
          deadlines.push({
            id: deadline.id,
            type: "deadline",
            task: deadline.title,
            description: deadline.description,
            date: deadline.deadlineDate,
            time: deadline.deadlineTime,
            timezone: deadline.timezone,
            status: daysLeft < 0 ? "overdue" : daysLeft === 0 ? "due-today" : "upcoming",
            priority: deadline.priority,
            daysLeft: Math.max(0, daysLeft),
            deadlineType: deadline.deadlineType,
            isExtended: deadline.isExtended,
            originalDeadline: deadline.originalDeadline
          });
        });
      }
    });

    let transformedCalendarEvents = [];
    if (userId && university.calendarEvents) {
      transformedCalendarEvents = university.calendarEvents.map(event => {
        const now = new Date();
        const eventDate = new Date(event.startDate);
        const daysLeft = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        
        return {
          id: event.id,
          type: "event",
          task: event.title,
          description: event.description,
          date: event.startDate,
          endDate: event.endDate,
          time: event.isAllDay ? "All Day" : new Date(event.startDate).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          location: event.location || "TBD",
          status: event.completionStatus === "completed" ? "completed" : 
                 event.completionStatus === "missed" ? "missed" :
                 daysLeft < 0 ? "past" : 
                 daysLeft === 0 ? "today" : "upcoming",
          priority: event.priority,
          daysLeft: Math.max(0, daysLeft),
          eventType: event.eventType,
          completionStatus: event.completionStatus,
          completedAt: event.completedAt,
          color: event.color,
          isAllDay: event.isAllDay,
          timezone: event.timezone,
          isSystemGenerated: event.isSystemGenerated,
          school: university.universityName || 'General',
          universityId: university.id,
          universitySlug: university.slug,
          country: university.country,
          city: university.city,
          createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
          isComplete: event.completionStatus === 'completed',
          isOverdue: new Date(event.startDate) < now && event.completionStatus === 'pending'
        };
      });
    }

    const tasksAndEvents = [...deadlines, ...transformedCalendarEvents].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

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

      image: university.images[0]?.imageUrl || "/default-university.jpg",
      imageAlt: university.images[0]?.imageAltText || university.universityName,
      isAdded: isAddedByCurrentUser,
      rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : "N/A",
      gmatAverage: university.gmatAverageScore || "N/A",
      deadline: enhancedProgress.nextDeadline || (university.averageDeadlines
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD"),

      description: university.shortDescription,
      shortDescription: university.shortDescription,
      overview: university.overview,
      biography: university.overview,
      history: university.history,

      missionStatement: university.missionStatement,
      visionStatement: university.visionStatement,

      whyChooseHighlights: university.whyChooseHighlights || [],

      rating: 4.9,
      websiteUrl: university.websiteUrl,
      brochureUrl: university.brochureUrl,

      // **Programs now filtered by study level**
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

      ftGlobalRanking: university.ftGlobalRanking,
      ftRegionalRanking: university.ftRegionalRanking,
      usNewsRanking: university.usNewsRanking,
      qsRanking: university.qsRanking,
      timesRanking: university.timesRanking,

      acceptanceRate: university.acceptanceRate,
      gmatAverageScore: university.gmatAverageScore,
      gmatScoreMin: university.gmatScoreMin,
      gmatScoreMax: university.gmatScoreMax,
      minimumGpa: university.minimumGpa,
      languageTestRequirements: university.languageTestRequirements,

      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      totalCost: university.totalCost,
      currency: university.currency || "USD",
      scholarshipInfo: university.scholarshipInfo,
      financialAidDetails: university.financialAidDetails,

      averageDeadlines: university.averageDeadlines,
      studentsPerYear: university.studentsPerYear,
      averageProgramLengthMonths: university.averageProgramLengthMonths,
      intakes: university.intakes,

      admissionsOfficeContact: university.admissionsOfficeContact,
      internationalOfficeContact: university.internationalOfficeContact,
      generalInquiriesContact: university.generalInquiriesContact,

      careerOutcomes: university.careerOutcomes,

      additionalDocumentUrls: university.additionalDocumentUrls || [],

      isActive: university.isActive,
      isFeatured: university.isFeatured,

      stats: {
        students: university.studentsPerYear
          ? `${university.studentsPerYear.toLocaleString()}+`
          : "N/A",
        acceptance: university.acceptanceRate
          ? `${(university.acceptanceRate ).toFixed(1)}%`
          : "N/A",
        avgGmat: university.gmatAverageScore || "N/A",
        ...(enhancedStats || {})
      },

      status: enhancedProgress.applicationStatus,
      essayProgress: enhancedProgress.essayProgress,
      taskProgress: enhancedProgress.taskProgress,
      overallProgress: enhancedProgress.overallProgress,
      upcomingDeadlines: enhancedProgress.upcomingDeadlines || 0,
      overdueEvents: enhancedProgress.overdueEvents || 0,

      savedByUsers: university.savedByUsers,

      tuitionBreakdowns: university.tuitionBreakdowns,
      scholarships: university.scholarships,
      feeStructures: university.feeStructures,
      financialAids: university.financialAids,

      // **Essay prompts now filtered by study level**
      allEssayPrompts: allEssayPrompts,
      primaryEssay: primaryEssay,
      essayPrompts: primaryEssay ? [primaryEssay] : [],
      tasksAndEvents: tasksAndEvents,
      calendarEvents: transformedCalendarEvents,
      deadlines: deadlines,
      admissions: university.admissions,

      enhancedStats: userId ? enhancedStats : null,

      // **NEW: Include user's study level in response**
      userStudyLevel: userStudyLevel,

      createdAt: university.createdAt,
      updatedAt: university.updatedAt
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

    // Get all departments first
    const departments = await prisma.department.findMany({
      where: { 
        universityId: university.id
      },
      orderBy: { name: 'asc' }
    });

    // Get active programs with their departments in a single query
    const activePrograms = await prisma.program.findMany({
      where: {
        universityId: university.id,
        isActive: true
      },
      select: {
        id: true,
        programName: true,
        programSlug: true,
        degreeType: true,
        programDescription: true,
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Group programs by department
    const programsByDepartment = {};
    activePrograms.forEach(program => {
      program.departments.forEach(pd => {
        const deptId = pd.department.id;
        if (!programsByDepartment[deptId]) {
          programsByDepartment[deptId] = [];
        }
        programsByDepartment[deptId].push({
          id: program.id,
          name: program.programName,
          slug: program.programSlug,
          degreeType: program.degreeType,
          description: program.programDescription
        });
      });
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
        programCount: programsByDepartment[dept.id]?.length || 0,
        programs: programsByDepartment[dept.id] || []
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

    // ✅ Fixed: Filter by department through the junction table
    if (department) {
      programsWhere.departments = {
        some: {
          departmentId: department
        }
      };
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
          departments: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              }
            }
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
      },
      orderBy: { name: "asc" },
    });

    // Get program counts for each department
    const departmentCounts = await Promise.all(
      departments.map(async (dept) => {
        const count = await prisma.program.count({
          where: {
            universityId: university.id,
            isActive: true,
            departments: {
              some: {
                departmentId: dept.id
              }
            }
          }
        });
        return { ...dept, programCount: count };
      })
    );

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
      departments: departmentCounts,
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
        departments: prog.departments.map(pd => pd.department), // Extract department info from junction
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
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
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
        essayPrompts: { // ✅ Fixed: Changed from EssayPrompt to essayPrompts
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
      departments: program.departments.map(pd => pd.department), // ✅ Fixed: Extract departments from junction table
      syllabus: program.syllabus,
      rankings: program.rankings,
      externalLinks: program.externalLinks,
      scholarships: program.scholarships,
      tuitionBreakdowns: program.tuitionBreakdowns,
      feeStructures: program.feeStructures,
      financialAids: program.financialAids,
      essayPrompts: program.essayPrompts, // ✅ Fixed: Changed from EssayPrompt
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