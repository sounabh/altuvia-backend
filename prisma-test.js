



export async function getUniversityBySlug(req, res) {
  try {
    const { slug } = req.params;
    const userId = req.userId; // From authentication middleware (optional)
    
    //console.log('Debug: Request params:', { slug, userId });
    
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
                status: true,
                wordCount: true,
                wordLimit: true,
                priority: true,
                lastModified: true,
                isCompleted: true,
                completionPercentage: true,
                essayPrompt: {
                  select: {
                    id: true,
                    promptTitle: true,
                    isMandatory: true,
                    wordLimit: true
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
        // Get ALL calendar events for this university and user
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

  //  console.log('Debug: University found:', !!university);
    if (university) {
     //// console.log('Debug: University ID:', university.id);
      //console.log('Debug: Programs count:', university.programs?.length || 0);
      //console.log('Debug: Admissions count:', university.admissions?.length || 0);
      //console.log('Debug: Calendar events count:', university.calendarEvents?.length || 0);
    }

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Check if current user has saved this university
    let isAddedByCurrentUser = false;
    if (userId) {
      isAddedByCurrentUser = university.savedByUsers.some(user => user.id === userId);
    }

    // ENHANCED ESSAY AND PROGRESS CALCULATION (same as getSavedUniversities)
    let enhancedStats = null;
    let enhancedProgress = {
      essayProgress: 0,
      taskProgress: 0,
      overallProgress: 0,
      applicationStatus: 'not-started'
    };

    if (userId) {
      // Collect all essays from all programs
      const allEssays = university.programs.flatMap(program => program.essays || []);
      const allEssayPrompts = university.programs.flatMap(program => program.essayPrompts || []);
      
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

      // Calculate essay progress with enhanced completion logic
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
        : university.averageDeadlines 
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD";

      // Prepare essay details with enhanced progress information
      const essayDetails = enhancedEssayCompletion.map(essay => ({
        id: essay.id,
        title: essay.title || essay.essayPrompt?.promptTitle || 'Untitled Essay',
        promptTitle: essay.essayPrompt?.promptTitle,
        status: essay.status,
        priority: essay.priority,
        wordCount: essay.wordCount || 0,
        wordLimit: essay.wordLimit || essay.essayPrompt?.wordLimit || 0,
        progressPercentage: essay.actualCompletionPercentage,
        isMandatory: essay.essayPrompt?.isMandatory || false,
        lastModified: essay.lastModified,
        isComplete: essay.isActuallyCompleted,
        completionReason: essay.completionReason,
        // Show as completed in UI if >= 98%
        displayStatus: essay.isActuallyCompleted ? 'completed' : essay.status
      }));

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
        location: event.location,
        color: event.color,
        timezone: event.timezone,
        isSystemGenerated: event.isSystemGenerated,
        isComplete: event.completionStatus === 'completed',
        isOverdue: new Date(event.startDate) < now && event.completionStatus === 'pending',
        daysUntilDue: Math.ceil((new Date(event.startDate) - now) / (1000 * 60 * 60 * 24))
      }));

      // Set enhanced progress data
      enhancedProgress = {
        essayProgress,
        taskProgress,
        overallProgress,
        applicationStatus,
        nextDeadline,
        upcomingDeadlines: upcomingDeadlines.length,
        overdueEvents: overdueEvents.length
      };

      // Enhanced Stats
      enhancedStats = {
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
        
        // Essay Statistics - ENHANCED
        essays: {
          total: totalEssayPrompts,
          completed: completedEssays, // Enhanced completion count
          inProgress: inProgressEssays,
          draft: draftEssays,
          notStarted: totalEssayPrompts - allEssays.length,
          completionRate: totalEssayPrompts > 0 ? Math.round((completedEssays / totalEssayPrompts) * 100) : 0,
          averageProgress: enhancedEssayCompletion.length > 0 
            ? Math.round(enhancedEssayCompletion.reduce((sum, essay) => {
                return sum + essay.actualCompletionPercentage;
              }, 0) / enhancedEssayCompletion.length)
            : 0,
          essays: essayDetails, // Enhanced essay details
          enhancedCompletionBreakdown: {
            completedByStatus: enhancedEssayCompletion.filter(e => e.completionReason === 'status').length,
            completedByWordCount98: enhancedEssayCompletion.filter(e => e.completionReason === 'word_count_98_percent').length,
            completedByDatabaseFlag: enhancedEssayCompletion.filter(e => e.completionReason === 'database_flag').length
          }
        },
        
        // Overall Application Health - ENHANCED
        applicationHealth: {
          status: applicationStatus,
          overallProgress: overallProgress,
          hasOverdueItems: overdueEvents.length > 0,
          upcomingDeadlinesCount: upcomingDeadlines.length,
          nextImportantDate: nextDeadline,
          isFullyComplete: applicationStatus === 'submitted', // Only true when EVERYTHING is done
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
      };
    }

    // Process essay prompts from programs - get ALL essays with enhanced logic
    const allEssayPrompts = [];
    let primaryEssay = null;

    university.programs.forEach(program => {
      console.log(`Processing program: ${program.programName}, Essay prompts: ${program.essayPrompts?.length || 0}`);
      
      if (program.essayPrompts && program.essayPrompts.length > 0) {
        program.essayPrompts.forEach(prompt => {
          console.log('Processing essay prompt:', {
            id: prompt.id,
            title: prompt.promptTitle,
            programId: program.id,
            programName: program.programName
          });
          
          // Find matching essay from enhanced stats if available
          let essayData = {
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
            submissionDate: null
          };

          // If user is authenticated and we have enhanced stats, get the enhanced essay data
          if (userId && enhancedStats && enhancedStats.essays && enhancedStats.essays.essays) {
            const enhancedEssay = enhancedStats.essays.essays.find(e => 
              e.essayPrompt && e.essayPrompt.id === prompt.id
            );
            
            if (enhancedEssay) {
              essayData = {
                ...essayData,
                status: enhancedEssay.displayStatus || enhancedEssay.status,
                progress: enhancedEssay.progressPercentage || 0,
                wordCount: enhancedEssay.wordCount || 0,
                lastEditedAt: enhancedEssay.lastModified,
                isComplete: enhancedEssay.isComplete,
                completionReason: enhancedEssay.completionReason
              };
            }
          }

          allEssayPrompts.push(essayData);
          
          if (!primaryEssay) {
            primaryEssay = essayData;
          }
        });
      }
    });

    console.log('Debug: Total essay prompts found:', allEssayPrompts.length);
    console.log('Debug: Primary essay:', primaryEssay?.title || 'None');
    console.log('Debug: Enhanced stats available:', !!enhancedStats);

    // Process deadlines from all admissions
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

    // Process calendar events with enhanced transformation
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
          // Enhanced fields
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

    // Combine deadlines and events, sort by date
    const tasksAndEvents = [...deadlines, ...transformedCalendarEvents].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    console.log('Debug: Final tasksAndEvents count:', tasksAndEvents.length);
    console.log('Debug: Deadlines count:', deadlines.length);
    console.log('Debug: Calendar events count:', transformedCalendarEvents.length);

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

      image: university.images[0]?.imageUrl || "/default-university.jpg",
      imageAlt: university.images[0]?.imageAltText || university.universityName,
      isAdded: isAddedByCurrentUser,
      rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : "N/A",
      gmatAverage: university.gmatAverageScore || "N/A",
      deadline: enhancedProgress.nextDeadline || (university.averageDeadlines
        ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
        : "TBD"),

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

      // Stats - Enhanced with progress data
      stats: {
        students: university.studentsPerYear
          ? `${university.studentsPerYear.toLocaleString()}+`
          : "N/A",
        acceptance: university.acceptanceRate
          ? `${(university.acceptanceRate ).toFixed(1)}%`
          : "N/A",
        avgGmat: university.gmatAverageScore || "N/A",
        // Enhanced stats from calculation
        ...(enhancedStats || {})
      },

      // ENHANCED PROGRESS INFORMATION
      status: enhancedProgress.applicationStatus,
      essayProgress: enhancedProgress.essayProgress,
      taskProgress: enhancedProgress.taskProgress,
      overallProgress: enhancedProgress.overallProgress,
      upcomingDeadlines: enhancedProgress.upcomingDeadlines || 0,
      overdueEvents: enhancedProgress.overdueEvents || 0,

      savedByUsers: university.savedByUsers,

      // Relational
      tuitionBreakdowns: university.tuitionBreakdowns,
      scholarships: university.scholarships,
      feeStructures: university.feeStructures,
      financialAids: university.financialAids,

      // Application workspace data - Enhanced
      allEssayPrompts: allEssayPrompts,
      primaryEssay: primaryEssay,
      essayPrompts: primaryEssay ? [primaryEssay] : [],
      tasksAndEvents: tasksAndEvents,
      calendarEvents: transformedCalendarEvents,
      deadlines: deadlines,
      admissions: university.admissions,

      // Enhanced Statistics (only if user is authenticated)
      enhancedStats: userId ? enhancedStats : null,

      // Timestamps
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,

      // Debug information
      _debug: process.env.NODE_ENV === 'development' && userId ? {
        userId: userId,
        isAuthenticated: !!userId,
        enhancedCalculationsApplied: true,
        totalPrograms: university.programs.length,
        totalCalendarEvents: university.calendarEvents?.length || 0,
        enhancedCompletionLogic: enhancedStats ? {
          essaysWithEnhancedCompletion: enhancedStats.essays.essays.map(e => ({
            id: e.id,
            title: e.title,
            wordCount: e.wordCount,
            wordLimit: e.wordLimit,
            percentage: e.progressPercentage,
            isComplete: e.isComplete,
            reason: e.completionReason
          })),
          applicationStatusCalculation: {
            allEssaysCompleted: enhancedStats.essays.total === 0 || enhancedStats.essays.completed === enhancedStats.essays.total,
            allTasksCompleted: enhancedStats.tasks.total === 0 || enhancedStats.tasks.completed === enhancedStats.tasks.total,
            finalStatus: enhancedProgress.applicationStatus
          }
        } : null,
        essayBreakdown: enhancedStats ? {
          completed: enhancedStats.essays.completed,
          inProgress: enhancedStats.essays.inProgress,
          draft: enhancedStats.essays.draft,
          notStarted: enhancedStats.essays.notStarted
        } : null,
        taskBreakdown: enhancedStats ? {
          completed: enhancedStats.tasks.completed,
          pending: enhancedStats.tasks.pending,
          inProgress: enhancedStats.tasks.inProgress,
          overdue: enhancedStats.tasks.overdue
        } : null
      } : undefined
    };

    console.log('Debug: Response summary:', {
      universityId: formattedUniversity.id,
      universityName: formattedUniversity.name,
      allEssayPromptsCount: formattedUniversity.allEssayPrompts.length,
      primaryEssay: formattedUniversity.primaryEssay?.title || 'None',
      tasksAndEventsCount: formattedUniversity.tasksAndEvents.length,
      calendarEventsCount: formattedUniversity.calendarEvents.length,
      deadlinesCount: formattedUniversity.deadlines.length,
      admissionsCount: formattedUniversity.admissions.length,
      enhancedStatsAvailable: !!formattedUniversity.enhancedStats,
      applicationStatus: formattedUniversity.status,
      overallProgress: formattedUniversity.overallProgress
    });

    return res.status(200).json(formattedUniversity);
  } catch (error) {
    console.error("Error fetching university:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
