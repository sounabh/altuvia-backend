import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'altuvia782729',
    { expiresIn: '7d' }
  );
};

// Set secure cookie
const setAuthCookie = (res, token) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};


export const completeUserProfile = async (req, res) => {
  try {
    console.log('📝 Received user profile data:', JSON.stringify(req.body, null, 2));
  
    const { user, preferences, academicInfo, paymentInfo } = req.body;
    
    const userObj = user?.user || user; // fallback if structure varies
    

    // Validate required fields
    if (!userObj || !userObj.email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userObj.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // For manual registration, validate password
    if (!user.provider && (!userObj.password || userObj.password.length < 6)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long for manual registration'
      });
    }

    // Start a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (prisma) => {
      
      // 1. Prepare user data
      const userData = {
        email: userObj.email,
        name: userObj.name || null,
        image: userObj.image || null,
        provider: user.provider || null,
        emailVerified: user.provider === 'google' ? true : (user.needsEmail || false),
      };

      // Hash password for manual registration
      if (!user.provider && userObj.password) {
        const saltRounds = 12;
        userData.password = await bcrypt.hash(userObj.password, saltRounds);
      }

      // Create or update user
      const createdUser = await prisma.user.upsert({
        where: { email: userObj.email },
        update: {
          ...userData,
          updatedAt: new Date()
        },
        create: {
          ...userData
        }
      });

      // 2. Create or update user profile
      const profileData = {
        countries: Array.isArray(preferences?.countries) ? preferences.countries : [],
        courses: Array.isArray(preferences?.courses) ? preferences.courses : [],
        studyLevel: preferences?.studyLevel || null,
        gpa: academicInfo?.gpa || null,
        testScores: academicInfo?.testScores || null,
        workExperience: academicInfo?.workExperience || null,
      };

      const userProfile = await prisma.userProfile.upsert({
        where: { userId: createdUser.id },
        update: {
          ...profileData,
          updatedAt: new Date()
        },
        create: {
          ...profileData,
          userId: createdUser.id  // Add this line - connect to user
        }
      });

      // 3. Create or update subscription
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
      
      const subscriptionData = {
        plan: paymentInfo?.subscriptionPlan || 'pro',
        status: paymentInfo?.paymentStatus || 'trial',
        billingCycle: paymentInfo?.subscriptionPlan || null,
        trialStartDate: paymentInfo?.trialStartDate ? new Date(paymentInfo.trialStartDate) : now,
        trialEndDate: paymentInfo?.trialEndDate ? new Date(paymentInfo.trialEndDate) : trialEndDate,
        currentPeriodStart: paymentInfo?.paymentStatus === 'completed' ? now : null,
        currentPeriodEnd: paymentInfo?.paymentStatus === 'completed' ? 
          new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) : null, // 30 days for monthly
        stripeCustomerId: paymentInfo?.customerId || null,
        stripeSubscriptionId: paymentInfo?.subscriptionId || null,
      };

      const subscription = await prisma.subscription.upsert({
        where: { userId: createdUser.id },
        update: {
          ...subscriptionData,
          updatedAt: new Date()
        },
        create: {
          ...subscriptionData,
          userId: createdUser.id  // Add this line - connect to user
        }
      });

      // 4. Log payment event (if payment data exists)
      if (paymentInfo && paymentInfo.paymentStatus) {
        const paymentEvent = await prisma.paymentEvent.create({
          data: {
            userId: createdUser.id,
            eventType: paymentInfo.paymentStatus === 'completed' ? 'payment_succeeded' : 'payment_pending',
            plan: paymentInfo.subscriptionPlan || 'free',
            amount: paymentInfo.subscriptionPlan === 'premium' ? 999 : 0, // $9.99 in cents
            currency: 'USD',
            stripeEventId: paymentInfo.paymentIntentId || null,
          }
        });
      }

      return {
        user: createdUser,
        profile: userProfile,
        subscription: subscription
      };
    });

    // Generate JWT token
    const token = generateToken(result.user.id);
    
    // Set secure cookie
    setAuthCookie(res, token);

    // Success response
    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token: token, // Also send token in response for frontend storage if needed
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
          workExperience: result.profile.workExperience
        }
      }
    });

  } catch (error) {
    console.error('❌ Error completing user profile:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Required record not found'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error while completing profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


/*export const completeUserProfile = async (req, res) => {
  try {
    // Log full body without destructuring
    console.log('📝 Full user profile data received:', JSON.stringify(req.body, null, 2));

    // Return the full data as-is
    return res.status(200).json({
      success: true,
      message: 'Data received successfully',
      data: req.body
    });

  } catch (error) {
    console.error('❌ Error receiving user profile data:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error while receiving data',
      error: error.message
    });
  }
};


/*
// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.auth_token || 
                 (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('❌ Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Helper function to logout user
export const logoutUser = (req, res) => {
  res.clearCookie('auth_token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Helper function to refresh token
export const refreshToken = async (req, res) => {
  try {
    const { user } = req; // From verifyToken middleware
    
    const newToken = generateToken(user.id);
    setAuthCookie(res, newToken);
    
    res.status(200).json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
};
*/