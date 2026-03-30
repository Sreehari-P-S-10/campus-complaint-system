// ============================================
// Page Authentication Middleware
// Protects HTML page routes (redirects to /login instead of JSON error)
// This runs SERVER-SIDE before the page is ever sent to the browser
// ============================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to protect page routes.
 * If user is NOT authenticated, redirects to /login.
 * If user IS authenticated, attaches user info to req and continues.
 * 
 * @param {Array} allowedRoles - Optional. If provided, only users with these roles can access.
 */
const pageAuth = (allowedRoles = null) => {
    return (req, res, next) => {
        try {
            // Get token from cookie
            const token = req.cookies?.token;

            if (!token) {
                return res.redirect('/login');
            }

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check role if specified
            if (allowedRoles && !allowedRoles.includes(decoded.role)) {
                // User is logged in but wrong role — redirect to their correct dashboard
                if (decoded.role === 'admin') {
                    return res.redirect('/admin-dashboard');
                } else {
                    return res.redirect('/student-dashboard');
                }
            }

            // Attach user info
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };

            next();
        } catch (error) {
            // Invalid or expired token — clear it and redirect to login
            res.clearCookie('token');
            return res.redirect('/login');
        }
    };
};

/**
 * Middleware for public pages (login, register).
 * If user is ALREADY authenticated, redirects to their dashboard.
 * Prevents logged-in users from seeing the login page.
 */
const redirectIfAuth = (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // User is already logged in — redirect to their dashboard
            if (decoded.role === 'admin') {
                return res.redirect('/admin-dashboard');
            } else {
                return res.redirect('/student-dashboard');
            }
        }
    } catch (error) {
        // Token is invalid/expired — clear it, let them see login page
        res.clearCookie('token');
    }

    next();
};

module.exports = { pageAuth, redirectIfAuth };
