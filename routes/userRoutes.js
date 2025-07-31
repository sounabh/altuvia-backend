import { Router } from 'express';
import { 
  signIn, 
  signUp, 
  oauthSignIn, 
  signOut, 
  verifyAuthToken,
  completeUserProfile,
  fetchUserDetails 
} from '../controllers/userController.js';
import { extractUserIdFromToken } from '../middleware/userMiddleware.js';

const router = Router();

// ===================================
// AUTH ROUTES - User Creation
// ===================================

// POST /api/user/signin - Manual sign in
router.post('/signin', signIn);

// POST /api/user/signup - Manual sign up (creates user only)
router.post('/signup', signUp);

// POST /api/user/oauth-signin - OAuth sign in (creates user if needed)
router.post('/oauth-signin', oauthSignIn);

// POST /api/user/signout - Sign out
router.post('/signout', signOut);

// GET /api/user/verify - Verify token
router.get('/verify', extractUserIdFromToken, verifyAuthToken);

// ===================================
// PROFILE ROUTES - Profile Management
// ===================================

// POST /api/user/complete-profile - Complete user profile (requires auth)
// This endpoint only handles profile/subscription creation
// User must already exist and be authenticated
router.post('/complete-profile', extractUserIdFromToken, completeUserProfile);

// GET /api/user/me - Get current user details (requires auth)
router.get('/me', extractUserIdFromToken, fetchUserDetails);

export default router;