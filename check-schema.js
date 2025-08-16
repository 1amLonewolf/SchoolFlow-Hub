// check-schema.js
// Check the actual schema of the Student class

const Parse = require('parse/node');
require('dotenv').config();

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

async function checkStudentSchema() {
    console.log('Checking Student class schema...');
    
    try {
        // Login as admin
        console.log('Logging in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin');
        
        // Retrieve a student to examine its schema
        console.log('\nRetrieving a student to examine schema...');
        const query = new Parse.Query('Student');
        query.limit(1);
        const students = await query.find({ useMasterKey: true });
        
        if (students.length > 0) {
            const student = students[0];
            console.log('✅ Student retrieved successfully');
            console.log('\nStudent attributes:');
            
            const attrs = student.attributes;
            Object.keys(attrs).forEach(key => {
                const value = attrs[key];
                const type = typeof value;
                console.log(`  ${key}: ${value} (${type})`);
                
                // If it's an object, show its constructor name
                if (value && typeof value === 'object') {
                    console.log(`    Constructor: ${value.constructor.name}`);
                }
            });
        } else {
            console.log('No students found in database');
        }
        
        // Log out
        await Parse.User.logOut();
        console.log('\n✅ Logged out');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    }
}

checkStudentSchema();