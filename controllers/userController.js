// ===================================
// FIXED USER CONTROLLER (userController.js)
// ===================================

// Import required modules
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * Generates a JWT token for user authentication
 * @param {string} id - User ID to include in the token payload
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },  // Payload containing user ID
    process.env.JWT_SECRET || 'altuvia782729',  // Secret key from environment or fallback
    { expiresIn: '30d' }  // Token expiration time (originally set to 30 days)
  );
};

/**
 * Sets authentication cookie in the response
 * @param {object} res - Express response object
 * @param {string} token - JWT token to set in cookie
 */
const setAuthCookie = (res, token) => {
  res.cookie('auth_token', token, {
    httpOnly: true,  // Prevent client-side JavaScript access
    secure: process.env.NODE_ENV === 'production',  // Only send over HTTPS in production
    sameSite: 'strict',  // Prevent CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000,  // Cookie expiration (30 days)
  });
};

// ===================================
// PROFILE COMPLETION CONTROLLER
// ===================================
/**
 * Completes user profile by adding preferences, academic info, and payment details
 * - Handles both new profile creation and updates
 * - Creates related subscription and payment records
 * - Returns updated user data with new JWT token
 */
export const completeUserProfile = async (req, res) => {
  try {
    // Log full request data for debugging
    console.log('📝 Full request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Request body keys:', Object.keys(req.body));
    
    // Extract and log request data
    const requestData = req.body;
    console.log('📝 Request data type:', typeof requestData);
    console.log('📝 Request data:', requestData);
    
    // Initialize data containers
    let preferences, academicInfo, paymentInfo;
    
    // Handle different request structures
    if (requestData.preferences) {
      // Structured data format (nested objects)
      preferences = requestData.preferences;
      academicInfo = requestData.academicInfo;
      paymentInfo = requestData.paymentInfo;
    } else {
      // Flat data format (direct properties)
      preferences = {
        countries: requestData.countries,
        courses: requestData.courses,
        studyLevel: requestData.studyLevel
      };
      academicInfo = {
        gpa: requestData.gpa,
        testScores: requestData.testScores,
        workExperience: requestData.workExperience
      };
      paymentInfo = {
        name: requestData.name,
        email: requestData.email,
        cardNumber: requestData.cardNumber,
        subscriptionPlan: requestData.subscriptionPlan,
        paymentStatus: requestData.paymentStatus,
        customerId: requestData.customerId,
        subscriptionId: requestData.subscriptionId,
        trialStartDate: requestData.trialStartDate,
        trialEndDate: requestData.trialEndDate,
        paymentIntentId: requestData.paymentIntentId
      };
    }
    
    // Log extracted data
    console.log('📝 Extracted preferences:', preferences);
    console.log('📝 Extracted academicInfo:', academicInfo);
    console.log('📝 Extracted paymentInfo:', paymentInfo);
    
    // Validate required preferences data
    if (!preferences) {
      console.error('❌ Preferences is undefined or null');
      return res.status(400).json({
        success: false,
        error: 'Preferences data is required',
        debug: {
          receivedKeys: Object.keys(req.body),
          receivedData: req.body
        }
      });
    }
    
    // Get user ID from authentication middleware
    const id = req.userId;
    
    if (!id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Retrieve existing user with related data
    const existingUser = await prisma.user.findUnique({
      where: { id: id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    // Handle missing user
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if profile is already completed
    if (existingUser.profile && existingUser.subscription) {
      console.log('⚠️ User profile already completed:', existingUser.email);
      return res.status(409).json({
        success: false,
        error: 'User profile already completed.',
        userExists: true,
        data: {
          userId: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          hasProfile: !!existingUser.profile,
          hasSubscription: !!existingUser.subscription,
        },
      });
    }

    // Execute database operations in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Prepare profile data with fallbacks
      const profileData = {
        countries: Array.isArray(preferences?.countries) ? preferences.countries : [],
        courses: Array.isArray(preferences?.courses) ? preferences.courses : [],
        studyLevel: preferences?.studyLevel || null,
        gpa: academicInfo?.gpa || null,
        testScores: academicInfo?.testScores || null,
        workExperience: academicInfo?.workExperience || null,
      };

      console.log('📝 Profile data to save:', profileData);

      // Create or update user profile
      const userProfile = await prisma.userProfile.upsert({
        where: { userId: existingUser.id },
        update: {
          ...profileData,
          updatedAt: new Date(),
        },
        create: {
          ...profileData,
          userId: existingUser.id,
        },
      });

      // Prepare subscription data with defaults
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day trial

      const subscriptionData = {
        plan: paymentInfo?.subscriptionPlan || 'pro',
        status: paymentInfo?.paymentStatus || 'trial',
        billingCycle: paymentInfo?.subscriptionPlan || null,
        trialStartDate: paymentInfo?.trialStartDate ? new Date(paymentInfo.trialStartDate) : now,
        trialEndDate: paymentInfo?.trialEndDate ? new Date(paymentInfo.trialEndDate) : trialEndDate,
        currentPeriodStart: paymentInfo?.paymentStatus === 'completed' ? now : null,
        currentPeriodEnd:
          paymentInfo?.paymentStatus === 'completed'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)  // 30-day period
            : null,
        stripeCustomerId: paymentInfo?.customerId || null,
        stripeSubscriptionId: paymentInfo?.subscriptionId || null,
      };

      // Create or update subscription
      const subscription = await prisma.subscription.upsert({
        where: { userId: existingUser.id },
        update: {
          ...subscriptionData,
          updatedAt: new Date(),
        },
        create: {
          ...subscriptionData,
          userId: existingUser.id,
        },
      });

      // Create payment event if payment status exists
      if (paymentInfo?.paymentStatus) {
        await prisma.paymentEvent.create({
          data: {
            userId: existingUser.id,
            eventType:
              paymentInfo.paymentStatus === 'completed'
                ? 'payment_succeeded'
                : 'payment_pending',
            plan: paymentInfo.subscriptionPlan || 'free',
            amount: paymentInfo.subscriptionPlan === 'premium' ? 999 : 0,
            currency: 'USD',
            stripeEventId: paymentInfo.paymentIntentId || null,
          },
        });
      }

      return {
        user: existingUser,
        profile: userProfile,
        subscription: subscription,
      };
    });

    // Generate new authentication token
    const token = generateToken(result.user.id);
    setAuthCookie(res, token);

    // Return success response with complete user data
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token: token,
      data: {
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        image: result.user.image,
        provider: result.user.provider,
        emailVerified: result.user.emailVerified,
        profileId: result.profile.id,
        subscriptionId: result.subscription.id,
        profile: {
          countries: result.profile.countries,
          courses: result.profile.courses,
          studyLevel: result.profile.studyLevel,
          gpa: result.profile.gpa,
          testScores: result.profile.testScores,
          workExperience: result.profile.workExperience,
        },
      },
    });
  } catch (error) {
    // Handle specific Prisma errors
    console.error('❌ Error completing user profile:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Profile already exists',
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Required record not found',
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error while completing profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ===================================
// USER DETAILS FETCH CONTROLLER
// ===================================
/**
 * Fetches complete user details including profile and subscription
 * - Requires authenticated user
 * - Returns user data with profile completion status
 */
export const fetchUserDetails = async (req, res) => {
  try {
    const userId = req.userId;

    // Retrieve user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true
      }
    });

    // Handle user not found
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Return user data
    return res.status(200).json({
      success: true,
      message: 'User data fetched successfully',
      id: user.profile && user.subscription ? user.id : null,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        emailVerified: user.emailVerified,
        profile: user.profile,
        subscription: user.subscription,
        hasCompleteProfile: !!(user.profile && user.subscription)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// ===================================
// AUTHENTICATION CONTROLLERS
// ===================================

/**
 * Handles manual email/password authentication
 * - Validates credentials
 * - Returns user data with authentication token
 */
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });

    // Handle user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check OAuth account conflicts
    if (user.provider && !user.password) {
      return res.status(400).json({
        success: false,
        error: `This account was created with ${user.provider}. Please sign in using ${user.provider}.`
      });
    }

    // Handle missing password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate authentication token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Update user last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    // Determine profile completion status
    const hasCompleteProfile = !!(user.profile && user.subscription);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Sign in successful',
      token: token,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        emailVerified: user.emailVerified,
        hasProfile: !!user.profile,
        hasSubscription: !!user.subscription,
        hasCompleteProfile: hasCompleteProfile
      }
    });

  } catch (error) {
    console.error('❌ Sign in error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during sign in'
    });
  }
};

// ===================================
// REGISTRATION CONTROLLER
// ===================================
/**
 * Handles new user registration
 * - Creates basic user account
 * - Returns authentication token
 */
export const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Handle duplicate user
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],  // Default to email prefix if no name provided
        provider: null,
        emailVerified: false
      }
    });

    // Generate authentication token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: token,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        emailVerified: user.emailVerified,
        hasProfile: false,
        hasSubscription: false,
        hasCompleteProfile: false
      }
    });

  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error during sign up'
    });
  }
};

// ===================================
// OAUTH AUTHENTICATION CONTROLLER
// ===================================
/**
 * Handles OAuth authentication (Google, Facebook, etc.)
 * - Creates or updates user from provider data
 * - Returns authentication token
 */
export const oauthSignIn = async (req, res) => {
  try {
    const { email, name, provider } = req.body;

    // Validate required fields
    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }

    // Find existing user
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });

    // Update existing user or create new
    if (user) {
      // Add OAuth provider to existing account if missing
      if (!user.provider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider,
            name: name || user.name,
            emailVerified: true,
            updatedAt: new Date()
          },
          include: {
            profile: true,
            subscription: true
          }
        });
      }
    } else {
      // Create new OAuth user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],  // Default to email prefix
          provider,
          emailVerified: true
        },
        include: {
          profile: true,
          subscription: true
        }
      });
    }

    // Generate authentication token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Determine profile completion status
    const hasCompleteProfile = !!(user.profile && user.subscription);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'OAuth sign in successful',
      token: token,
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        emailVerified: user.emailVerified,
        hasProfile: !!user.profile,
        hasSubscription: !!user.subscription,
        hasCompleteProfile: hasCompleteProfile
      }
    });

  } catch (error) {
    console.error('❌ OAuth sign in error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during OAuth sign in'
    });
  }
};

// ===================================
// SESSION MANAGEMENT CONTROLLERS
// ===================================

/**
 * Handles user sign-out by clearing authentication cookie
 */
export const signOut = async (req, res) => {
  try {
    // Clear authentication cookie
    res.clearCookie('auth_token');
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    console.error('❌ Sign out error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during sign out'
    });
  }
};

/**
 * Verifies authentication token validity
 * - Returns basic user data if valid
 */
export const verifyAuthToken = async (req, res) => {
  try {
    const userId = req.userId;

    // Retrieve minimal user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        provider: true,
        emailVerified: true
      }
    });

    // Handle user not found
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return user data
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: user
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token verification'
    });
  }
};