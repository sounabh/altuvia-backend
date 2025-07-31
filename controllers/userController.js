// ===================================
// FIXED USER CONTROLLER (userController.js)
// ===================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'altuvia782729',
    { expiresIn: '10m' } // Extended to 30 days for better UX
  );
};

// Set secure cookie
const setAuthCookie = (res, token) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// ===================================
// SIMPLIFIED COMPLETE PROFILE - No user creation here
// ===================================
export const completeUserProfile = async (req, res) => {
  try {
    console.log('📝 Full request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Request body keys:', Object.keys(req.body));
    
    // More defensive destructuring with logging
    const requestData = req.body;
    console.log('📝 Request data type:', typeof requestData);
    console.log('📝 Request data:', requestData);
    
    // Try different ways to access the data
    let preferences, academicInfo, paymentInfo;
    
    if (requestData.preferences) {
      preferences = requestData.preferences;
      academicInfo = requestData.academicInfo;
      paymentInfo = requestData.paymentInfo;
    } else {
      // Maybe the data is directly in req.body
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
    
    console.log('📝 Extracted preferences:', preferences);
    console.log('📝 Extracted academicInfo:', academicInfo);
    console.log('📝 Extracted paymentInfo:', paymentInfo);
    
    // Validate that we have preferences
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
    
    // Get userId from middleware (token)
    const id = req.userId;
    
    if (!id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Find the existing user
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
          hasProfile: !!existingUser.profile,
          hasSubscription: !!existingUser.subscription,
        },
      });
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Create/Update user profile with safer data access
      const profileData = {
        countries: Array.isArray(preferences?.countries) ? preferences.countries : [],
        courses: Array.isArray(preferences?.courses) ? preferences.courses : [],
        studyLevel: preferences?.studyLevel || null,
        gpa: academicInfo?.gpa || null,
        testScores: academicInfo?.testScores || null,
        workExperience: academicInfo?.workExperience || null,
      };

      console.log('📝 Profile data to save:', profileData);

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

      // Create/Update subscription
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

    // Generate fresh token
    const token = generateToken(result.user.id);
    setAuthCookie(res, token);

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
// Fetch user details - unchanged
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
// SIMPLIFIED AUTH CONTROLLER
// ===================================

// Manual Sign In - unchanged
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

    if (user.provider && !user.password) {
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

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

// SIMPLIFIED Sign Up - Just creates user, no profile completion
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

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        provider: null,
        emailVerified: false
      }
    });

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
        hasProfile: false,
        hasSubscription: false,
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

// OAuth Sign In - simplified, just creates user if needed
export const oauthSignIn = async (req, res) => {
  try {
    const { email, name, provider, oauthId } = req.body;

    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (user) {
      // Update existing user with OAuth info if needed
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
          name: name || email.split('@')[0],
          provider,
          emailVerified: true
        },
        include: {
          profile: true,
          subscription: true
        }
      });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

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

// Sign Out - unchanged
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

// Verify Token - unchanged
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