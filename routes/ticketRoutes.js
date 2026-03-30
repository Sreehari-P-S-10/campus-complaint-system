// ============================================
// Ticket Routes
// All routes require authentication
// ============================================

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// All ticket routes require authentication
router.use(authMiddleware);

// GET /api/tickets/stats - Dashboard statistics (must be BEFORE /:id route)
router.get('/stats', ticketController.getStats);

// POST /api/tickets - Create new ticket (with file upload)
router.post('/', ticketController.upload, ticketController.createTicket);

// GET /api/tickets - Get all tickets (admin: all, student: own)
router.get('/', ticketController.getAllTickets);

// GET /api/tickets/:id - Get single ticket details
router.get('/:id', ticketController.getTicketById);

// PUT /api/tickets/:id/status - Update status/priority (admin only)
router.put('/:id/status', requireRole('admin'), ticketController.updateTicketStatus);

// DELETE /api/tickets/:id - Delete ticket (owner or admin)
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
