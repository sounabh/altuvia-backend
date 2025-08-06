import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to mask sensitive card numbers
const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return null;
  const last4 = cardNumber.slice(-4);
  return `****-****-****-${last4}`;
};

/**
 * Verify authentication token validity
 */
export const verifyAuthToken = async (req, res) => {
  try {
    const userId = req.userId;

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

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

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

/**
 * Generates a JWT token for user authentication
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'altuvia782729',
    { expiresIn: '30d' }
  );
};

/**
 * Sets authentication cookie in the response
 */
const setAuthCookie = (res, token) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

/**
 * Complete user profile with preferences, academic info, and payment details
 */
export const completeUserProfile = async (req, res) => {
  try {
    // Create safe copy for logging
    const logBody = JSON.parse(JSON.stringify(req.body));
    
    // Mask card numbers in both request structures
    if (logBody.paymentInfo?.cardNumber) {
      logBody.paymentInfo.cardNumber = maskCardNumber(logBody.paymentInfo.cardNumber);
    }
    if (logBody.cardNumber) {
      logBody.cardNumber = maskCardNumber(logBody.cardNumber);
    }
    
    console.log('📝 Sanitized request body:', JSON.stringify(logBody, null, 2));
    
    const requestData = req.body;
    let preferences, academicInfo, paymentInfo;
    
    // Handle different request structures
    if (requestData.preferences) {
      preferences = requestData.preferences;
      academicInfo = requestData.academicInfo || {};
      paymentInfo = requestData.paymentInfo || {};
    } else {
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
    
    if (!preferences) {
      console.error('❌ Preferences is undefined or null');
      return res.status(400).json({
        success: false,
        error: 'Preferences data is required',
        debug: {
          receivedKeys: Object.keys(req.body),
          sanitizedData: logBody
        }
      });
    }
    
    const id = req.userId;
    
    if (!id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if profile already completed
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
          hasCompleteProfile: true
        },
      });
    }

    // Execute database operations in transaction
    const result = await prisma.$transaction(async (prisma) => {
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

      // Prepare subscription data
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const subscriptionData = {
        plan: paymentInfo?.subscriptionPlan || 'pro',
        status: paymentInfo?.paymentStatus || 'trial',
        billingCycle: paymentInfo?.subscriptionPlan || null,
        trialStartDate: paymentInfo?.trialStartDate ? new Date(paymentInfo.trialStartDate) : now,
        trialEndDate: paymentInfo?.trialEndDate ? new Date(paymentInfo.trialEndDate) : trialEndDate,
        currentPeriodStart: paymentInfo?.paymentStatus === 'completed' ? now : null,
        currentPeriodEnd:
          paymentInfo?.paymentStatus === 'completed'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
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

      // Create payment event if needed
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

    // Generate new token
    const token = generateToken(result.user.id);
    setAuthCookie(res, token);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token: token,
      data: {
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        hasCompleteProfile: true,
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

    res.status(500).json({
      success: false,
      error: 'Internal server error while completing profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Fetch complete user details including profile and subscription
 */
export const fetchUserDetails = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Determine if profile is complete
    const hasCompleteProfile = !!(user.profile && user.subscription);

    return res.status(200).json({
      success: true,
      message: 'User data fetched successfully',
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        provider: user.provider,
        emailVerified: user.emailVerified,
        profile: user.profile,
        subscription: user.subscription,
        hasCompleteProfile: hasCompleteProfile
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

/**
 * Handle manual email/password authentication
 */
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Find user with related data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check OAuth account conflicts
    if (user.provider && user.provider !== 'credentials' && !user.password) {
      return res.status(400).json({
        success: false,
        error: `This account was created with ${user.provider}. Please sign in using ${user.provider}.`
      });
    }

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

    // Generate token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Update last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    // Determine profile completion status
    const hasCompleteProfile = !!(user.profile && user.subscription);

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

/**
 * Handle new user registration
 */
export const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

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
        name: name || email.split('@')[0],
        provider: 'credentials',
        emailVerified: false
      }
    });

    // Generate token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

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
        hasCompleteProfile: false
      }
    });

  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during sign up'
    });
  }
};

/**
 * Handle OAuth authentication
 */
export const oauthSignIn = async (req, res) => {
  try {
    const { email, name, provider, image } = req.body;

    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider,
          name: name || user.name,
          image: image || user.image,
          emailVerified: true,
          updatedAt: new Date()
        },
        include: {
          profile: true,
          subscription: true
        }
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          provider,
          image,
          emailVerified: true
        },
        include: {
          profile: true,
          subscription: true
        }
      });
    }

    // Generate token
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    // Determine profile completion status
    const hasCompleteProfile = !!(user.profile && user.subscription);

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

/**
 * Handle user sign-out
 */
export const signOut = async (req, res) => {
  try {
    res.clearCookie('auth_token');
    
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