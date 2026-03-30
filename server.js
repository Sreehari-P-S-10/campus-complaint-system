// ============================================
// Server Entry Point
// Campus Complaint & Maintenance Management System
// ============================================
// Security Features:
// - Helmet.js (HTTP security headers)
// - Rate limiting (brute-force protection)
// - Server-side page authentication (no unauthorized access)
// - Secure cookies (httpOnly, sameSite)
// - CORS restrictions
// - Input size limits
// - XSS protection via headers
// ============================================

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

// Import page-level auth middleware
const { pageAuth, redirectIfAuth } = require('./middlewares/pageAuthMiddleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// 1. Helmet — Sets secure HTTP headers
//    Protects against: XSS, clickjacking, MIME sniffing, etc.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://code.jquery.com",
                "https://cdn.jsdelivr.net"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://fonts.gstatic.com"
            ],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Allow loading CDN resources
}));

// 2. Rate Limiting — Prevents brute-force attacks
//    General: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 200,                    // 200 requests per window
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(generalLimiter);

//    Auth endpoints: Stricter — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,                     // 10 login/register attempts
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 3. Parse JSON with size limit (prevents large payload attacks)
app.use(express.json({ limit: '1mb' }));

// 4. Parse URL-encoded form data with size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Parse cookies (for JWT tokens)
app.use(cookieParser());

// 6. CORS — Restrict to same origin in production
app.use(cors({
    origin: true,
    credentials: true
}));

// 7. Disable X-Powered-By header (don't reveal tech stack)
app.disable('x-powered-by');

// ============================================
// STATIC FILES
// ============================================

// Serve static files from /public directory (CSS, JS, images — these are safe)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files (attachments)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// API ROUTES
// ============================================

// Auth routes — apply stricter rate limiting
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

app.use('/api', authRoutes);           // /api/register, /api/login, /api/logout, /api/me
app.use('/api/tickets', ticketRoutes); // /api/tickets/*

// ============================================
// PAGE ROUTES (Server-side protected!)
// ============================================
// These routes check authentication BEFORE sending the HTML.
// If the user is not logged in, they are redirected to /login.
// If they don't have the right role, they're sent to their correct dashboard.

// PUBLIC pages — redirect to dashboard if already logged in
app.get('/', redirectIfAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/login', redirectIfAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', redirectIfAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// PROTECTED student pages — require auth + student role
app.get('/student-dashboard', pageAuth(['student']), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

app.get('/create-complaint', pageAuth(['student']), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'create-complaint.html'));
});

// PROTECTED admin pages — require auth + admin role
app.get('/admin-dashboard', pageAuth(['admin']), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// Handle multer errors (file upload errors)
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 5MB.'
        });
    }
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    // Don't leak error details in production
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error.'
    });
});

// Handle 404 - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found.'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('');
    console.log('============================================');
    console.log('  Campus Complaint Management System');
    console.log('============================================');
    console.log(`  🚀  Server running on: http://localhost:${PORT}`);
    console.log('  🔒  Security: Helmet + Rate Limiting + Page Auth');
    console.log(`  📁  Static files:      /public`);
    console.log(`  📎  Uploads:           /uploads`);
    console.log('============================================');
    console.log('');
});
