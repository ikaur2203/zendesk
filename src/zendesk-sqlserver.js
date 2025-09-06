const sql = require('mssql');

// SQL Server Configuration
const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
        encrypt: true, // Use this if you're on Azure
        trustServerCertificate: true // Use this if needed for development
    }
};

// Create a connection pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', err => {
    console.error('SQL Pool Error:', err);
});

/**
 * Execute a SQL query
 * @param {string} query - The SQL query to execute
 * @param {Object} params - Optional parameters for the query
 * @returns {Promise<any>} - Query results
 */
async function executeQuery(query, params = {}) {
    try {
        await poolConnect; // Ensures that the pool has been created
        
        const request = pool.request();
        
        // Add parameters to the request
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
        });
        
        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('SQL Query Error:', err);
        throw err;
    }
}

/**
 * Close the SQL connection pool
 */
async function closePool() {
    try {
        await pool.close();
    } catch (err) {
        console.error('Error closing pool:', err);
        throw err;
    }
}

module.exports = {
    executeQuery,
    closePool,
    sql // Export sql for direct access to types if needed
};
