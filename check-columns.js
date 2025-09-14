import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkColumns() {
  try {
    console.log('Checking tbl_Ticket column names...');
    const columns = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'zendesk' AND TABLE_NAME = 'tbl_Ticket'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 Available columns in zendesk.tbl_Ticket:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    console.log('\n🔍 Looking for date/time columns...');
    const dateColumns = columns.filter(col => 
      col.DATA_TYPE.includes('date') || 
      col.DATA_TYPE.includes('time') ||
      col.COLUMN_NAME.toLowerCase().includes('date') ||
      col.COLUMN_NAME.toLowerCase().includes('time') ||
      col.COLUMN_NAME.toLowerCase().includes('created') ||
      col.COLUMN_NAME.toLowerCase().includes('updated') ||
      col.COLUMN_NAME.toLowerCase().includes('solved')
    );
    
    if (dateColumns.length > 0) {
      console.log('Date/time related columns:');
      dateColumns.forEach(col => {
        console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();
