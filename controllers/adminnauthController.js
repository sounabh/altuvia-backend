// controllers/adminAuthController.ts

import jwt from 'jsonwebtoken';
import prisma from "../lib/prisma.js";


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Hardcoded credentials
const ADMIN_EMAIL = 'admin@altuvia.com';
const ADMIN_PASSWORD = 'adminaltuvia9622';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Simple validation - no DB password check
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if admin exists, if not create
    let admin = await prisma.admin_User.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (!admin) {
      admin = await prisma.admin_User.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash: 'not-stored',
          firstName: 'Admin',
          lastName: 'User',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        }
      });
    }

    // Update last login
    await prisma.admin_User.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};