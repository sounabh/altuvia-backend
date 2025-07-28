// ============= PRISMA SCHEMA =============
// schema.prisma





// ============= ENVIRONMENT VARIABLES =============
// .env
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/uniapp"
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_TEMP_SECRET=your-super-secret-temp-key-here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
TEMP_TOKEN_EXPIRY=5m
BCRYPT_ROUNDS=12
PORT=3000

// ============= PACKAGE.JSON DEPENDENCIES =============
/*
{
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "express-rate-limit": "^6.7.0",
    "helmet": "^6.1.5",
    "@prisma/client": "^4.15.0",
    "joi": "^17.9.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "prisma": "^4.15.0",
    "nodemon": "^2.0.22"
  }
}
*/



// ============= VALIDATION SCHEMAS =============
// utils/validation.js









// ============= ROUTES =============
// routes/auth.js


// ============= MAIN APP =============
// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { secureHeaders, apiLimiter } = require('./middleware/security');

const app = express();

// Security middleware
app.use(secureHeaders);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

// ============= DATABASE SETUP SCRIPT =============
// scripts/setup.js


// ============= FRONTEND EXAMPLE (React) =============
// Example frontend implementation
/*
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    
    if (response.data.requires2FA) {
      return { requires2FA: true, tempToken: response.data.tempToken };
    }

    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
    setUser(response.data.user);
    
    return { success: true };
  };

  const verify2FA = async (tempToken, token) => {
    const response = await axios.post('/api/auth/2fa/login', { tempToken, token });
    
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
    setUser(response.data.user);
    
    return { success: true };
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    verify2FA,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// components/TwoFactorSetup.js
import { useState } from 'react';
import axios from 'axios';

const TwoFactorSetup = () => {
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const setup2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/2fa/setup');
      setQrCode(response.data.qrCode);
      setManualKey(response.data.manualEntryKey);
      setStep(2);
    } catch (error) {
      alert('2FA setup failed');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/2fa/verify', { token });
      alert('2FA enabled successfully!');
      setStep(3);
    } catch (error) {
      alert('Invalid token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Enable Two-Factor Authentication</h2>
          <p className="mb-4">Secure your account with 2FA</p>
          <button
            onClick={setup2FA}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Setup 2FA'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>
          <div className="mb-4">
            <img src={qrCode} alt="QR Code" className="mx-auto" />
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Or enter manually:</p>
            <code className="bg-gray-100 p-2 rounded text-sm break-all">{manualKey}</code>
          </div>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            maxLength="6"
          />
          <button
            onClick={verify2FA}
            disabled={loading || token.length !== 6}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">✓ 2FA Enabled</h2>
          <p>Your account is now protected with two-factor authentication.</p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
*/

// ============= PACKAGE.JSON SCRIPTS =============
/*
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "setup": "node scripts/setup.js",
    "cleanup": "node -e \"require('./scripts/setup').cleanupExpiredTokens()\"",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
*/

// ============= NGINX CONFIGURATION EXAMPLE =============
/*
server {
    listen 80;
    server_name your-domain.com;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;
    
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
*/

// ============= DEPLOYMENT CHECKLIST =============
/*
SECURITY CHECKLIST:
✓ Environment variables configured
✓ Strong JWT secrets generated
✓ Database secured
✓ HTTPS enabled
✓ Rate limiting configured
✓ Input validation implemented
✓ Password complexity enforced
✓ 2FA implemented
✓ Session management secure
✓ Error handling doesn't leak info
✓ CORS properly configured
✓ Security headers set
✓ Database migrations run
✓ Admin account created
✓ Monitoring/logging setup
*/
















// ============= PRISMA SCHEMA MODELS =============
// Add this to your schema.prisma file

model Program {
  id                    String    @id @default(uuid()) @db.Uuid
  universityId          String    @db.Uuid
  
  // Basic Program Information
  programName           String
  programSlug           String
  degreeType            String?
  programLength         Int?      // Duration in years
  specializations       String?
  programDescription    String?
  curriculumOverview    String?
  admissionRequirements String?
  
  // Financial Information
  programTuitionFees    Float?
  programAdditionalFees Float?
  
  // New Required Fields
  avgEntranceExamScore  Float?    // Average entrance exam score
  externalLinks         Json?     // Store multiple external links as JSON
  syllabusUrl           String?   // URL to uploaded PDF syllabus
  
  // SEO Fields
  programMetaTitle      String?
  programMetaDescription String?
  
  // Status and Timestamps
  isActive              Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  university            University @relation(fields: [universityId], references: [id], onDelete: Cascade)
  rankings              ProgramRanking[]
  
  @@unique([universityId, programSlug])
}

model ProgramRanking {
  id         String   @id @default(uuid()) @db.Uuid
  programId  String   @db.Uuid
  year       Int      // Ranking year
  rank       Int      // Program rank for that year
  rankingBy  String   // Organization that provided the ranking
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  program    Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
  
  @@unique([programId, year, rankingBy])
}

// ============= MIDDLEWARE =============
// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configure multer for PDF syllabus upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/syllabus/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'syllabus-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for PDF only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for syllabus upload'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = { upload };

// ============= VALIDATION MIDDLEWARE =============
// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

// Program validation rules
const programValidationRules = () => {
  return [
    body('programName')
      .notEmpty()
      .withMessage('Program name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Program name must be between 2 and 200 characters'),
    
    body('programSlug')
      .notEmpty()
      .withMessage('Program slug is required')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Program slug must contain only lowercase letters, numbers, and hyphens'),
    
    body('degreeType')
      .optional()
      .isIn(['Bachelor', 'Master', 'PhD', 'Diploma', 'Certificate'])
      .withMessage('Invalid degree type'),
    
    body('programLength')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Program length must be between 1 and 10 years'),
    
    body('programTuitionFees')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tuition fees must be a positive number'),
    
    body('programAdditionalFees')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Additional fees must be a positive number'),
    
    body('avgEntranceExamScore')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Average entrance exam score must be between 0 and 100'),
    
    body('externalLinks')
      .optional()
      .isArray()
      .withMessage('External links must be an array'),
    
    body('externalLinks.*.title')
      .optional()
      .notEmpty()
      .withMessage('Link title is required'),
    
    body('externalLinks.*.url')
      .optional()
      .isURL()
      .withMessage('Invalid URL format')
  ];
};

// Ranking validation rules
const rankingValidationRules = () => {
  return [
    body('year')
      .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
      .withMessage('Year must be between 2000 and next year'),
    
    body('rank')
      .isInt({ min: 1 })
      .withMessage('Rank must be a positive integer'),
    
    body('rankingBy')
      .notEmpty()
      .withMessage('Ranking organization is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Ranking organization name must be between 2 and 100 characters')
  ];
};

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  programValidationRules,
  rankingValidationRules,
  validate
};

// ============= PROGRAM CONTROLLER =============
// controllers/programController.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

class ProgramController {
  
  // Get all programs with filtering and pagination
  async getAllPrograms(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        degreeType,
        minFees,
        maxFees,
        programLength,
        minScore,
        maxScore,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build filter conditions
      const where = {
        isActive: true,
        ...(degreeType && { degreeType }),
        ...(programLength && { programLength: parseInt(programLength) }),
        ...(minFees && { programTuitionFees: { gte: parseFloat(minFees) } }),
        ...(maxFees && { programTuitionFees: { lte: parseFloat(maxFees) } }),
        ...(minScore && { avgEntranceExamScore: { gte: parseFloat(minScore) } }),
        ...(maxScore && { avgEntranceExamScore: { lte: parseFloat(maxScore) } }),
        ...(search && {
          OR: [
            { programName: { contains: search, mode: 'insensitive' } },
            { programDescription: { contains: search, mode: 'insensitive' } },
            { specializations: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // If both min and max fees are provided, use between condition
      if (minFees && maxFees) {
        where.programTuitionFees = {
          gte: parseFloat(minFees),
          lte: parseFloat(maxFees)
        };
      }

      // If both min and max scores are provided, use between condition
      if (minScore && maxScore) {
        where.avgEntranceExamScore = {
          gte: parseFloat(minScore),
          lte: parseFloat(maxScore)
        };
      }

      const programs = await prisma.program.findMany({
        where,
        include: {
          university: {
            select: {
              id: true,
              universityName: true,
              universitySlug: true
            }
          },
          rankings: {
            orderBy: { year: 'desc' },
            take: 3 // Get latest 3 rankings for comparison
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit)
      });

      const totalCount = await prisma.program.count({ where });
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        data: {
          programs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching programs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch programs',
        error: error.message
      });
    }
  }

  // Get single program by ID or slug
  async getProgramById(req, res) {
    try {
      const { id } = req.params;
      
      // Check if id is UUID format or slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const program = await prisma.program.findFirst({
        where: isUUID ? { id } : { programSlug: id },
        include: {
          university: {
            select: {
              id: true,
              universityName: true,
              universitySlug: true,
              universityCity: true,
              universityState: true,
              universityCountry: true
            }
          },
          rankings: {
            orderBy: { year: 'desc' }
          }
        }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      res.json({
        success: true,
        data: program
      });

    } catch (error) {
      console.error('Error fetching program:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch program',
        error: error.message
      });
    }
  }

  // Create new program
  async createProgram(req, res) {
    try {
      const {
        universityId,
        programName,
        programSlug,
        degreeType,
        programLength,
        specializations,
        programDescription,
        curriculumOverview,
        admissionRequirements,
        programTuitionFees,
        programAdditionalFees,
        avgEntranceExamScore,
        externalLinks,
        programMetaTitle,
        programMetaDescription
      } = req.body;

      // Check if university exists
      const university = await prisma.university.findUnique({
        where: { id: universityId }
      });

      if (!university) {
        return res.status(404).json({
          success: false,
          message: 'University not found'
        });
      }

      // Check if program slug already exists for this university
      const existingProgram = await prisma.program.findUnique({
        where: {
          universityId_programSlug: {
            universityId,
            programSlug
          }
        }
      });

      if (existingProgram) {
        return res.status(400).json({
          success: false,
          message: 'Program slug already exists for this university'
        });
      }

      // Handle syllabus file upload
      let syllabusUrl = null;
      if (req.file) {
        syllabusUrl = `/uploads/syllabus/${req.file.filename}`;
      }

      const program = await prisma.program.create({
        data: {
          universityId,
          programName,
          programSlug,
          degreeType,
          programLength: programLength ? parseInt(programLength) : null,
          specializations,
          programDescription,
          curriculumOverview,
          admissionRequirements,
          programTuitionFees: programTuitionFees ? parseFloat(programTuitionFees) : null,
          programAdditionalFees: programAdditionalFees ? parseFloat(programAdditionalFees) : null,
          avgEntranceExamScore: avgEntranceExamScore ? parseFloat(avgEntranceExamScore) : null,
          externalLinks: externalLinks ? JSON.parse(externalLinks) : null,
          syllabusUrl,
          programMetaTitle,
          programMetaDescription
        },
        include: {
          university: {
            select: {
              universityName: true,
              universitySlug: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Program created successfully',
        data: program
      });

    } catch (error) {
      console.error('Error creating program:', error);
      
      // Clean up uploaded file if program creation fails
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create program',
        error: error.message
      });
    }
  }

  // Update program
  async updateProgram(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Check if program exists
      const existingProgram = await prisma.program.findUnique({
        where: { id }
      });

      if (!existingProgram) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      // Handle numeric fields
      if (updateData.programLength) {
        updateData.programLength = parseInt(updateData.programLength);
      }
      if (updateData.programTuitionFees) {
        updateData.programTuitionFees = parseFloat(updateData.programTuitionFees);
      }
      if (updateData.programAdditionalFees) {
        updateData.programAdditionalFees = parseFloat(updateData.programAdditionalFees);
      }
      if (updateData.avgEntranceExamScore) {
        updateData.avgEntranceExamScore = parseFloat(updateData.avgEntranceExamScore);
      }

      // Handle external links JSON
      if (updateData.externalLinks && typeof updateData.externalLinks === 'string') {
        updateData.externalLinks = JSON.parse(updateData.externalLinks);
      }

      // Handle syllabus file upload
      if (req.file) {
        // Delete old syllabus file if exists
        if (existingProgram.syllabusUrl) {
          const oldFilePath = path.join(__dirname, '..', existingProgram.syllabusUrl);
          try {
            await fs.unlink(oldFilePath);
          } catch (error) {
            console.error('Error deleting old syllabus file:', error);
          }
        }
        updateData.syllabusUrl = `/uploads/syllabus/${req.file.filename}`;
      }

      const updatedProgram = await prisma.program.update({
        where: { id },
        data: updateData,
        include: {
          university: {
            select: {
              universityName: true,
              universitySlug: true
            }
          },
          rankings: {
            orderBy: { year: 'desc' }
          }
        }
      });

      res.json({
        success: true,
        message: 'Program updated successfully',
        data: updatedProgram
      });

    } catch (error) {
      console.error('Error updating program:', error);
      
      // Clean up uploaded file if update fails
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update program',
        error: error.message
      });
    }
  }

  // Delete program
  async deleteProgram(req, res) {
    try {
      const { id } = req.params;

      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      // Delete syllabus file if exists
      if (program.syllabusUrl) {
        const filePath = path.join(__dirname, '..', program.syllabusUrl);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Error deleting syllabus file:', error);
        }
      }

      await prisma.program.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Program deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting program:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete program',
        error: error.message
      });
    }
  }

  // Toggle program status
  async toggleProgramStatus(req, res) {
    try {
      const { id } = req.params;

      const program = await prisma.program.findUnique({
        where: { id }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      const updatedProgram = await prisma.program.update({
        where: { id },
        data: { isActive: !program.isActive }
      });

      res.json({
        success: true,
        message: `Program ${updatedProgram.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { isActive: updatedProgram.isActive }
      });

    } catch (error) {
      console.error('Error toggling program status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle program status',
        error: error.message
      });
    }
  }

  // Add ranking to program
  async addRanking(req, res) {
    try {
      const { id: programId } = req.params;
      const { year, rank, rankingBy } = req.body;

      // Check if program exists
      const program = await prisma.program.findUnique({
        where: { id: programId }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      // Check if ranking already exists for this program, year, and ranking organization
      const existingRanking = await prisma.programRanking.findUnique({
        where: {
          programId_year_rankingBy: {
            programId,
            year: parseInt(year),
            rankingBy
          }
        }
      });

      if (existingRanking) {
        return res.status(400).json({
          success: false,
          message: 'Ranking already exists for this program, year, and ranking organization'
        });
      }

      const ranking = await prisma.programRanking.create({
        data: {
          programId,
          year: parseInt(year),
          rank: parseInt(rank),
          rankingBy
        }
      });

      res.status(201).json({
        success: true,
        message: 'Ranking added successfully',
        data: ranking
      });

    } catch (error) {
      console.error('Error adding ranking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add ranking',
        error: error.message
      });
    }
  }

  // Get program rankings with year-over-year comparison
  async getProgramRankings(req, res) {
    try {
      const { id: programId } = req.params;
      const { years } = req.query; // Optional: specific years to compare

      const program = await prisma.program.findUnique({
        where: { id: programId }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      let whereClause = { programId };
      
      if (years) {
        const yearArray = years.split(',').map(y => parseInt(y));
        whereClause.year = { in: yearArray };
      }

      const rankings = await prisma.programRanking.findMany({
        where: whereClause,
        orderBy: [
          { rankingBy: 'asc' },
          { year: 'desc' }
        ]
      });

      // Group rankings by ranking organization for easy comparison
      const rankingsByOrg = rankings.reduce((acc, ranking) => {
        if (!acc[ranking.rankingBy]) {
          acc[ranking.rankingBy] = [];
        }
        acc[ranking.rankingBy].push(ranking);
        return acc;
      }, {});

      // Calculate year-over-year changes
      const rankingComparison = Object.keys(rankingsByOrg).map(org => {
        const orgRankings = rankingsByOrg[org];
        const comparisons = [];
        
        for (let i = 0; i < orgRankings.length - 1; i++) {
          const current = orgRankings[i];
          const previous = orgRankings[i + 1];
          
          comparisons.push({
            currentYear: current.year,
            currentRank: current.rank,
            previousYear: previous.year,
            previousRank: previous.rank,
            change: previous.rank - current.rank, // Positive means improvement
            percentageChange: ((previous.rank - current.rank) / previous.rank * 100).toFixed(2)
          });
        }
        
        return {
          rankingOrganization: org,
          rankings: orgRankings,
          yearOverYearComparison: comparisons
        };
      });

      res.json({
        success: true,
        data: {
          programId,
          programName: program.programName,
          rankingComparison
        }
      });

    } catch (error) {
      console.error('Error fetching program rankings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch program rankings',
        error: error.message
      });
    }
  }

  // Update ranking
  async updateRanking(req, res) {
    try {
      const { rankingId } = req.params;
      const { year, rank, rankingBy } = req.body;

      const existingRanking = await prisma.programRanking.findUnique({
        where: { id: rankingId }
      });

      if (!existingRanking) {
        return res.status(404).json({
          success: false,
          message: 'Ranking not found'
        });
      }

      const updatedRanking = await prisma.programRanking.update({
        where: { id: rankingId },
        data: {
          year: year ? parseInt(year) : existingRanking.year,
          rank: rank ? parseInt(rank) : existingRanking.rank,
          rankingBy: rankingBy || existingRanking.rankingBy
        }
      });

      res.json({
        success: true,
        message: 'Ranking updated successfully',
        data: updatedRanking
      });

    } catch (error) {
      console.error('Error updating ranking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ranking',
        error: error.message
      });
    }
  }

  // Delete ranking
  async deleteRanking(req, res) {
    try {
      const { rankingId } = req.params;

      const ranking = await prisma.programRanking.findUnique({
        where: { id: rankingId }
      });

      if (!ranking) {
        return res.status(404).json({
          success: false,
          message: 'Ranking not found'
        });
      }

      await prisma.programRanking.delete({
        where: { id: rankingId }
      });

      res.json({
        success: true,
        message: 'Ranking deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting ranking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete ranking',
        error: error.message
      });
    }
  }

  // Get program statistics
  async getProgramStats(req, res) {
    try {
      const totalPrograms = await prisma.program.count();
      const activePrograms = await prisma.program.count({
        where: { isActive: true }
      });
      const inactivePrograms = totalPrograms - activePrograms;

      const programsByDegreeType = await prisma.program.groupBy({
        by: ['degreeType'],
        _count: true,
        where: { isActive: true }
      });

      const avgTuitionFees = await prisma.program.aggregate({
        _avg: {
          programTuitionFees: true
        },
        where: {
          isActive: true,
          programTuitionFees: { not: null }
        }
      });

      res.json({
        success: true,
        data: {
          totalPrograms,
          activePrograms,
          inactivePrograms,
          programsByDegreeType,
          averageTuitionFees: avgTuitionFees._avg.programTuitionFees
        }
      });

    } catch (error) {
      console.error('Error fetching program statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch program statistics',
        error: error.message
      });
    }
  }
}

module.exports = new ProgramController();

// ============= ROUTES =============
// routes/programRoutes.js
const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const { upload } = require('../middleware/upload');
const { 
  programValidationRules, 
  rankingValidationRules, 
  validate 
} = require('../middleware/validation');

// Program CRUD routes
router.get('/', programController.getAllPrograms);
router.get('/stats', programController.getProgramStats);
router.get('/:id', programController.getProgramById);

router.post('/', 
  upload.single('syllabus'),
  programValidationRules(),
  validate,
  programController.createProgram
);

router.put('/:id',
  upload.single('syllabus'),
  programValidationRules(),
  validate,
  programController.updateProgram
);

router.delete('/:id', programController.deleteProgram);
router.patch('/:id/toggle-status', programController.toggleProgramStatus);

// Ranking routes
router.get('/:id/rankings', programController.getProgramRankings);
router.post('/:id/rankings',
  rankingValidationRules(),
  validate,
  programController.addRanking
);

router.put('/rankings/:rankingId',
  rankingValidationRules(),
  validate,
  programController.updateRanking
);

router.delete('/rankings/:rankingId', programController.deleteRanking);

module.exports = router;

// ============= USAGE IN MAIN APP =============
// In your main app.js or server.js, add:
/*
const programRoutes = require('./routes/programRoutes');
app.use('/api/programs', programRoutes);
*/

// ============= SAMPLE API USAGE =============
/*
// Create uploads directory
mkdir -p uploads/syllabus

// Sample API calls:

// 1. Get all programs with filters
GET /api/programs?page=1&limit=10&degreeType=Master&minFees=10000&maxFees=50000

// 2. Create a program with syllabus upload
POST /api/programs
Content-Type: multipart/form-data
{
  "universityId": "uuid",
  "programName": "Master of Computer Science",
  "programSlug": "mcs",
  "degreeType": "Master",
  "programLength": 2,
  "programTuitionFees": 25000,
  "avgEntranceExamScore": 85.5,
  "externalLinks": [
    {"title": "Program Website", "url": "https://example.com/mcs"},
    {"title": "Admission Portal", "url": "https://example.com/apply"}
  ],
  "syllabus": [PDF file]
}

// 3. Add ranking
POST /api/programs/{programId}/rankings
{
  "year": 2024,
  "rank": 15,
  "rankingBy": "QS World University Rankings"
}

// 4. Get rankings with year-over-year comparison
GET /api/programs/{programId}/rankings

// 5. Get programs with filtering
GET /api/programs?search=computer&degreeType=Master&minScore=80&sortBy=avgEntranceExamScore&sortOrder=desc
*/