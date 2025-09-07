import { zendeskClient } from './zendesk-client';
import { executeQuery } from './zendesk-sqlserver';

/**
 * Example function to integrate Zendesk API and SQL Server
 */
async function syncZendeskTicketsToDatabase() {
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

// Example usage
syncZendeskTicketsToDatabase().catch(console.error);

// Example usage of SQL Server module
async function Get_Zendesk_Tickets() {
    const query = 'EXEC [zendesk].[sp_GetAllTickets]';
    const results = await executeQuery(query);
    console.log(results);
}

example().catch(console.error);
