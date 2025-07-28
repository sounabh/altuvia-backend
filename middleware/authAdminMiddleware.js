// ============= MIDDLEWARE =============
// File: middleware/auth.js
// Purpose: Authentication, Authorization, and Validation middleware functions

import  {verifyAccessToken}  from '../utils/adminAuth.js'       // Function to verify JWT access token
import { PrismaClient } from '@prisma/client'           // Prisma ORM for DB access
const prisma = new PrismaClient();                            // Instantiate Prisma client


// ========== Authentication Middleware ==========
// Checks if the request has a valid JWT access token.
// If valid, attaches the user object to `req.user` for use in routes.
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token is present in Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Extract token (skip 'Bearer ')
    const decoded = verifyAccessToken(token); // Decode and verify token

    // Fetch user info from DB based on token payload
    const user = await prisma.admin_User.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastLogin: true,
        is2FAEnabled: true
      }
    });

    // If user not found or invalid token
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user account is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Attach user to request object for downstream use
    req.user = user;
    next();

  } catch (error) {
    // Handle token expiration and other JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};


// ========== Authorization Middleware ==========
// Checks if the authenticated user's role matches one of the allowed roles.
// Accepts roles in descending order of permission.
export const authorize = (...allowedRoles) => {
  const roleHierarchy = {
   
    UNIVERSITY_MODERATOR:2,
    CONTENT_EDITOR: 1,
    ADMIN: 3,
  
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Get user's current role level
    const userRoleLevel = roleHierarchy[req.user.role];

    // Determine minimum role level required for access
    const requiredLevel = Math.min(...allowedRoles.map(role => roleHierarchy[role]));

    // Reject if user role level is too low
    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};



// ========== Validation Middleware ==========
// Validates request body using Joi schema before proceeding.
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    // Return first validation error message
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    next();
  };
};


