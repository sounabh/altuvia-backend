// ============= SECURITY MIDDLEWARE =============
// File: middleware/security.js
// Purpose: Improve security with headers, rate limiting, and session enforcement

import rateLimit from 'express-rate-limit'; // Middleware for rate limiting to prevent abuse
import helmet from 'helmet';                // Helps secure Express apps by setting HTTP headers


// ========== Secure HTTP Headers Middleware ==========
// Sets headers to prevent XSS, clickjacking, sniffing, etc.
const secureHeaders = helmet({
  // Restrict what content the browser is allowed to load
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],              // Only allow resources from the same origin
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (you can tighten this if needed)
      styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
      imgSrc: ["'self'", "data:"],         // Allow self and base64 images
      connectSrc: ["'self'"]               // Disallow connecting to 3rd-party APIs
    }
  },
  // HTTP Strict Transport Security: Force HTTPS for 1 year
  hsts: { 
    maxAge: 31536000,                      // 1 year in seconds
    includeSubDomains: true,              // Apply to all subdomains
    preload: true                         // Allow browser preload list
  },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Prevent MIME-sniffing
  noSniff: true,
  // Enable XSS filtering (for older browsers)
  xssFilter: true
});



// ========== Authentication Rate Limiter ==========
// Limits number of login/register attempts to mitigate brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,               // 15-minute window
  max: 5,                                 // Max 5 auth attempts
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,                  // Include rate limit info in headers
  legacyHeaders: false                    // Disable deprecated headers
});



// ========== General API Rate Limiter ==========
// Applies to general API endpoints to avoid abuse from any single IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,               // 15-minute window
  max: 100,                               // Max 100 requests
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});


// ========== 2FA Rate Limiter ==========
// Limits how many times a user can attempt 2FA verification
const twoFALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,               // 15-minute window
  max: 10,                                // Max 10 2FA attempts
  message: { error: 'Too many 2FA attempts. Please try again later.' }
});


// ========== Session Rotation Enforcement ==========
// Force users to re-login if session is older than 30 days (based on `lastLogin`)
const enforceSessionRotation = async (req, res, next) => {
  if (req.user && req.user.lastLogin) {
    const lastLogin = new Date(req.user.lastLogin);
    const now = new Date();

    // Calculate difference in days
    const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return res.status(401).json({ error: 'Session expired. Please re-login.' });
    }
  }

  next(); // Proceed if within session limit
};


// ========== Export Middleware ==========

export default {
  secureHeaders,         // Helmet-secured HTTP headers
  authLimiter,           // Login/Register rate limiter
  apiLimiter,            // General rate limiter
  twoFALimiter,          // 2FA rate limiter
  enforceSessionRotation // Re-login enforcement after 30 days
};
