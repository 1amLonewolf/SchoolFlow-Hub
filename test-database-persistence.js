// test-database-persistence.js
// Simple script to test database persistence using Parse SDK with master key

const Parse = require('parse/node');
require('dotenv').config();

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY // Include master key for server-side operations
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

async function testDatabasePersistence() {
    console.log('Testing database persistence...');
    
    try {
        // Try to authenticate as admin
        console.log('Attempting to log in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin');
        console.log('User ID:', user.id);
        console.log('Username:', user.get('username'));
        console.log('Is Admin:', user.get('isAdmin'));
        
        // Try to query students using master key
        console.log('Attempting to query students with master key...');
        const studentQuery = new Parse.Query('Student');
        studentQuery.limit(3); // Limit to 3 records for testing
        const students = await studentQuery.find({ useMasterKey: true });
        console.log(`✅ Retrieved ${students.length} students`);
        
        // Display sample student data
        if (students.length > 0) {
            console.log('Sample Student Data:');
            students.forEach((student, index) => {
                const attrs = student.attributes;
                console.log(`  ${index + 1}. ID: ${student.id}`);
                console.log(`     Name: ${attrs.name || 'N/A'}`);
                console.log(`     Course: ${attrs.course || 'N/A'}`);
                console.log(`     National ID: ${attrs.nationalID || 'N/A'}`);
            });
        }
        
        // Try to query other data types
        const classesToTest = ['Teacher', 'Course', 'Exam', 'Attendance'];
        for (const className of classesToTest) {
            try {
                console.log(`Attempting to query ${className} with master key...`);
                const query = new Parse.Query(className);
                query.limit(3); // Limit to 3 records for testing
                const results = await query.find({ useMasterKey: true });
                console.log(`✅ Retrieved ${results.length} ${className} records`);
            } catch (error) {
                console.log(`❌ Error querying ${className}: ${error.message}`);
            }
        }
        
        // Try to create a test student record
        console.log('Attempting to create a test student...');
        const Student = Parse.Object.extend('Student');
        const student = new Student();
        student.set('name', 'Test Student');
        student.set('course', 'Test Course');
        student.set('season', 1);
        student.set('startDate', new Date());
        student.set('endDate', new Date(Date.now() + 30*24*60*60*1000)); // 30 days from now
        student.set('nationalID', 'TEST123');
        student.set('phone', '123-456-7890');
        student.set('location', 'Test Location');
        student.set('seasonId', 1);
        student.set('isActive', true);
        student.set('enrollmentDate', new Date());
        
        const savedStudent = await student.save(null, { useMasterKey: true });
        console.log(`✅ Created test student with ID: ${savedStudent.id}`);
        
        // Verify the student was saved by querying it
        console.log('Verifying test student was saved...');
        const verifyQuery = new Parse.Query('Student');
        verifyQuery.equalTo('objectId', savedStudent.id);
        const verifiedStudent = await verifyQuery.first({ useMasterKey: true });
        if (verifiedStudent) {
            console.log('✅ Test student verified in database');
        } else {
            console.log('❌ Could not verify test student in database');
        }
        
        // Clean up - delete the test student
        console.log('Cleaning up test student...');
        await savedStudent.destroy({ useMasterKey: true });
        console.log('✅ Deleted test student');
        
        // Log out
        await Parse.User.logOut();
        console.log('✅ Logged out');
        
        console.log('All tests completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    }
}

testDatabasePersistence();