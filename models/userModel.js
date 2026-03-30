// ============================================
// User Model
// Database queries related to user operations
// ============================================

const db = require('../config/db');

const UserModel = {
    /**
     * Create a new user in the database
     * @param {string} name - User's full name
     * @param {string} email - User's email (unique)
     * @param {string} hashedPassword - bcrypt hashed password
     * @param {string} role - 'student' or 'admin'
     * @returns {object} Insert result with insertId
     */
    async create(name, email, hashedPassword, role = 'student') {
        const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(sql, [name, email, hashedPassword, role]);
        return result;
    },

    /**
     * Find a user by their email address
     * @param {string} email
     * @returns {object|null} User record or null
     */
    async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(sql, [email]);
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Find a user by their ID
     * @param {number} id
     * @returns {object|null} User record (without password) or null
     */
    async findById(id) {
        const sql = 'SELECT id, name, email, role, created_at FROM users WHERE id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows.length > 0 ? rows[0] : null;
    }
};

module.exports = UserModel;
