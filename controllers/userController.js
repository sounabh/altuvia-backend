// ==========================================
// FILE: backend/controllers/userController.js
// FIXED - Proper isNewUser logic based on profile completion
// ==========================================
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'altuvia782729';
const JWT_EXPIRY = '30d';

const USER_BASIC_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  provider: true,
  emailVerified: true,
};

const USER_WITH_RELATIONS_SELECT = {
  ...USER_BASIC_SELECT,
  profile: true,
  subscription: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const checkProfileComplete = (user) => {
  return !!(user.profile && user.subscription);
};

/**
 * FIXED: Proper isNewUser logic
 * - isNewUser should be TRUE only when user has NOT completed profile
 * - isNewUser should be FALSE when user has completed profile
 */
const prepareUserResponse = (user, token, context = {}) => {
  const hasCompleteProfile = checkProfileComplete(user);
  
  // FIXED: Determine isNewUser based on profile completion status
  // If user doesn't have complete profile, they are "new" (need to complete setup)
  // If user has complete profile, they are not "new" (already completed setup)
  const isNewUser = !hasCompleteProfile;
  
  console.log("📤 Preparing user response:", {
    email: user.email,
    hasCompleteProfile,
    isNewUser,
    context: context.type || 'unknown',
    hasProfile: !!user.profile,
    hasSubscription: !!user.subscription
  });
  
  return {
    success: true,
    message: context.message || 'Operation successful',
    token: token,
    isNewUser: isNewUser, // FIXED: Based on profile completion
    data: {
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      provider: user.provider,
      emailVerified: user.emailVerified,
      hasCompleteProfile: hasCompleteProfile
    }
  };
};

// ============================================================
// AUTHENTICATION CONTROLLERS
// ============================================================

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...USER_WITH_RELATIONS_SELECT,
        password: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (user.provider && user.provider !== 'credentials' && !user.password) {
      return res.status(400).json({
        success: false,
        error: `This account was created with ${user.provider}. Please sign in using ${user.provider}.`,
        requiresOAuth: true,
        oauthProvider: user.provider
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);
    delete user.password;

    console.log("🔐 User signed in:", {
      email: user.email,
      hasProfile: !!user.profile,
      hasSubscription: !!user.subscription,
      hasCompleteProfile: checkProfileComplete(user),
      isNewUser: !checkProfileComplete(user) // FIXED: Show correct status
    });

    return res.status(200).json(
      prepareUserResponse(user, token, { 
        type: 'signin',
        message: 'Sign in successful' 
      })
    );

  } catch (error) {
    console.error('❌ Sign in error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during sign in'
    });
  }
};

export const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        provider: true,
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: existingUser.provider !== 'credentials' 
          ? `An account with this email already exists via ${existingUser.provider}.`
          : 'An account with this email already exists. Please sign in.',
        userExists: true,
        existingProvider: existingUser.provider
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        provider: 'credentials',
        emailVerified: false
      },
      include: {
        profile: true,
        subscription: true
      }
    });

    const token = generateToken(user.id);

    console.log("🆕 New user created:", {
      email: user.email,
      hasProfile: !!user.profile,
      hasSubscription: !!user.subscription,
      // FIXED: Newly created user should have isNewUser: true (no profile yet)
      isNewUser: !checkProfileComplete(user)
    });

    return res.status(201).json(
      prepareUserResponse(user, token, { 
        type: 'signup',
        message: 'Account created successfully' 
      })
    );

  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
        userExists: true
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error during sign up'
    });
  }
};

export const oauthSignIn = async (req, res) => {
  try {
    const { email, name, provider, image } = req.body;

    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: USER_WITH_RELATIONS_SELECT
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        provider,
        name: name || undefined,
        image: image || undefined,
        emailVerified: true,
        updatedAt: new Date()
      },
      create: {
        email,
        name: name || email.split('@')[0],
        provider,
        image,
        emailVerified: true
      },
      select: USER_WITH_RELATIONS_SELECT
    });

    const token = generateToken(user.id);

    console.log("🔗 OAuth sign in:", {
      email: user.email,
      wasExisting: !!existingUser,
      hasProfile: !!user.profile,
      hasSubscription: !!user.subscription,
      hasCompleteProfile: checkProfileComplete(user),
      // FIXED: isNewUser based on profile completion, not account existence
      isNewUser: !checkProfileComplete(user)
    });

    return res.status(200).json(
      prepareUserResponse(user, token, { 
        type: 'oauth',
        message: 'Sign in successful' 
      })
    );

  } catch (error) {
    console.error('❌ OAuth sign in error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Account creation failed due to duplicate entry'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error during OAuth sign in'
    });
  }
};

// ============================================================
// USER PROFILE CONTROLLERS
// ============================================================

export const verifyAuthToken = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_WITH_RELATIONS_SELECT // FIXED: Include relations to check profile
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // FIXED: Return proper isNewUser status based on profile completion
    const hasCompleteProfile = checkProfileComplete(user);
    
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      isNewUser: !hasCompleteProfile, // FIXED: Based on profile completion
      data: {
        ...user,
        hasCompleteProfile
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during token verification'
    });
  }
};

export const fetchUserDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const includeApplications = req.query.includeApplications === 'true';

    const includeOptions = {
      profile: true,
      subscription: true
    };

    if (includeApplications) {
      includeOptions.applications = {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          university: { select: { universityName: true, slug: true } },
          program: { select: { programName: true, programSlug: true } }
        }
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_WITH_RELATIONS_SELECT,
        applications: includeApplications ? includeOptions.applications : false
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const hasCompleteProfile = checkProfileComplete(user);

    res.setHeader('Cache-Control', 'private, max-age=60');

    return res.status(200).json({
      success: true,
      isNewUser: !hasCompleteProfile, // FIXED: Based on profile completion
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        profile: user.profile,
        subscription: user.subscription,
        applications: user.applications || undefined,
        hasCompleteProfile: hasCompleteProfile
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export const completeUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    console.log("📝 Starting profile completion for user:", userId);

    const {
      preferences = {},
      academicInfo = {},
      paymentInfo = {},
      countries,
      courses,
      studyLevel,
      gpa,
      testScores,
      workExperience
    } = req.body;

    // Prepare data BEFORE transaction
    const finalPreferences = {
      countries: preferences.countries || countries || [],
      courses: preferences.courses || courses || [],
      studyLevel: preferences.studyLevel || studyLevel
    };

    const finalAcademicInfo = {
      gpa: academicInfo.gpa || gpa,
      testScores: academicInfo.testScores || testScores,
      workExperience: academicInfo.workExperience || workExperience
    };

    const finalPaymentInfo = {
      subscriptionPlan: paymentInfo.subscriptionPlan || 'pro',
      paymentStatus: paymentInfo.paymentStatus || 'trial',
      customerId: paymentInfo.customerId,
      subscriptionId: paymentInfo.subscriptionId,
    };

    if (!finalPreferences.countries?.length && !finalPreferences.courses?.length) {
      return res.status(400).json({
        success: false,
        error: 'At least one country or course preference is required'
      });
    }

    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log("⚡ Executing transaction...");

    // Optimized transaction with 15 second timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Check user exists (minimal select)
        const existingUser = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            profile: { select: { id: true } },
            subscription: { select: { id: true } },
          },
        });

        if (!existingUser) {
          throw new Error('USER_NOT_FOUND');
        }

        const isUpdate = !!(existingUser.profile && existingUser.subscription);
        
        console.log(`${isUpdate ? '🔄 Updating' : '🆕 Creating'} profile and subscription`);

        // Step 2: Upsert profile and subscription in parallel
        const [userProfile, subscription] = await Promise.all([
          tx.userProfile.upsert({
            where: { userId: existingUser.id },
            update: {
              countries: finalPreferences.countries,
              courses: finalPreferences.courses,
              studyLevel: finalPreferences.studyLevel,
              gpa: finalAcademicInfo.gpa,
              testScores: finalAcademicInfo.testScores,
              workExperience: finalAcademicInfo.workExperience,
              updatedAt: now
            },
            create: {
              userId: existingUser.id,
              countries: finalPreferences.countries,
              courses: finalPreferences.courses,
              studyLevel: finalPreferences.studyLevel,
              gpa: finalAcademicInfo.gpa,
              testScores: finalAcademicInfo.testScores,
              workExperience: finalAcademicInfo.workExperience,
            },
          }),
          tx.subscription.upsert({
            where: { userId: existingUser.id },
            update: {
              plan: finalPaymentInfo.subscriptionPlan,
              status: finalPaymentInfo.paymentStatus,
              updatedAt: now
            },
            create: {
              userId: existingUser.id,
              plan: finalPaymentInfo.subscriptionPlan,
              status: finalPaymentInfo.paymentStatus,
              billingCycle: finalPaymentInfo.subscriptionPlan,
              trialStartDate: now,
              trialEndDate: trialEndDate,
              stripeCustomerId: finalPaymentInfo.customerId,
              stripeSubscriptionId: finalPaymentInfo.subscriptionId,
            },
          })
        ]);

        console.log("✅ Transaction completed successfully");

        return { user: existingUser, profile: userProfile, subscription, isUpdate };
      },
      {
        maxWait: 10000, // 10 seconds max wait to acquire transaction
        timeout: 15000, // 15 seconds timeout for transaction
      }
    );

    const token = generateToken(result.user.id);

    console.log("🎉 Profile completion successful - user is no longer 'new'");

    // FIXED: After profile completion, isNewUser should be false
    return res.status(200).json({
      success: true,
      message: result.isUpdate 
        ? 'Profile updated successfully' 
        : 'Profile completed successfully',
      token: token,
      isNewUser: false, // FIXED: Always false after profile completion
      data: {
        userId: result.user.id,
        hasCompleteProfile: true, // FIXED: Now true
        profile: {
          countries: result.profile.countries,
          courses: result.profile.courses,
          studyLevel: result.profile.studyLevel,
        },
        subscription: {
          plan: result.subscription.plan,
          status: result.subscription.status,
        }
      },
    });

  } catch (error) {
    console.error('❌ Error completing user profile:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Profile data conflict. Please try again.',
      });
    }

    if (error.code === 'P2028') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout. Please try again.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error while completing profile',
    });
  }
};

export const signOut = async (req, res) => {
  try {
    if (req.userId) {
      console.log(`User ${req.userId} signed out`);
    }

    return res.status(200).json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    console.error('❌ Sign out error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during sign out'
    });
  }
};