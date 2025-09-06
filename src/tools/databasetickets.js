const { executeQuery } = require('./zendesksqlserver');

async function getITTickets() {
    try {
        const query = `
            SELECT t.*, o.name as organization_name 
            FROM Tickets t
            JOIN Organizations o ON t.organization_id = o.id
            WHERE o.name LIKE '%IT%'
            ORDER BY t.created_at DESC
        `;
        
        const tickets = await executeQuery(query);
        return tickets;
    } catch (err) {
        console.error('Error getting IT tickets:', err);
        throw err;
    }
}

module.exports = {
    getITTickets
};