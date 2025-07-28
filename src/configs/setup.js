// scripts/setup.js
/*const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utils/auth');

const prisma = new PrismaClient();

async function createMainAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@uniapp.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('Main admin already exists');
      return;
    }

    const passwordHash = await hashPassword(adminPassword);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Main',
        lastName: 'Admin',
        role: 'MAIN_ADMIN',
        status: 'ACTIVE'
      }
    });

    console.log('✅ Main admin created:', admin.email);
    console.log('🔐 Password:', adminPassword);
    console.log('⚠️ Please change the password after first login');

  } catch (error) {
    console.error('❌ Error creating main admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}


async function cleanupExpiredTokens() {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    console.log(`♻️ Cleaned up ${result.count} expired refresh tokens`);
  } catch (error) {
    console.error('❌ Error cleaning up tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run this only if directly invoked (e.g. via `node scripts/setup.js`)
if (require.main === module) {
  createMainAdmin();
}

module.exports = {
  createMainAdmin,
  cleanupExpiredTokens
};
*/