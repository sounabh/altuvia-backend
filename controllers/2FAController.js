// ============= 2FA CONTROLLER =============

import  { generate2FASecret, verify2FAToken, generateQRCode }  from '../utils/adminAuth.js'; // Utility functions for 2FA
import  { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient();

// ------------------------------
// Generate 2FA secret and QR code
// ------------------------------
export const setup2FA = async (req, res) => {
  try {
    const user = await prisma.admin_User.findUnique({
      where: { id: req.user.id }
    });

    if (user.is2FAEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate 2FA secret and otpauth URL
    const secret = generate2FASecret(user.email);

    // Generate QR code from otpauth URL
    const qrCode = await generateQRCode(secret.otpauth_url);

    // Temporarily store the secret (2FA not enabled yet)
    await prisma.admin_User.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 }
    });

    res.json({
      message: 'Scan the QR code with your authenticator app and verify with a token',
      qrCode,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA setup failed' });
  }
};

// ------------------------------
// Verify token and enable 2FA
// ------------------------------
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await prisma.admin_User.findUnique({
      where: { id: req.user.id }
    });

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }

    if (user.is2FAEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Verify the token
    const isValid = verify2FAToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    // Enable 2FA after verification
    await prisma.admin_User.update({
      where: { id: user.id },
      data: { is2FAEnabled: true }
    });

    res.json({ message: '2FA enabled successfully' });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
};

// ------------------------------
// Disable 2FA after verifying token
// ------------------------------
export const disable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await prisma.admin_User.findUnique({
      where: { id: req.user.id }
    });

    if (!user.is2FAEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const isValid = verify2FAToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    // Remove secret and disable 2FA
    await prisma.admin_User.update({
      where: { id: req.user.id },
      data: {
        is2FAEnabled: false,
        twoFactorSecret: null
      }
    });

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ------------------------------
// Get current user's 2FA status
// ------------------------------
export const get2FAStatus = async (req, res) => {
  try {
    const user = await prisma.admin_User.findUnique({
      where: { id: req.user.id },
      select: { is2FAEnabled: true }
    });

    res.json({ is2FAEnabled: user.is2FAEnabled });

  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
};


