import { zendeskClient } from './zendesk-client.js';
import { executeQuery } from './zendesk-sqlserver.js';

/**
 * Example function to integrate Zendesk API and SQL Server
 */
export async function syncZendeskTicketsToDatabase() {
    try {
        // Fetch tickets from Zendesk
        const tickets = await zendeskClient.listTickets();

        // Iterate over tickets and insert them into SQL Server
        for (const ticket of tickets.tickets) {
            const query = `INSERT INTO Tickets (id, subject, status, created_at) 
                           VALUES (@id, @subject, @status, @created_at)`;
            const params = {
                id: ticket.id,
                subject: ticket.subject,
                status: ticket.status,
                created_at: ticket.created_at
            };

            await executeQuery(query, params);
        }

        console.log('✅ Tickets synced successfully to the database.');
    } catch (error) {
        console.error('❌ Error syncing tickets:', error);
    }
}

/**
 * Get all Zendesk tickets from SQL Server
 */
export async function getZendeskTickets() {
    try {
        const query = 'EXEC [zendesk].[sp_GetAllTickets]';
        const results = await executeQuery(query);
        return results;
    } catch (error) {
        console.error('❌ Error getting tickets from database:', error);
        throw error;
    }
}

/**
 * Get IT tickets from SQL Server
 */
export async function getITTickets() {
    try {
        const query = `
            SELECT t.*, o.name as organization_name 
            FROM zendesk.tbl_Ticket t
            JOIN zendesk.tbl_groupandorg o ON t.GroupId = o.SourceId
            WHERE o.name LIKE '%IT%'
            ORDER BY t.created DESC
        `;
        
        const tickets = await executeQuery(query);
        return tickets;
    } catch (error) {
        console.error('Error getting IT tickets:', error);
        throw error;
    }
}