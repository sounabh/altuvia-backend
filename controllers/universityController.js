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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "User is not authenticated" });
    }

    // **OPTIMIZATION #1: Parallel data fetching for maximum speed**
    const [userProfile, user, activeCV, activeTimeline] = await Promise.all([
      // Fetch user profile
      prisma.userProfile.findUnique({
        where: { userId },
        select: { 
          studyLevel: true,
          gpa: true,
          testScores: true,
          workExperience: true,
          countries: true,
          courses: true
        },
      }),
      
      // Fetch user with optimized university relations
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          savedUniversities: {
            where: { isActive: true },
            select: {
              // Basic university info
              id: true,
              universityName: true,
              slug: true,
              city: true,
              state: true,
              country: true,
              shortDescription: true,
              overview: true,
              whyChooseHighlights: true,
              ftGlobalRanking: true,
              gmatAverageScore: true,
              acceptanceRate: true,
              tuitionFees: true,
              additionalFees: true,
              totalCost: true,
              currency: true,
              averageDeadlines: true,
              intakes: true,
              websiteUrl: true,
              isActive: true,
              isFeatured: true,
              createdAt: true,
              updatedAt: true,
              
              // Primary image only
              images: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  imageUrl: true,
                  imageAltText: true,
                  imageTitle: true
                }
              },
              
              // **OPTIMIZATION #2: Conditionally filter programs**
              programs: {
                where: { isActive: true },
                select: {
                  id: true,
                  programName: true,
                  programSlug: true,
                  degreeType: true,
                  programLength: true,
                  specializations: true,
                  programDescription: true,
                  
                  // User's essays - minimal data
                  essays: {
                    where: { userId },
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
                      essayPromptId: true,
                      essayPrompt: {
                        select: {
                          id: true,
                          promptTitle: true,
                          isMandatory: true,
                          wordLimit: true,
                          minWordCount: true
                        }
                      }
                    }
                  },
                  
                  // Essay prompts
                  essayPrompts: {
                    where: { isActive: true },
                    select: {
                      id: true,
                      promptTitle: true,
                      isMandatory: true,
                      wordLimit: true,
                      minWordCount: true
                    }
                  },
                  
                  // Admission requirements - optimized
                  admissions: {
                    where: { isActive: true },
                    take: 1, // Only first admission record
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
                      
                      // Only future deadlines
                      deadlines: {
                        where: { 
                          isActive: true,
                          deadlineDate: { gte: new Date() }
                        },
                        orderBy: { deadlineDate: 'asc' },
                        take: 3, // Limit to next 3 deadlines
                        select: {
                          id: true,
                          deadlineType: true,
                          deadlineDate: true,
                          title: true,
                          priority: true,
                          isExtended: true
                        }
                      },
                      
                      // Only recent intakes
                      intakes: {
                        where: { isActive: true },
                        orderBy: { intakeYear: 'desc' },
                        take: 2,
                        select: {
                          id: true,
                          intakeName: true,
                          intakeType: true,
                          intakeYear: true,
                          applicationOpenDate: true,
                          applicationCloseDate: true
                        }
                      }
                    }
                  }
                }
              },
              
              // **OPTIMIZATION #3: Only recent and future calendar events**
              calendarEvents: {
                where: {
                  userId,
                  isVisible: true,
                  startDate: { 
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
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
                  completedAt: true,
                  createdAt: true
                },
                orderBy: { startDate: 'asc' },
                take: 50 // Limit calendar events
              }
            }
          }
        }
      }),

      // **FIXED: Fetch ANY CV (removed isActive: true filter)**
      prisma.cV.findFirst({
        where: {
          userId
          // Removed isActive: true - will get any CV now
        },
        orderBy: {
          updatedAt: 'desc' // Get most recently updated CV
        },
        select: {
          id: true,
          title: true,
          slug: true,
          completionPercentage: true,
          atsScore: true,
          lastATSCheckAt: true,
          updatedAt: true,
          
          // Personal info - minimal
          personalInfo: {
            select: {
              fullName: true,
              email: true,
              headline: true,
              summary: true
            }
          },
          
          // Education - top 2 only
          educations: {
            orderBy: { displayOrder: 'asc' },
            take: 2,
            select: {
              institution: true,
              degree: true,
              fieldOfStudy: true,
              gpa: true,
              endDate: true,
              isCurrent: true
            }
          },
          
          // Experience - top 2 only
          experiences: {
            orderBy: { displayOrder: 'asc' },
            take: 2,
            select: {
              company: true,
              position: true,
              endDate: true,
              isCurrent: true
            }
          },
          
          // Skills summary
          skills: {
            take: 3,
            select: {
              categoryName: true,
              skills: true
            }
          },
          
          // Latest AI analysis summary
          aiAnalysis: {
            where: { analysisType: 'overall' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              overallScore: true,
              atsScore: true,
              createdAt: true
            }
          }
        }
      }),

      // **NEW: Fetch AI Timeline summary (not full details)**
      prisma.aITimeline.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          universityId: true,
          programId: true,
          timelineName: true,
          completionStatus: true,
          overallProgress: true,
          totalPhases: true,
          totalTasks: true,
          targetDeadline: true,
          generatedAt: true,
          
          // Completed tasks count only
          tasks: {
            where: { isCompleted: true },
            select: { id: true }
          }
        }
      })
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // **OPTIMIZATION #4: Parse test scores once**
    const userStudyLevel = userProfile?.studyLevel?.toLowerCase();
    const testScores = parseTestScores(userProfile?.testScores);

    // **OPTIMIZATION #5: Create timeline lookup map**
    const timelineMap = new Map();
    activeTimeline?.forEach(timeline => {
      const key = `${timeline.universityId}-${timeline.programId || 'null'}`;
      timelineMap.set(key, {
        id: timeline.id,
        timelineName: timeline.timelineName,
        completionStatus: timeline.completionStatus,
        overallProgress: timeline.overallProgress,
        totalPhases: timeline.totalPhases,
        totalTasks: timeline.totalTasks,
        completedTasks: timeline.tasks?.length || 0,
        targetDeadline: timeline.targetDeadline,
        generatedAt: timeline.generatedAt
      });
    });

    // **OPTIMIZATION #6: Process universities with optimized logic**
    const savedUniversities = user.savedUniversities
      .filter(university => {
        // Filter by study level if specified
        if (!userStudyLevel) return true;
        return university.programs.some(p => 
          p.degreeType?.toLowerCase() === userStudyLevel
        );
      })
      .map((university) => {
        // Filter programs by study level
        const filteredPrograms = userStudyLevel
          ? university.programs.filter(p => 
              p.degreeType?.toLowerCase() === userStudyLevel
            )
          : university.programs;

        // **OPTIMIZATION #7: Use Array.reduce for aggregations**
        const { allEssays, allEssayPrompts, allAdmissions } = filteredPrograms.reduce(
          (acc, program) => {
            acc.allEssays.push(...(program.essays || []));
            acc.allEssayPrompts.push(...(program.essayPrompts || []));
            acc.allAdmissions.push(...(program.admissions || []));
            return acc;
          },
          { allEssays: [], allEssayPrompts: [], allAdmissions: [] }
        );

        const calendarEvents = university.calendarEvents || [];
        
        // **Calculate essay completion**
        const enhancedEssays = allEssays.map(essay => {
          const wordCountPercentage = essay.wordLimit > 0 
            ? (essay.wordCount / essay.wordLimit) * 100 
            : 0;
          
          const isActuallyCompleted = 
            essay.isCompleted || 
            essay.status === 'COMPLETED' || 
            essay.status === 'SUBMITTED' || 
            wordCountPercentage >= 98;
          
          return {
            ...essay,
            isActuallyCompleted,
            actualCompletionPercentage: Math.min(wordCountPercentage, 100)
          };
        });

        // **Calculate stats**
        const totalEssayPrompts = allEssayPrompts.length;
        const completedEssays = enhancedEssays.filter(e => e.isActuallyCompleted).length;
        const inProgressEssays = enhancedEssays.filter(e => 
          !e.isActuallyCompleted && (e.status === 'IN_PROGRESS' || e.wordCount > 0)
        ).length;
        const notStartedEssays = totalEssayPrompts - allEssays.length;
        const essayProgress = totalEssayPrompts > 0 
          ? Math.round((completedEssays / totalEssayPrompts) * 100) 
          : 0;

        const totalTasks = calendarEvents.length;
        const completedTasks = calendarEvents.filter(e => 
          e.completionStatus === 'completed'
        ).length;
        const taskProgress = totalTasks > 0 
          ? Math.round((completedTasks / totalTasks) * 100) 
          : 0;

        // **Determine application status**
        const hasAnyActivity = allEssays.length > 0 || calendarEvents.length > 0;
        const allEssaysCompleted = totalEssayPrompts === 0 || 
          (totalEssayPrompts > 0 && completedEssays === totalEssayPrompts);
        const allTasksCompleted = totalTasks === 0 || 
          (totalTasks > 0 && completedTasks === totalTasks);
        
        let applicationStatus = 'not-started';
        if (hasAnyActivity) {
          if (allEssaysCompleted && allTasksCompleted && (totalEssayPrompts > 0 || totalTasks > 0)) {
            applicationStatus = 'submitted';
          } else {
            applicationStatus = 'in-progress';
          }
        }

        // **Calculate deadlines**
        const now = new Date();
        const upcomingDeadlines = calendarEvents.filter(event => 
          new Date(event.startDate) > now && 
          event.completionStatus !== 'completed'
        );

        // **Get AI Timeline data for this university**
        const timelineKey = `${university.id}-${filteredPrograms[0]?.id || 'null'}`;
        const aiTimelineData = timelineMap.get(timelineKey) || null;

        return {
          id: university.id,
          name: university.universityName,
          slug: university.slug,
          city: university.city,
          state: university.state,
          country: university.country,
          location: `${university.city}${university.state ? ", " + university.state : ""}, ${university.country}`,
          
          image: university.images[0]?.imageUrl || "/default-university.jpg",
          imageAlt: university.images[0]?.imageAltText || university.universityName,
          
          ftGlobalRanking: university.ftGlobalRanking,
          rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : "N/A",
          gmatAverageScore: university.gmatAverageScore,
          acceptanceRate: allAdmissions[0]?.acceptanceRate || university.acceptanceRate,
          
          tuitionFees: university.tuitionFees,
          totalCost: university.totalCost,
          currency: university.currency || "USD",
          
          status: applicationStatus,
          essayProgress,
          taskProgress,
          overallProgress: totalEssayPrompts > 0 && totalTasks > 0 
            ? Math.round((essayProgress * 0.7) + (taskProgress * 0.3))
            : totalEssayPrompts > 0 ? essayProgress : taskProgress,
          
          tasks: completedTasks,
          totalTasks,
          totalEssays: totalEssayPrompts,
          completedEssays,
          inProgressEssays,
          notStartedEssays,
          upcomingDeadlines: upcomingDeadlines.length,
          
          deadline: upcomingDeadlines[0]
            ? new Date(upcomingDeadlines[0].startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : university.averageDeadlines?.split(",")[0]?.trim() || "TBD",

          // **NEW: AI Timeline Summary**
          aiTimeline: aiTimelineData,

          // Test score requirements
          requiresGMAT: allAdmissions.some(a => a.gmatMinScore > 0),
          requiresGRE: allAdmissions.some(a => a.greMinScore > 0),
          requiresIELTS: allAdmissions.some(a => a.ieltsMinScore > 0),
          requiresTOEFL: allAdmissions.some(a => a.toeflMinScore > 0),
          
          userHasGMAT: testScores.hasGMAT,
          userHasGRE: testScores.hasGRE,
          userHasIELTS: testScores.hasIELTS,
          userHasTOEFL: testScores.hasTOEFL,
          userTestScores: testScores,

          stats: {
            tasks: {
              total: totalTasks,
              completed: completedTasks,
              completionRate: taskProgress
            },
            essays: {
              total: totalEssayPrompts,
              completed: completedEssays,
              inProgress: inProgressEssays,
              notStarted: notStartedEssays,
              completionRate: essayProgress
            },
            applicationHealth: {
              status: applicationStatus,
              overallProgress: totalEssayPrompts > 0 && totalTasks > 0 
                ? Math.round((essayProgress * 0.7) + (taskProgress * 0.3))
                : totalEssayPrompts > 0 ? essayProgress : taskProgress,
              essaysFullyComplete: allEssaysCompleted,
              tasksFullyComplete: allTasksCompleted,
              readyForSubmission: allEssaysCompleted && allTasksCompleted
            }
          },

          // Minimal data for rendering
          shortDescription: university.shortDescription,
          overview: university.overview,
          whyChooseHighlights: university.whyChooseHighlights || [],
          averageDeadlines: university.averageDeadlines,
          websiteUrl: university.websiteUrl,
          isAdded: true,
          userStudyLevel
        };
      });

    // **Calculate summary stats**
    const stats = {
      total: savedUniversities.length,
      inProgress: savedUniversities.filter(u => u.status === 'in-progress').length,
      submitted: savedUniversities.filter(u => u.status === 'submitted').length,
      notStarted: savedUniversities.filter(u => u.status === 'not-started').length,
      upcomingDeadlines: savedUniversities.reduce((sum, u) => sum + u.upcomingDeadlines, 0),
      
      totalTasks: savedUniversities.reduce((sum, u) => sum + u.totalTasks, 0),
      completedTasks: savedUniversities.reduce((sum, u) => sum + u.tasks, 0),
      
      totalEssays: savedUniversities.reduce((sum, u) => sum + u.totalEssays, 0),
      completedEssays: savedUniversities.reduce((sum, u) => sum + u.completedEssays, 0),
      inProgressEssays: savedUniversities.reduce((sum, u) => sum + u.inProgressEssays, 0),
      notStartedEssays: savedUniversities.reduce((sum, u) => sum + u.notStartedEssays, 0),
      
      averageProgress: savedUniversities.length > 0
        ? Math.round(savedUniversities.reduce((sum, u) => sum + u.overallProgress, 0) / savedUniversities.length)
        : 0,
      
      fullyCompletedUniversities: savedUniversities.filter(u => u.status === 'submitted').length,
      universitiesReadyForSubmission: savedUniversities.filter(u => 
        u.stats?.applicationHealth?.readyForSubmission
      ).length,
      
      filteredByStudyLevel: userStudyLevel || null
    };

    // **NEW: CV Summary**
    const cvSummary = activeCV ? {
      id: activeCV.id,
      title: activeCV.title,
      slug: activeCV.slug,
      completionPercentage: activeCV.completionPercentage,
      atsScore: activeCV.atsScore,
      lastATSCheckAt: activeCV.lastATSCheckAt,
      updatedAt: activeCV.updatedAt,
      
      personalInfo: activeCV.personalInfo ? {
        fullName: activeCV.personalInfo.fullName,
        email: activeCV.personalInfo.email,
        headline: activeCV.personalInfo.headline,
        summary: activeCV.personalInfo.summary?.substring(0, 150) // Truncate summary
      } : null,
      
      education: activeCV.educations?.map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        gpa: edu.gpa,
        isCurrent: edu.isCurrent
      })) || [],
      
      experience: activeCV.experiences?.map(exp => ({
        company: exp.company,
        position: exp.position,
        isCurrent: exp.isCurrent
      })) || [],
      
      skills: activeCV.skills?.map(skill => ({
        category: skill.categoryName,
        skillCount: skill.skills?.length || 0
      })) || [],
      
      latestAIAnalysis: activeCV.aiAnalysis?.[0] || null
    } : null;

    return res.status(200).json({
      success: true,
      count: savedUniversities.length,
      universities: savedUniversities,
      stats,
      userProfile: {
        studyLevel: userStudyLevel,
        gpa: userProfile?.gpa,
        testScores,
        workExperience: userProfile?.workExperience
      },
      cvSummary, // **NEW**
      timestamp: new Date().toISOString(),
      enhancedFeatures: {
        essayCompletionAt98Percent: true,
        strictSubmissionRequirements: true,
        enhancedProgressTracking: true,
        filteredByStudyLevel: !!userStudyLevel,
        includesAllEssayPrompts: true,
        includesAITimeline: true, // **NEW**
        includesCVSummary: !!cvSummary // **NEW**
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

// **HELPER FUNCTION: Parse test scores**
function parseTestScores(testScoresInput) {
  const defaultScores = {
    hasGMAT: false,
    hasGRE: false,
    hasIELTS: false,
    hasTOEFL: false,
    gmatScore: null,
    greScore: null,
    ieltsScore: null,
    toeflScore: null
  };

  if (!testScoresInput) return defaultScores;

  try {
    let scores = {};
    
    if (typeof testScoresInput === 'string') {
      const testScoresStr = testScoresInput.trim();
      
      if (testScoresStr.startsWith('{') || testScoresStr.startsWith('[')) {
        scores = JSON.parse(testScoresStr);
      } else {
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
    } else if (typeof testScoresInput === 'object') {
      scores = testScoresInput;
    }
    
    return {
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
    return defaultScores;
  }
}

export async function getUniversityBySlug(req, res) {
  try {
    const { slug } = req.params;
    const userId = req.userId;
    
    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    // Fetch user's study level preference if authenticated
    const userStudyLevel = userId 
      ? await fetchUserStudyLevel(userId) 
      : null;

    // Fetch university with all relations
    const university = await fetchUniversityData(slug, userId, userStudyLevel);

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Check if user has saved this university
    const isAddedByCurrentUser = userId 
      ? university.savedByUsers.some(user => user.id === userId) 
      : false;

    // Calculate enhanced stats and progress for authenticated users
    const { enhancedStats, enhancedProgress } = userId
      ? await calculateEnhancedStats(university, userId, userStudyLevel)
      : { enhancedStats: null, enhancedProgress: getDefaultProgress(university) };

    // Process essays and deadlines
    const { allEssayPrompts, primaryEssay } = processEssayPrompts(
      university, 
      enhancedStats, 
      userId
    );

    const { deadlines, transformedCalendarEvents } = processDeadlinesAndEvents(
      university, 
      userId
    );

    const tasksAndEvents = [...deadlines, ...transformedCalendarEvents]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Format and return response
    const formattedUniversity = formatUniversityResponse(
      university,
      isAddedByCurrentUser,
      enhancedProgress,
      enhancedStats,
      allEssayPrompts,
      primaryEssay,
      tasksAndEvents,
      transformedCalendarEvents,
      deadlines,
      userStudyLevel
    );

    return res.status(200).json(formattedUniversity);
  } catch (error) {
    console.error("Error fetching university:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper Functions

async function fetchUserStudyLevel(userId) {
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { studyLevel: true },
  });
  const studyLevel = userProfile?.studyLevel?.toLowerCase();
  console.log("User's Study Level:", studyLevel);
  return studyLevel;
}

async function fetchUniversityData(slug, userId, userStudyLevel) {
  return await prisma.university.findUnique({
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
          essays: userId ? {
            where: { userId },
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
        select: { id: true }
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
          userId,
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
        orderBy: { startDate: 'asc' }
      } : false
    },
  });
}

function getDefaultProgress(university) {
  const defaultDeadline = university.averageDeadlines
    ? university.averageDeadlines.split(",")[0]?.trim() || "TBD"
    : "TBD";

  return {
    essayProgress: 0,
    taskProgress: 0,
    overallProgress: 0,
    applicationStatus: 'not-started',
    nextDeadline: defaultDeadline,
    upcomingDeadlines: 0,
    overdueEvents: 0
  };
}

async function calculateEnhancedStats(university, userId, userStudyLevel) {
  const { allEssaysByPrompt, allEssayPrompts } = collectEssayData(university);
  const calendarEvents = university.calendarEvents || [];
  
  const enhancedEssayCompletion = buildEssayCompletionData(
    allEssayPrompts, 
    allEssaysByPrompt
  );

  const essayStats = calculateEssayStats(enhancedEssayCompletion, allEssayPrompts);
  const taskStats = calculateTaskStats(calendarEvents);
  
  const applicationStatus = determineApplicationStatus(
    essayStats, 
    taskStats, 
    enhancedEssayCompletion, 
    calendarEvents
  );

  const { upcomingDeadlines, overdueEvents, nextDeadlineEvent } = 
    analyzeDeadlines(calendarEvents);

  const overallProgress = calculateOverallProgress(
    essayStats.totalEssayPrompts,
    taskStats.totalTasks,
    essayStats.essayProgress,
    taskStats.taskProgress
  );

  const nextDeadline = formatNextDeadline(
    nextDeadlineEvent, 
    university.averageDeadlines
  );

  const taskDetails = formatTaskDetails(calendarEvents);

  const enhancedStats = {
    tasks: {
      total: taskStats.totalTasks,
      completed: taskStats.completedTasks,
      pending: taskStats.pendingTasks,
      inProgress: taskStats.inProgressTasks,
      overdue: overdueEvents.length,
      upcoming: upcomingDeadlines.length,
      completionRate: taskStats.totalTasks > 0 
        ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) 
        : 0,
      details: taskDetails
    },
    calendarEvents: {
      total: calendarEvents.length,
      completed: taskStats.completedTasks,
      pending: taskStats.pendingTasks,
      inProgress: taskStats.inProgressTasks,
      overdue: overdueEvents.length,
      upcoming: upcomingDeadlines.length,
      completionRate: taskStats.totalTasks > 0 
        ? Math.round((taskStats.completedTasks / taskStats.totalTasks) * 100) 
        : 0,
      events: taskDetails
    },
    essays: {
      total: essayStats.totalEssayPrompts,
      completed: essayStats.completedEssays,
      inProgress: essayStats.inProgressEssays,
      notStarted: essayStats.notStartedEssays,
      completionRate: essayStats.totalEssayPrompts > 0 
        ? Math.round((essayStats.completedEssays / essayStats.totalEssayPrompts) * 100) 
        : 0,
      averageProgress: enhancedEssayCompletion.length > 0 
        ? Math.round(
            enhancedEssayCompletion.reduce((sum, essay) => 
              sum + essay.actualCompletionPercentage, 0
            ) / enhancedEssayCompletion.length
          )
        : 0,
      essays: enhancedEssayCompletion,
      enhancedCompletionBreakdown: {
        completedByStatus: enhancedEssayCompletion.filter(e => 
          e.completionReason === 'status'
        ).length,
        completedByWordCount98: enhancedEssayCompletion.filter(e => 
          e.completionReason === 'word_count_98_percent'
        ).length,
        completedByDatabaseFlag: enhancedEssayCompletion.filter(e => 
          e.completionReason === 'database_flag'
        ).length
      },
      filteredByStudyLevel: userStudyLevel || null
    },
    applicationHealth: {
      status: applicationStatus,
      overallProgress,
      hasOverdueItems: overdueEvents.length > 0,
      upcomingDeadlinesCount: upcomingDeadlines.length,
      nextImportantDate: nextDeadline,
      isFullyComplete: applicationStatus === 'submitted',
      essaysFullyComplete: essayStats.totalEssayPrompts === 0 || 
        essayStats.completedEssays === essayStats.totalEssayPrompts,
      tasksFullyComplete: taskStats.totalTasks === 0 || 
        taskStats.completedTasks === taskStats.totalTasks,
      readyForSubmission: (essayStats.totalEssayPrompts === 0 || 
        essayStats.completedEssays === essayStats.totalEssayPrompts) && 
        (taskStats.totalTasks === 0 || 
        taskStats.completedTasks === taskStats.totalTasks),
      lastActivity: calculateLastActivity(enhancedEssayCompletion, calendarEvents)
    }
  };

  const enhancedProgress = {
    essayProgress: essayStats.essayProgress,
    taskProgress: taskStats.taskProgress,
    overallProgress,
    applicationStatus,
    nextDeadline,
    upcomingDeadlines: upcomingDeadlines.length,
    overdueEvents: overdueEvents.length
  };

  return { enhancedStats, enhancedProgress };
}

function collectEssayData(university) {
  const allEssaysByPrompt = new Map();
  const allEssayPrompts = [];
  
  university.programs.forEach(program => {
    if (program.essayPrompts && program.essayPrompts.length > 0) {
      program.essayPrompts.forEach(prompt => {
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

  return { allEssaysByPrompt, allEssayPrompts };
}

function buildEssayCompletionData(allEssayPrompts, allEssaysByPrompt) {
  return allEssayPrompts.map(prompt => {
    const essayData = allEssaysByPrompt.get(prompt.id);
    
    if (!essayData) {
      return createNotStartedEssay(prompt);
    }
    
    return createEssayWithProgress(essayData, prompt);
  });
}

function createNotStartedEssay(prompt) {
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

function createEssayWithProgress(essayData, prompt) {
  const essay = essayData.essay;
  const wordCountPercentage = essay.wordLimit > 0 
    ? (essay.wordCount / essay.wordLimit) * 100 
    : 0;
  
  const isActuallyCompleted = 
    essay.isCompleted || 
    essay.status === 'COMPLETED' || 
    essay.status === 'SUBMITTED' || 
    wordCountPercentage >= 98;
  
  let actualStatus = essay.status;
  if (isActuallyCompleted && essay.status !== 'COMPLETED' && essay.status !== 'SUBMITTED') {
    actualStatus = 'COMPLETED';
  } else if (essay.wordCount > 0 && essay.wordCount < (essay.wordLimit * 0.98) && essay.status === 'DRAFT') {
    actualStatus = 'IN_PROGRESS';
  }
  
  const completionReason = isActuallyCompleted 
    ? (essay.status === 'COMPLETED' || essay.status === 'SUBMITTED' ? 'status' 
       : wordCountPercentage >= 98 ? 'word_count_98_percent' 
       : 'database_flag') 
    : (essay.wordCount > 0 ? 'in_progress' : 'not_complete');
  
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
    isActuallyCompleted,
    completionReason,
    hasEssay: true,
    lastModified: essay.lastModified,
    completedAt: essay.completedAt,
    priority: essay.priority
  };
}

function calculateEssayStats(enhancedEssayCompletion, allEssayPrompts) {
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

  return {
    totalEssayPrompts,
    completedEssays,
    inProgressEssays,
    notStartedEssays,
    essayProgress
  };
}

function calculateTaskStats(calendarEvents) {
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

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    taskProgress
  };
}

function determineApplicationStatus(essayStats, taskStats, enhancedEssayCompletion, calendarEvents) {
  const hasAnyActivity = enhancedEssayCompletion.some(e => e.hasEssay) || 
    calendarEvents.length > 0;

  if (!hasAnyActivity) {
    return 'not-started';
  }

  const allEssaysCompleted = essayStats.totalEssayPrompts === 0 || 
    (essayStats.totalEssayPrompts > 0 && 
     essayStats.completedEssays === essayStats.totalEssayPrompts);
  
  const allTasksCompleted = taskStats.totalTasks === 0 || 
    (taskStats.totalTasks > 0 && 
     taskStats.completedTasks === taskStats.totalTasks);
  
  if (allEssaysCompleted && allTasksCompleted && 
      (essayStats.totalEssayPrompts > 0 || taskStats.totalTasks > 0)) {
    return 'submitted';
  }
  
  return 'in-progress';
}

function analyzeDeadlines(calendarEvents) {
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

  const nextDeadlineEvent = calendarEvents
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate > now && event.completionStatus !== 'completed';
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

  return { upcomingDeadlines, overdueEvents, nextDeadlineEvent };
}

function calculateOverallProgress(totalEssayPrompts, totalTasks, essayProgress, taskProgress) {
  if (totalEssayPrompts > 0 && totalTasks > 0) {
    return Math.round((essayProgress * 0.7) + (taskProgress * 0.3));
  }
  return totalEssayPrompts > 0 ? essayProgress : taskProgress;
}

function formatNextDeadline(nextDeadlineEvent, averageDeadlines) {
  if (nextDeadlineEvent) {
    return new Date(nextDeadlineEvent.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  if (averageDeadlines) {
    return averageDeadlines.split(",")[0]?.trim() || "TBD";
  }
  
  return "TBD";
}

function formatTaskDetails(calendarEvents) {
  const now = new Date();
  
  return calendarEvents.map(event => ({
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
    isOverdue: new Date(event.startDate) < now && 
               event.completionStatus === 'pending',
    daysUntilDue: Math.ceil(
      (new Date(event.startDate) - now) / (1000 * 60 * 60 * 24)
    )
  }));
}

function calculateLastActivity(enhancedEssayCompletion, calendarEvents) {
  const hasActivity = enhancedEssayCompletion.some(e => e.hasEssay) || 
    calendarEvents.length > 0;
  
  if (!hasActivity) return null;
  
  const essayTimes = enhancedEssayCompletion
    .filter(e => e.hasEssay)
    .map(e => new Date(e.lastModified).getTime());
  
  const eventTimes = calendarEvents
    .map(e => new Date(e.createdAt).getTime());
  
  return Math.max(...essayTimes, ...eventTimes, 0);
}

function processEssayPrompts(university, enhancedStats, userId) {
  const allEssayPrompts = [];
  let primaryEssay = null;

  if (userId && enhancedStats?.essays?.essays) {
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

  return { allEssayPrompts, primaryEssay };
}

function processDeadlinesAndEvents(university, userId) {
  const deadlines = processDeadlines(university);
  const transformedCalendarEvents = userId 
    ? transformCalendarEvents(university.calendarEvents || [], university) 
    : [];

  return { deadlines, transformedCalendarEvents };
}

function processDeadlines(university) {
  const deadlines = [];
  const now = new Date();

  university.admissions.forEach(admission => {
    if (admission.deadlines && admission.deadlines.length > 0) {
      admission.deadlines.forEach(deadline => {
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

  return deadlines;
}

function transformCalendarEvents(calendarEvents, university) {
  const now = new Date();

  return calendarEvents.map(event => {
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
      isOverdue: new Date(event.startDate) < now && 
                 event.completionStatus === 'pending'
    };
  });
}

function formatUniversityResponse(
  university,
  isAddedByCurrentUser,
  enhancedProgress,
  enhancedStats,
  allEssayPrompts,
  primaryEssay,
  tasksAndEvents,
  transformedCalendarEvents,
  deadlines,
  userStudyLevel
) {
  const primaryImage = university.images.find(img => img.isPrimary)?.imageUrl ||
                      university.images[0]?.imageUrl ||
                      "/default-university.jpg";

  return {
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
    primaryImage,
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
        ? `${(university.acceptanceRate).toFixed(1)}%`
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

    allEssayPrompts,
    primaryEssay,
    essayPrompts: primaryEssay ? [primaryEssay] : [],
    tasksAndEvents,
    calendarEvents: transformedCalendarEvents,
    deadlines,
    admissions: university.admissions,

    enhancedStats: enhancedStats,

    userStudyLevel,

    createdAt: university.createdAt,
    updatedAt: university.updatedAt
  };
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