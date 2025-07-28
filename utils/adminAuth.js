// ============= AUTHENTICATION UTILITIES =============
// This file contains helper functions for:
// - Password hashing and comparison
// - JWT token generation and verification
// - Two-Factor Authentication (2FA) using TOTP
// - QR code generation for 2FA setup
// - Generating secure random tokens

import { randomBytes } from 'crypto';             // Node.js module for generating secure random bytes
import { hash as _hash, compare } from 'bcryptjs';           // Library for hashing and comparing passwords
import jwt from 'jsonwebtoken';         // Library for creating and verifying JWTs (JSON Web Tokens)
import speakeasy from 'speakeasy';       // Library for generating and verifying 2FA (Time-based One-Time Passwords)
import { toDataURL } from 'qrcode';             // Library to generate QR codes from strings


const { sign, verify } = jwt;

// ========== Password Hashing & Comparison ==========

/**
 * Hash a plain-text password using bcrypt.
 * 
 * @param {string} password - The user's plain password.
 * @returns {Promise<string>} - Returns a hashed password.
 */
export const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12; // Salt rounds (cost factor)
  return _hash(password, rounds);
};

/**
 * Compare a plain-text password with a hashed password.
 * 
 * @param {string} password - Plain password to verify.
 * @param {string} hash - Stored hashed password.
 * @returns {Promise<boolean>} - Returns true if the password matches.
 */
export const comparePassword = async (password, hash) => {
  return compare(password, hash);
};


// ========== JWT Token Generation ==========

/**
 * Generate a short-lived access token (used for authentication).
 * 
 * @param {object} payload - Data to include in the token (e.g., user ID, role).
 * @returns {string} - Signed JWT access token.
 */
export const generateAccessToken = (payload) => {
  return sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' // Default to 15 minutes
  });
};

/**
 * Generate a longer-lived refresh token (used to get new access tokens).
 * 
 * @param {object} payload - Data to include in the token.
 * @returns {string} - Signed JWT refresh token.
 */
export const generateRefreshToken = (payload) => {
  return sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' // Default to 7 days
  });
};

/**
 * Generate a temporary short-lived token (e.g., for email verification or 2FA).
 * 
 * @param {object} payload - Data to include in the token.
 * @returns {string} - Signed JWT temp token.
 */
export const generateTempToken = (payload) => {
  return sign(payload, process.env.JWT_TEMP_SECRET, {
    expiresIn: process.env.TEMP_TOKEN_EXPIRY || '5m' // Default to 5 minutes
  });
};


// ========== JWT Token Verification ==========

/**
 * Verify a JWT access token.
 * 
 * @param {string} token - JWT access token to verify.
 * @returns {object} - Decoded payload if token is valid.
 */
export const verifyAccessToken = (token) => {
  return verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify a JWT refresh token.
 * 
 * @param {string} token - JWT refresh token to verify.
 * @returns {object} - Decoded payload if token is valid.
 */
export const verifyRefreshToken = (token) => {
  return verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Verify a temporary JWT token.
 * 
 * @param {string} token - Temp token to verify.
 * @returns {object} - Decoded payload if token is valid.
 */
export const verifyTempToken = (token) => {
  return verify(token, process.env.JWT_TEMP_SECRET);
};


// ========== Two-Factor Authentication (2FA) ==========

/**
 * Generate a new 2FA secret key for the user and a URI for QR code.
 * 
 * @param {string} email - User's email address (used in the 2FA app name).
 * @returns {object} - Returns secret object containing base32 key and otpauth URL.
 */
export const generate2FASecret = (email) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `UniApp:${email}`,  // Shows up in authenticator app
    issuer: 'UniApp'
  });
  return secret;
};

/**
 * Verify a 2FA TOTP token (e.g., from Google Authenticator).
 * 
 * @param {string} secret - Base32 encoded secret key.
 * @param {string} token - 6-digit code entered by the user.
 * @returns {boolean} - Returns true if the token is valid.
 */
export const verify2FAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1 // Allows 1 step of drift (e.g., +/-30 seconds)
  });
};


// ========== QR Code Generation ==========

/**
 * Generate a QR code (as data URI) from an otpauth URL.
 * 
 * @param {string} otpauthUrl - The URL representing 2FA info (from speakeasy).
 * @returns {Promise<string>} - Returns a base64 data URL of the QR code.
 */
export const generateQRCode = async (otpauthUrl) => {
  return toDataURL(otpauthUrl);
};


// ========== Secure Random Token Generation ==========

/**
 * Generate a cryptographically secure random token.
 * Useful for password reset tokens, email confirmations, etc.
 * 
 * @returns {string} - A secure random 64-character hexadecimal string.
 */
export const generateSecureToken = () => {
  return randomBytes(32).toString('hex');
};


// ========== Exporting All Functions ==========

export default {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTempToken,
  verifyTempToken,
  generate2FASecret,
  verify2FAToken,
  generateQRCode,
  generateSecureToken
};