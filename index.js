// ============= UPDATED SERVER.JS WITH PROGRAM ROUTES =============
import express from 'express';
import cookieParser from 'cookie-parser'; //cookies parsing
import cors from 'cors';//cross origin resource sharing
import 'dotenv/config'; //load environment variables from .env file     
import { PrismaClient } from '@prisma/client'; // Prisma Client for database operations
//import adminAuthRoutes from "./routes/adminRoutes.js"; // Importing admin authentication routes
import userRoutes from "./routes/userRoutes.js";  // Importing user-specific routes
//import programRoutes from "./routes/ProgramRoutes.js"; // Importing program management routes

// Create Prisma Client
const prisma = new PrismaClient();

// Create Express App
const app = express();

// Trust proxy for getting real IP addresses
app.set('trust proxy', 1);


// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://altuvia.vercel.app/'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Test Prisma DB Connection on startup
async function testPrismaConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma successfully connected to PostgreSQL via Supabase');
  } catch (err) {
    console.error('❌ Prisma connection failed:', err.message);
    process.exit(1); // Exit if database connection fails
  }
}
testPrismaConnection();

// ============= ROUTES =============

// Admin auth routes (2FA, JWT, etc.)
//app.use('/api/auth', adminAuthRoutes);

// User-specific routes (like complete profile)
app.use('/api/user', userRoutes);

// Program management routes
//app.use('/api/programs', programRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    message: 'Program Management API',
    version: '1.0.0',
    documentation: 'https://your-docs-url.com',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register admin user',
        'POST /api/auth/login': 'Login admin user',
        'POST /api/auth/refresh': 'Refresh JWT token',
        'POST /api/auth/logout': 'Logout current session',
        'POST /api/auth/logout-all': 'Logout all sessions',
        'POST /api/auth/change-password': 'Change password',
        'GET /api/auth/2fa/status': 'Check 2FA status',
        'POST /api/auth/2fa/setup': 'Setup 2FA',
        'POST /api/auth/2fa/verify': 'Verify 2FA',
        'POST /api/auth/2fa/disable': 'Disable 2FA',
        'POST /api/auth/2fa/login': 'Login with 2FA'
      },
      user: {
        'POST /api/user/complete-profile': 'Complete user profile'
      },
      programs: {
        'GET /api/programs': 'Get all programs with filtering and pagination',
        'GET /api/programs/:id': 'Get program by ID',
        'POST /api/programs': 'Create new program',
        'PUT /api/programs/:id': 'Update program',
        'DELETE /api/programs/:id': 'Delete program'
      },
      departments: {
        'GET /api/programs/departments': 'Get all departments',
        'GET /api/programs/departments/:id': 'Get department by ID',
        'POST /api/programs/departments': 'Create new department',
        'PUT /api/programs/departments/:id': 'Update department',
        'DELETE /api/programs/departments/:id': 'Delete department'
      },
      syllabus: {
        'POST /api/programs/:id/syllabus': 'Upload syllabus for program',
        'GET /api/programs/:id/syllabus': 'Get syllabus for program',
        'DELETE /api/programs/:id/syllabus': 'Delete syllabus for program'
      },
      rankings: {
        'POST /api/programs/:id/rankings': 'Add ranking for program',
        'GET /api/programs/:id/rankings': 'Get rankings for program',
        'PUT /api/programs/rankings/:rankingId': 'Update ranking',
        'DELETE /api/programs/rankings/:rankingId': 'Delete ranking'
      },
      externalLinks: {
        'POST /api/programs/:id/links': 'Add external link for program',
        'GET /api/programs/:id/links': 'Get external links for program',
        'PUT /api/programs/links/:linkId': 'Update external link',
        'DELETE /api/programs/links/:linkId': 'Delete external link'
      }
    }
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  console.log(`📍 Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    suggestion: 'Check the API documentation at GET /api for available routes'
  });
});


// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);

  // Prisma error handling
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      message: 'The requested record was not found'
    });
  }

  // JWT error handling
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired'
    });
  }

  // Validation error handling
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }


  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📋 API Documentation available at: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`\n📚 Available route groups:`);
  console.log(`   🔐 Auth routes: /api/auth/*`);
  console.log(`   👤 User routes: /api/user/*`);
  console.log(`   📖 Program routes: /api/programs/*`);
  console.log(`   🏢 Department routes: /api/programs/departments/*`);
  console.log(`   📄 Syllabus routes: /api/programs/:id/syllabus`);
  console.log(`   📊 Rankings routes: /api/programs/:id/rankings`);
  console.log(`   🔗 External links routes: /api/programs/:id/links`);
  console.log(`\n🔐 Note: Most routes require Authorization: Bearer <token>`);
});

export default app;