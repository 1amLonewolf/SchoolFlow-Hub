// test-parse-connection.js
// Simple script to test Parse connection

require('dotenv').config();

const Parse = require('parse/node');

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY // Include master key for server-side operations
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

async function testConnection() {
    console.log('Testing Back4App connection...');
    
    try {
        // Try to authenticate as admin
        console.log('Attempting to log in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin');
        console.log('User ID:', user.id);
        console.log('Username:', user.get('username'));
        console.log('Is Admin:', user.get('isAdmin'));
        
        // Try to query different classes using master key to bypass permissions
        const classesToTest = ['Student', 'Teacher', 'Course', 'Exam', 'Attendance'];
        
        for (const className of classesToTest) {
            try {
                console.log(`Attempting to query ${className} with master key...`);
                const query = new Parse.Query(className);
                query.limit(3); // Limit to 3 records for testing
                // Use master key to bypass CLP restrictions
                const results = await query.find({ useMasterKey: true });
                console.log(`✅ Retrieved ${results.length} ${className} records`);
                
                // Display sample data
                if (results.length > 0) {
                    console.log(`Sample ${className} Data:`);
                    results.forEach((item, index) => {
                        const attrs = item.attributes;
                        console.log(`  ${index + 1}. ID: ${item.id}`);
                        Object.keys(attrs).forEach(key => {
                            console.log(`     ${key}: ${attrs[key]}`);
                        });
                    });
                }
            } catch (error) {
                console.log(`❌ Error querying ${className}: ${error.message}`);
            }
        }
        
        // Log out
        await Parse.User.logOut();
        console.log('✅ Logged out');
        
        console.log('Test completed!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    }
}

testConnection();