import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkLookupTable() {
  try {
    console.log('Checking slgreen.tbl_lookup table structure...');
    
    // First check if the table exists
    const tableExists = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'slgreen' AND TABLE_NAME = 'tbl_lookup'
    `);
    
    if (tableExists.length === 0) {
      console.log('❌ slgreen.tbl_lookup table not found');
      return;
    }
    
    // Get table structure
    const columns = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'slgreen' AND TABLE_NAME = 'tbl_lookup'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 slgreen.tbl_lookup columns:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    // Sample data to understand the structure
    const sampleData = await executeQuery(`
      SELECT TOP 10 * FROM slgreen.tbl_lookup
      ORDER BY Id
    `);
    
    console.log('\n📊 Sample data from slgreen.tbl_lookup:');
    console.log(JSON.stringify(sampleData, null, 2));
    
    // Check for the specific status key the user mentioned
    console.log('\n🔍 Checking for status key 22407340...');
    const specificStatus = await executeQuery(`
      SELECT * FROM slgreen.tbl_lookup WHERE [Key] = '22407340'
    `);
    
    if (specificStatus.length > 0) {
      console.log('Found status key 22407340:');
      console.log(JSON.stringify(specificStatus, null, 2));
    } else {
      console.log('Status key 22407340 not found, checking variations...');
      const keyVariations = await executeQuery(`
        SELECT * FROM slgreen.tbl_lookup WHERE [Key] LIKE '%22407340%'
      `);
      console.log('Key variations:');
      console.log(JSON.stringify(keyVariations, null, 2));
    }
    
    // Check for status and priority entries by different criteria
    const statusData = await executeQuery(`
      SELECT * FROM slgreen.tbl_lookup 
      WHERE GroupName LIKE '%status%' 
         OR Title LIKE '%status%' 
         OR Value LIKE '%status%'
         OR [Schema] LIKE '%status%'
      ORDER BY Id
    `);
    
    if (statusData.length > 0) {
      console.log('\n🔍 Status-related lookup values:');
      console.log(JSON.stringify(statusData, null, 2));
    }
    
    const priorityData = await executeQuery(`
      SELECT * FROM slgreen.tbl_lookup 
      WHERE GroupName LIKE '%priority%' 
         OR Title LIKE '%priority%' 
         OR Value LIKE '%priority%'
         OR [Schema] LIKE '%priority%'
      ORDER BY Id
    `);
    
    if (priorityData.length > 0) {
      console.log('\n🔍 Priority-related lookup values:');
      console.log(JSON.stringify(priorityData, null, 2));
    }
    
    // Check what StatusId values exist in tickets and see if we can find them in lookup
    console.log('\n🔍 Checking StatusId values in tickets...');
    const ticketStatusIds = await executeQuery(`
      SELECT DISTINCT StatusId, COUNT(*) as ticket_count
      FROM zendesk.tbl_Ticket 
      WHERE StatusId IS NOT NULL
      GROUP BY StatusId
      ORDER BY ticket_count DESC
    `);
    
    console.log('StatusId distribution in tickets:');
    console.log(JSON.stringify(ticketStatusIds, null, 2));
    
    // Try to match these StatusIds with lookup keys
    if (ticketStatusIds.length > 0) {
      const statusIdList = ticketStatusIds.map(s => `'${s.StatusId}'`).join(',');
      const matchingLookups = await executeQuery(`
        SELECT * FROM slgreen.tbl_lookup 
        WHERE [Key] IN (${statusIdList})
        ORDER BY Id
      `);
      
      if (matchingLookups.length > 0) {
        console.log('\n✅ Found matching lookup entries for StatusIds:');
        console.log(JSON.stringify(matchingLookups, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLookupTable();
