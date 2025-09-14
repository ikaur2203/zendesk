import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
        // Test basic connection
        const result = await executeQuery('SELECT @@VERSION as version');
        console.log('✅ Database connection successful!');
        console.log('📊 SQL Server Version:', result[0]?.version);
        
        // Test Zendesk tables
        try {
            const ticketCount = await executeQuery('SELECT COUNT(*) as count FROM zendesk.tbl_Ticket');
            console.log('📋 Total tickets in database:', ticketCount[0]?.count || 0);
            
            // Test other tables
            const userCount = await executeQuery('SELECT COUNT(*) as count FROM zendesk.tbl_User');
            console.log('👥 Total users in database:', userCount[0]?.count || 0);
            
            const orgCount = await executeQuery('SELECT COUNT(*) as count FROM zendesk.tbl_groupandorg');
            console.log('🏢 Total organizations/groups in database:', orgCount[0]?.count || 0);
            
        } catch (error) {
            console.log('⚠️  Zendesk tables not found or accessible:', error.message);
            console.log('💡 Tip: Make sure your Zendesk data is properly imported to Azure SQL Database');
        }
        
        // Test schema information
        try {
            const tables = await executeQuery(`
                SELECT TABLE_SCHEMA as schema_name, TABLE_NAME as table_name, TABLE_TYPE
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'zendesk'
                ORDER BY TABLE_NAME
            `);
            
            if (tables.length > 0) {
                console.log('\n📋 Available Zendesk tables:');
                tables.forEach(table => {
                    console.log(`   - ${table.schema_name}.${table.table_name}`);
                });
            } else {
                console.log('⚠️  No tables found in zendesk schema');
            }
        } catch (error) {
            console.log('⚠️  Could not retrieve schema information:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check your SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD in .env');
        console.log('2. Verify Azure SQL firewall rules allow your IP');
        console.log('3. Test connection manually with SQL Server Management Studio');
        console.log('4. Ensure the database contains imported Zendesk data');
    }
}

testDatabaseConnection();