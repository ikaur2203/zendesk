import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkStatusPriority() {
  try {
    // Check for Status and Priority tables
    const tables = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'zendesk' 
      AND TABLE_NAME IN ('tbl_Status', 'tbl_Priority')
    `);
    console.log('Status/Priority tables:', tables);
    
    // Check actual data in tbl_Ticket to see what status/priority values look like
    const sample = await executeQuery(`
      SELECT TOP 5 
        ZendeskId, Subject, StatusId, PriorityId, Created, Modified
      FROM zendesk.tbl_Ticket 
      ORDER BY Created DESC
    `);
    console.log('Sample ticket data:', sample);
    
    // Check for custom fields table which might have status/priority mappings
    const customFields = await executeQuery(`
      SELECT TOP 5 * FROM zendesk.tbl_TicketCustomField
    `);
    console.log('Sample custom fields:', customFields);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStatusPriority();
