// ============================================
// Authentication Controller
// Handles Register, Login, Logout
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
require('dotenv').config();

const authController = {
    /**
     * POST /api/register
     * Register a new user account
     */
    async register(req, res) {
        try {
            let { name, email, password, confirmPassword } = req.body;

            // Sanitize inputs — strip HTML tags to prevent XSS
            if (name) name = name.replace(/<[^>]*>/g, '').trim();
            if (email) email = email.toLowerCase().trim();

            // ---- Input Validation ----
            if (!name || !email || !password || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required (name, email, password, confirmPassword).'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address.'
                });
            }

            // Validate password length
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long.'
                });
            }

            // Check passwords match
            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match.'
                });
            }

            // Check if email already exists
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists.'
                });
            }

            // ---- Hash password ----
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // ---- Create user ----
            const result = await UserModel.create(name, email, hashedPassword, 'student');

            // Generate JWT token
            const token = jwt.sign(
                { id: result.insertId, email, role: 'student' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Set token as httpOnly cookie (secure, not accessible by JavaScript)
            res.cookie('token', token, {
                httpOnly: true,                        // JS cannot access this cookie
                secure: process.env.NODE_ENV === 'production', // HTTPS only in production
                maxAge: 24 * 60 * 60 * 1000,           // 24 hours
                sameSite: 'strict'                     // Prevent CSRF attacks
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful!',
                data: {
                    id: result.insertId,
                    name,
                    email,
                    role: 'student'
                    // NOTE: Token is NOT sent in body — it's in httpOnly cookie only
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during registration. Please try again.'
            });
        }
    },

    /**
     * POST /api/login
     * Authenticate user and return JWT
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // ---- Input Validation ----
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required.'
                });
            }

            // ---- Find user by email ----
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // ---- Compare password ----
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // ---- Generate JWT ----
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Set token as httpOnly cookie (secure, not accessible by JavaScript)
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            res.json({
                success: true,
                message: 'Login successful!',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                    // NOTE: Token is NOT sent in body — httpOnly cookie only
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during login. Please try again.'
            });
        }
    },

    /**
     * POST /api/logout
     * Clear the auth cookie
     */
    async logout(req, res) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            res.json({
                success: true,
                message: 'Logged out successfully.'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during logout.'
            });
        }
    },

    /**
     * GET /api/me
     * Get current authenticated user's info
     */
    async getMe(req, res) {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error.'
            });
        }
    }
};

module.exports = authController;
