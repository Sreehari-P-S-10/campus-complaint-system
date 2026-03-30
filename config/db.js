// ============================================
// Database Configuration
// MySQL Connection Pool using mysql2
// ============================================

const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool (better than single connection for production)
// A pool maintains multiple connections and reuses them
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_complaints',
    waitForConnections: true,
    connectionLimit: 10,          // Max 10 simultaneous connections
    queueLimit: 0                 // Unlimited queued requests
});

// Use promise-based queries (async/await friendly)
const promisePool = pool.promise();

// Test the connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Make sure MySQL is running and the database "campus_complaints" exists.');
        console.error('   Run the schema.sql file first to create the database.');
    } else {
        console.log('✅ Database connected successfully');
        connection.release(); // Release connection back to pool
    }
});

module.exports = promisePool;
