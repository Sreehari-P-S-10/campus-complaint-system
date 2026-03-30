// ============================================
// Seed Admin Account
// Run this once to create the default admin user
// Usage: node seed-admin.js
// ============================================

const bcrypt = require('bcryptjs');
const db = require('./config/db');
require('dotenv').config();

async function seedAdmin() {
    try {
        console.log('🔄 Creating default admin account...');

        // Admin credentials
        const admin = {
            name: 'Campus Admin',
            email: 'admin@campus.edu',
            password: 'admin123',
            role: 'admin'
        };

        // Check if admin already exists
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [admin.email]);
        if (existing.length > 0) {
            console.log('ℹ️  Admin account already exists. Skipping.');
            process.exit(0);
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);

        // Insert admin user
        await db.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [admin.name, admin.email, hashedPassword, admin.role]
        );

        console.log('');
        console.log('✅ Default admin account created successfully!');
        console.log('============================================');
        console.log('  📧  Email:    admin@campus.edu');
        console.log('  🔑  Password: admin123');
        console.log('  👤  Role:     admin');
        console.log('============================================');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the admin password after first login in production!');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error.message);
        process.exit(1);
    }
}

seedAdmin();
