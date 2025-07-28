// ============= CORRECTED AUTH CONTROLLER =============
// File: controllers/authController.js

import { PrismaClient } from '@prisma/client';
import authUtils from '../utils/adminAuth.js';

const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
  verifyRefreshToken,
  verifyTempToken,
  verify2FAToken,
  generate2FASecret,
  generateQRCode,
  generateSecureToken
} = authUtils;

const prisma = new PrismaClient();

// ========== Register Admin User ==========
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'ADMIN' } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check for duplicate user
    const existingUser = await prisma.admin_User.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new admin user
    const user = await prisma.admin_User.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role === 'ADMIN' ? 'ADMIN' : 'STAFF' // Only allow ADMIN or STAFF
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ message: 'Admin user registered successfully', user });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ========== Login Admin User ==========
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find admin user
    const user = await prisma.admin_User.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed login attempts
      await prisma.admin_User.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Reset failed login attempts on successful password verification
    await prisma.admin_User.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0 }
    });

    // If 2FA is enabled, return temp token
    if (user.is2FAEnabled) {
      const tempToken = generateTempToken({ userId: user.id });
      return res.json({
        requires2FA: true,
        tempToken,
        message: 'Please provide 2FA token to complete login'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Save refresh token to DB
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: tokenExpiry
      }
    });

    // Update last login
    await prisma.admin_User.update({
      where: { id: user.id },
      data: { 
        lastLogin: new Date(),
        lastLoginIP: req.ip || req.connection.remoteAddress
      }
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ========== Verify 2FA Login ==========
export const verify2FALogin = async (req, res) => {
  try {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      return res.status(400).json({ error: 'Temp token and 2FA token are required' });
    }

    // Verify temp JWT
    const decoded = verifyTempToken(tempToken);

    // Fetch user
    const user = await prisma.admin_User.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.is2FAEnabled) {
      return res.status(401).json({ error: 'Invalid request' });
    }

    // Validate 2FA token
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Generate new tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: tokenExpiry
      }
    });

    // Update last login
    await prisma.admin_User.update({
      where: { id: user.id },
      data: { 
        lastLogin: new Date(),
        lastLoginIP: req.ip || req.connection.remoteAddress
      }
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('2FA login error:', error);
    res.status(401).json({ error: '2FA verification failed' });
  }
};

// ========== Setup 2FA ==========
export const setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    // Generate 2FA secret
    const secret = generate2FASecret(req.user.email);
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(secret.otpauth_url);

    // Store secret temporarily (not activated until verified)
    await prisma.admin_User.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 }
    });

    res.json({
      message: '2FA setup initiated',
      qrCode: qrCodeUrl,
      secret: secret.base32,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA setup failed' });
  }
};

// ========== Verify and Enable 2FA ==========
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: '2FA token is required' });
    }

    // Get user's temporary secret
    const user = await prisma.admin_User.findUnique({ where: { id: userId } });
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }

    // Verify the token
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Enable 2FA
    await prisma.admin_User.update({
      where: { id: userId },
      data: { is2FAEnabled: true }
    });

    res.json({ message: '2FA enabled successfully' });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

// ========== Disable 2FA ==========
export const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: '2FA token is required' });
    }

    // Get user
    const user = await prisma.admin_User.findUnique({ where: { id: userId } });
    if (!user.is2FAEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify the token
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Disable 2FA
    await prisma.admin_User.update({
      where: { id: userId },
      data: { 
        is2FAEnabled: false,
        twoFactorSecret: null
      }
    });

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ========== Refresh Token ==========
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { adminUser: true }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = generateAccessToken({
      userId: storedToken.adminUser.id,
      role: storedToken.adminUser.role
    });

    res.json({ accessToken });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

// ========== Logout ==========
export const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// ========== Logout from All Devices ==========
export const logoutAll = async (req, res) => {
  try {
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({ message: 'Logged out from all devices' });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout all failed' });
  }
};

// ========== Change Password ==========
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = await prisma.admin_User.findUnique({ where: { id: req.user.id } });

    // Check if old password matches
    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.admin_User.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash }
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({ message: 'Password changed successfully. Please login again.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
};

// ========== Get User Profile ==========
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.admin_User.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        is2FAEnabled: true,
        phone: true,
        profileImageUrl: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};