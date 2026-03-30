// ============================================
// Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (no auth required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected route (auth required)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
