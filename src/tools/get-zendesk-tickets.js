import { executeQuery } from '../zendesk-sqlserver';

/**
 * Tool to fetch all Zendesk tickets from the database.
 */
export async function Get_Zendesk_Tickets() {
    const query = 'EXEC [zendesk].[sp_GetAllTickets]';
    const results = await executeQuery(query);
    console.log(results);
}
