import { Router } from 'express';
const router = Router();

// ------------------------------
// Middleware imports
// ------------------------------
import { authenticate, authorize, validate } from '../middleware/authAdminMiddleware.js';
import security from '../middleware/adminSecurity.js';




// ------------------------------
// Controller imports
// ------------------------------
import { register, login, refreshToken, verify2FALogin, logout, logoutAll, changePassword } from '../controllers/adminAuthController.js';
import { get2FAStatus, setup2FA, verify2FA, disable2FA } from '../controllers/2FAController.js';
//import { getProfile, updateProfile, getAllUsers, promoteUser, updateUserStatus, deleteUser } from '../controllers/userController';

// ------------------------------
// Validation Schemas
// ------------------------------
import { registerSchema, loginSchema, changePasswordSchema, verify2FASchema, verify2FALoginSchema, promoteUserSchema }
 from "../utils/validationAdmin.js" 


 const { authLimiter, apiLimiter, twoFALimiter } = security;

// ========================================
// ============= AUTH ROUTES ==============
// ========================================

// ---------- PUBLIC AUTH ROUTES ----------
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  register
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  login
);

router.post('/auth/refresh', refreshToken);


router.post(
  '/2fa/login',
  twoFALimiter,
  validate(verify2FALoginSchema),
  verify2FALogin
);


// ---------- PROTECTED AUTH ROUTES ----------
router.post(
  '/logout',
  authenticate,
  logout
);

router.post(
  '/logout-all',
  authenticate,
  logoutAll
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword
);


// ---------- 2FA ROUTES ----------
router.get(
  '/2fa/status',
  authenticate,
  get2FAStatus
);

router.post(
  '/2fa/setup',
  authenticate,
  setup2FA
);

router.post(
  '/2fa/verify',
  authenticate,
  twoFALimiter,
  validate(verify2FASchema),
  verify2FA
);

router.post(
  '/2fa/disable',
  authenticate,
  twoFALimiter,
  validate(verify2FASchema),
  disable2FA
);


// ========================================
// ============ USER ROUTES ===============
// ========================================

// ---------- USER PROFILE ROUTES ----------
/*router.get(
  '/users/profile',
  authenticate,
  getProfile
);

router.put(
  '/users/profile',
  authenticate,
  updateProfile
);


// ---------- ADMIN USER MANAGEMENT ROUTES ----------
/*router.get(
  '/users',
  authenticate,
  authorize('ADMIN'),
  apiLimiter,
  getAllUsers
);

router.put(
  '/users/promote',
  authenticate,
  authorize('MAIN_ADMIN'),
  validate(promoteUserSchema),
  promoteUser
);

router.put(
  '/users/status',
  authenticate,
  authorize('ADMIN'),
  updateUserStatus
);

router.delete(
  '/users/:userId',
  authenticate,
  authorize('MAIN_ADMIN'),
  deleteUser
);*/


// ========================================
// ========== EXPORT ROUTER ===============
// ========================================
export default router;
