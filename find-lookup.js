import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function findLookupTables() {
  try {
    console.log('🔍 Checking available schemas...');
    const schemas = await executeQuery('SELECT DISTINCT TABLE_SCHEMA FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA');
    console.log('Available schemas:', schemas.map(s => s.TABLE_SCHEMA));
    
    console.log('\n🔍 Looking for lookup tables...');
    const lookupTables = await executeQuery(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%lookup%' OR TABLE_NAME LIKE '%Lookup%'
    `);
    console.log('Lookup tables found:', lookupTables);
    
    if (lookupTables.length === 0) {
      console.log('\n🔍 No lookup tables found. Let me check for other reference tables...');
      const refTables = await executeQuery(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%status%' OR TABLE_NAME LIKE '%priority%' OR TABLE_NAME LIKE '%type%'
        OR TABLE_NAME LIKE '%Status%' OR TABLE_NAME LIKE '%Priority%' OR TABLE_NAME LIKE '%Type%'
      `);
      console.log('Reference tables found:', refTables);
    }
    
    // Let's also check what's in the zendesk schema
    console.log('\n🔍 Tables in zendesk schema:');
    const zendeskTables = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'zendesk'
      ORDER BY TABLE_NAME
    `);
    zendeskTables.forEach(table => console.log(`- ${table.TABLE_NAME}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findLookupTables();
