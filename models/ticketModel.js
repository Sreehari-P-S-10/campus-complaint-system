// ============================================
// Ticket Model
// Database queries related to ticket/complaint operations
// ============================================

const db = require('../config/db');

const TicketModel = {
    /**
     * Create a new ticket
     * @param {object} data - { user_id, title, description, category, priority }
     * @returns {object} Insert result with insertId
     */
    async create(data) {
        const sql = `INSERT INTO tickets (user_id, title, description, category, priority) 
                     VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [
            data.user_id, data.title, data.description,
            data.category, data.priority || 'Medium'
        ]);
        return result;
    },

    /**
     * Add an attachment record for a ticket
     * @param {number} ticketId
     * @param {string} filePath - Path where file is stored
     * @param {string} originalName - Original filename
     */
    async addAttachment(ticketId, filePath, originalName) {
        const sql = 'INSERT INTO attachments (ticket_id, file_path, original_name) VALUES (?, ?, ?)';
        const [result] = await db.execute(sql, [ticketId, filePath, originalName]);
        return result;
    },

    /**
     * Get all tickets with optional filters (for admin)
     * Joins with users table to get the student name
     * @param {object} filters - { status, category, priority, search }
     * @returns {Array} List of tickets
     */
    async findAll(filters = {}) {
        let sql = `SELECT t.*, u.name AS user_name, u.email AS user_email
                   FROM tickets t
                   JOIN users u ON t.user_id = u.id
                   WHERE 1=1`;
        const params = [];

        if (filters.status) {
            sql += ' AND t.status = ?';
            params.push(filters.status);
        }
        if (filters.category) {
            sql += ' AND t.category = ?';
            params.push(filters.category);
        }
        if (filters.priority) {
            sql += ' AND t.priority = ?';
            params.push(filters.priority);
        }
        if (filters.search) {
            sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ' ORDER BY t.created_at DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    },

    /**
     * Get tickets for a specific user (student's own tickets)
     * @param {number} userId
     * @param {object} filters - { status, category, priority, search }
     * @returns {Array} List of user's tickets
     */
    async findByUserId(userId, filters = {}) {
        let sql = `SELECT t.*, u.name AS user_name, u.email AS user_email
                   FROM tickets t
                   JOIN users u ON t.user_id = u.id
                   WHERE t.user_id = ?`;
        const params = [userId];

        if (filters.status) {
            sql += ' AND t.status = ?';
            params.push(filters.status);
        }
        if (filters.category) {
            sql += ' AND t.category = ?';
            params.push(filters.category);
        }
        if (filters.priority) {
            sql += ' AND t.priority = ?';
            params.push(filters.priority);
        }
        if (filters.search) {
            sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ' ORDER BY t.created_at DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    },

    /**
     * Get a single ticket by ID with its attachments
     * @param {number} id
     * @returns {object|null} Ticket with attachments array
     */
    async findById(id) {
        // Get the ticket
        const ticketSql = `SELECT t.*, u.name AS user_name, u.email AS user_email
                           FROM tickets t
                           JOIN users u ON t.user_id = u.id
                           WHERE t.id = ?`;
        const [tickets] = await db.execute(ticketSql, [id]);
        
        if (tickets.length === 0) return null;

        // Get attachments for this ticket
        const attachSql = 'SELECT * FROM attachments WHERE ticket_id = ?';
        const [attachments] = await db.execute(attachSql, [id]);

        return { ...tickets[0], attachments };
    },

    /**
     * Update ticket status and/or priority (admin action)
     * @param {number} id - Ticket ID
     * @param {object} data - { status, priority }
     */
    async updateStatus(id, data) {
        const fields = [];
        const params = [];

        if (data.status) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.priority) {
            fields.push('priority = ?');
            params.push(data.priority);
        }

        if (fields.length === 0) return null;

        params.push(id);
        const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(sql, params);
        return result;
    },

    /**
     * Delete a ticket
     * @param {number} id
     */
    async delete(id) {
        const sql = 'DELETE FROM tickets WHERE id = ?';
        const [result] = await db.execute(sql, [id]);
        return result;
    },

    /**
     * Get overall statistics (for admin dashboard)
     * @returns {object} Stats with counts
     */
    async getStats() {
        const sql = `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_count,
            SUM(CASE WHEN category = 'Hostel' THEN 1 ELSE 0 END) AS hostel_count,
            SUM(CASE WHEN category = 'WiFi' THEN 1 ELSE 0 END) AS wifi_count,
            SUM(CASE WHEN category = 'Classroom' THEN 1 ELSE 0 END) AS classroom_count,
            SUM(CASE WHEN category = 'Mess' THEN 1 ELSE 0 END) AS mess_count,
            SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS high_priority_count
        FROM tickets`;
        const [rows] = await db.execute(sql);
        return rows[0];
    },

    /**
     * Get statistics for a specific user (student dashboard)
     * @param {number} userId
     * @returns {object} Stats for that user
     */
    async getUserStats(userId) {
        const sql = `SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_count
        FROM tickets WHERE user_id = ?`;
        const [rows] = await db.execute(sql, [userId]);
        return rows[0];
    }
};

module.exports = TicketModel;
