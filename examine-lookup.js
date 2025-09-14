import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function examineSchema() {
  try {
    console.log('🔍 Examining slgreen.tbl_Lookup structure...');
    const structure = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'slgreen' AND TABLE_NAME = 'tbl_Lookup'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns in slgreen.tbl_Lookup:');
    structure.forEach(col => console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE})`));
    
    console.log('\n🔍 Sample data from slgreen.tbl_Lookup...');
    const sample = await executeQuery(`
      SELECT TOP 20 * FROM slgreen.tbl_Lookup 
      ORDER BY Id
    `);
    console.log('Sample data:', sample);
    
    console.log('\n🔍 Checking for status and priority lookups...');
    const statusPriority = await executeQuery(`
      SELECT DISTINCT Type, COUNT(*) as Count
      FROM slgreen.tbl_Lookup 
      GROUP BY Type
      ORDER BY Type
    `);
    console.log('Lookup types:', statusPriority);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

examineSchema();
