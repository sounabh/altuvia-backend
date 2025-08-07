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
      location: `${university.city}${university.state ? ', ' + university.state : ''}, ${university.country}`,
      images: university.images,
      image: university.images[0]?.imageUrl || '/default-university.jpg',
      ftGlobalRanking: university.ftGlobalRanking,
      rank: university.ftGlobalRanking ? `#${university.ftGlobalRanking}` : 'N/A',
      gmatAverageScore: university.gmatAverageScore,
      gmatAverage: university.gmatAverageScore || 'N/A',
      acceptanceRate: university.acceptanceRate,
      tuitionFees: university.tuitionFees,
      additionalFees: university.additionalFees,
      averageDeadlines: university.averageDeadlines,
      deadline: university.averageDeadlines ? university.averageDeadlines.split(',')[0].trim() : 'TBD',
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
          where: { isPrimary: true },
          take: 1,
        },
        programs: true,
      }
    });

    if (!university) {
      return res.status(404).json({ error: "University not found" });
    }

    // Format university data for client
    const formattedUniversity = {
      id: university.id,
      name: university.universityName,
      slug: university.slug,
      location: `${university.city}${university.state ? ', ' + university.state : ''}, ${university.country}`,
      images: university.images.map(img => img.imageUrl),
      description: university.shortDescription,
      biography: university.overview,
      whyChooseHighlights: university.whyChooseHighlights || [],
      rating: 4.9, // Default rating
      programs: university.programs.map(p => p.programName),
      stats: {
        students: university.studentsPerYear ? `${university.studentsPerYear}+` : "N/A",
        acceptance: university.acceptanceRate ? `${(university.acceptanceRate * 100).toFixed(1)}%` : "N/A",
        avgGmat: university.gmatAverageScore || "N/A"
      },
      additionalData: {
        ftGlobalRanking: university.ftGlobalRanking,
        tuitionFees: university.tuitionFees,
        additionalFees: university.additionalFees,
        averageDeadlines: university.averageDeadlines,
        gmatAverageScore: university.gmatAverageScore,
        acceptanceRate: university.acceptanceRate
      }
    };

    return res.status(200).json(formattedUniversity);
  } catch (error) {
    console.error("Error fetching university:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}