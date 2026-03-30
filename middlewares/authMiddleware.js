// ============================================
// Authentication Middleware
// Verifies JWT token from cookie or Authorization header
// ============================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    try {
        // Try to get token from cookie first, then from Authorization header
        let token = req.cookies?.token;

        if (!token && req.headers.authorization) {
            // Format: "Bearer <token>"
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                token = parts[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided. Please login first.'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to the request object so controllers can use it
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        next(); // Continue to the next middleware/route handler
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Please login again.'
        });
    }
};

module.exports = authMiddleware;
