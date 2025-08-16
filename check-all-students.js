// check-all-students.js
// Check all students to see if any have the date fields

const Parse = require('parse/node');
require('dotenv').config();

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

async function checkAllStudents() {
    console.log('Checking all students for date fields...');
    
    try {
        // Login as admin
        console.log('Logging in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin');
        
        // Retrieve all students to examine their schemas
        console.log('\nRetrieving all students...');
        const query = new Parse.Query('Student');
        const students = await query.find({ useMasterKey: true });
        
        console.log(`Found ${students.length} students`);
        
        // Check for date fields
        let hasStartDate = false;
        let hasEndDate = false;
        let hasEnrollmentDate = false;
        
        students.forEach((student, index) => {
            const attrs = student.attributes;
            
            if (attrs.startDate) {
                hasStartDate = true;
                console.log(`\nStudent ${index + 1} has startDate: ${attrs.startDate} (${typeof attrs.startDate})`);
            }
            
            if (attrs.endDate) {
                hasEndDate = true;
                console.log(`Student ${index + 1} has endDate: ${attrs.endDate} (${typeof attrs.endDate})`);
            }
            
            if (attrs.enrollmentDate) {
                hasEnrollmentDate = true;
                console.log(`Student ${index + 1} has enrollmentDate: ${attrs.enrollmentDate} (${typeof attrs.enrollmentDate})`);
                if (attrs.enrollmentDate && typeof attrs.enrollmentDate === 'object') {
                    console.log(`  enrollmentDate constructor: ${attrs.enrollmentDate.constructor.name}`);
                }
            }
        });
        
        console.log(`\nSummary:`);
        console.log(`  Students with startDate: ${hasStartDate ? 'Yes' : 'No'}`);
        console.log(`  Students with endDate: ${hasEndDate ? 'Yes' : 'No'}`);
        console.log(`  Students with enrollmentDate: ${hasEnrollmentDate ? 'Yes' : 'No'}`);
        
        // Log out
        await Parse.User.logOut();
        console.log('\n✅ Logged out');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    }
}

checkAllStudents();