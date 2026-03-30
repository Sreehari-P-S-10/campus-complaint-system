// ============================================
// Ticket Controller
// Handles CRUD operations for complaints/tickets
// ============================================

const TicketModel = require('../models/ticketModel');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ---- Multer Configuration for File Upload ----
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomNumber-originalName
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// File filter: only allow images and documents
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX) are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

const ticketController = {
    // Export multer middleware for use in routes
    upload: upload.array('attachments', 5), // Max 5 files per ticket

    /**
     * POST /api/tickets
     * Create a new complaint/ticket
     */
    async createTicket(req, res) {
        try {
            const { title, description, category } = req.body;
            const userId = req.user.id;

            // ---- Input Validation ----
            if (!title || !description || !category) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, description, and category are required.'
                });
            }

            // Validate title length
            if (title.length < 5 || title.length > 255) {
                return res.status(400).json({
                    success: false,
                    message: 'Title must be between 5 and 255 characters.'
                });
            }

            // Validate description length
            if (description.length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Description must be at least 10 characters.'
                });
            }

            // Validate category
            const validCategories = ['Hostel', 'WiFi', 'Classroom', 'Mess'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category. Must be: Hostel, WiFi, Classroom, or Mess.'
                });
            }

            // ---- Create the ticket ----
            const ticketData = {
                user_id: userId,
                title,
                description,
                category,
                priority: req.body.priority || 'Medium'
            };

            const result = await TicketModel.create(ticketData);
            const ticketId = result.insertId;

            // ---- Handle file attachments ----
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    await TicketModel.addAttachment(
                        ticketId,
                        `/uploads/${file.filename}`,
                        file.originalname
                    );
                }
            }

            // Fetch the complete ticket to return
            const ticket = await TicketModel.findById(ticketId);

            res.status(201).json({
                success: true,
                message: 'Complaint submitted successfully!',
                data: ticket
            });

        } catch (error) {
            console.error('Create ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating complaint. Please try again.'
            });
        }
    },

    /**
     * GET /api/tickets
     * Get all tickets (admin sees all, student sees own)
     * Supports query params: status, category, priority, search
     */
    async getAllTickets(req, res) {
        try {
            const filters = {
                status: req.query.status || null,
                category: req.query.category || null,
                priority: req.query.priority || null,
                search: req.query.search || null
            };

            let tickets;

            if (req.user.role === 'admin') {
                // Admin sees all tickets
                tickets = await TicketModel.findAll(filters);
            } else {
                // Student sees only their own tickets
                tickets = await TicketModel.findByUserId(req.user.id, filters);
            }

            res.json({
                success: true,
                data: tickets,
                count: tickets.length
            });

        } catch (error) {
            console.error('Get tickets error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching complaints.'
            });
        }
    },

    /**
     * GET /api/tickets/stats
     * Get dashboard statistics
     */
    async getStats(req, res) {
        try {
            let stats;

            if (req.user.role === 'admin') {
                stats = await TicketModel.getStats();
            } else {
                stats = await TicketModel.getUserStats(req.user.id);
            }

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching statistics.'
            });
        }
    },

    /**
     * GET /api/tickets/:id
     * Get a single ticket by ID with attachments
     */
    async getTicketById(req, res) {
        try {
            const ticketId = req.params.id;
            const ticket = await TicketModel.findById(ticketId);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found.'
                });
            }

            // Students can only view their own tickets
            if (req.user.role === 'student' && ticket.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only view your own complaints.'
                });
            }

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Get ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching complaint.'
            });
        }
    },

    /**
     * PUT /api/tickets/:id/status
     * Update ticket status and/or priority (admin only)
     */
    async updateTicketStatus(req, res) {
        try {
            const ticketId = req.params.id;
            const { status, priority } = req.body;

            // Validate at least one field is provided
            if (!status && !priority) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide status or priority to update.'
                });
            }

            // Validate status value
            if (status) {
                const validStatuses = ['Open', 'In Progress', 'Resolved'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid status. Must be: Open, In Progress, or Resolved.'
                    });
                }
            }

            // Validate priority value
            if (priority) {
                const validPriorities = ['Low', 'Medium', 'High'];
                if (!validPriorities.includes(priority)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid priority. Must be: Low, Medium, or High.'
                    });
                }
            }

            // Check if ticket exists
            const ticket = await TicketModel.findById(ticketId);
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found.'
                });
            }

            // Update the ticket
            await TicketModel.updateStatus(ticketId, { status, priority });

            // Fetch updated ticket
            const updatedTicket = await TicketModel.findById(ticketId);

            res.json({
                success: true,
                message: 'Complaint updated successfully!',
                data: updatedTicket
            });

        } catch (error) {
            console.error('Update ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating complaint.'
            });
        }
    },

    /**
     * DELETE /api/tickets/:id
     * Delete a ticket (owner or admin)
     */
    async deleteTicket(req, res) {
        try {
            const ticketId = req.params.id;

            // Check if ticket exists
            const ticket = await TicketModel.findById(ticketId);
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found.'
                });
            }

            // Only the owner or admin can delete
            if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own complaints.'
                });
            }

            // Delete attachment files from disk
            if (ticket.attachments && ticket.attachments.length > 0) {
                for (const attachment of ticket.attachments) {
                    const filePath = path.join(__dirname, '..', attachment.file_path);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }

            await TicketModel.delete(ticketId);

            res.json({
                success: true,
                message: 'Complaint deleted successfully.'
            });

        } catch (error) {
            console.error('Delete ticket error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while deleting complaint.'
            });
        }
    }
};

module.exports = ticketController;
