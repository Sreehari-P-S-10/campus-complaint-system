// ============================================
// Role-Based Access Control Middleware
// Restricts routes to specific user roles
// ============================================

/**
 * Factory function that returns middleware to check user roles
 * Usage: requireRole('admin') or requireRole('admin', 'student')
 * @param  {...string} allowedRoles - Roles that are allowed access
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user is set by authMiddleware (must be used AFTER authMiddleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.'
            });
        }

        next(); // User has the required role, continue
    };
};

module.exports = requireRole;
