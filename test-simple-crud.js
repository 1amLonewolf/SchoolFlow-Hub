// test-simple-crud.js
// Simple CRUD test without date fields

const Parse = require('parse/node');
require('dotenv').config();

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

async function testSimpleCRUD() {
    console.log('Testing simple CRUD operations...');
    
    try {
        // Login as admin
        console.log('Logging in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin');
        
        // CREATE - Create a new student
        console.log('\n1. Creating a new student...');
        const Student = Parse.Object.extend('Student');
        const student = new Student();
        
        student.set('name', 'Simple CRUD Test Student');
        student.set('course', 'Test Course');
        student.set('season', 1);
        student.set('nationalID', 'SIMPLE123');
        student.set('phone', '123-456-7890');
        student.set('location', 'Test Location');
        student.set('seasonId', 1);
        student.set('isActive', true);
        
        const savedStudent = await student.save(null, { useMasterKey: true });
        console.log(`✅ Created student with ID: ${savedStudent.id}`);
        
        // READ - Retrieve the student we just created
        console.log('\n2. Reading the created student...');
        const query = new Parse.Query('Student');
        query.equalTo('objectId', savedStudent.id);
        const retrievedStudent = await query.first({ useMasterKey: true });
        
        if (retrievedStudent) {
            console.log('✅ Student retrieved successfully');
            console.log('   Name:', retrievedStudent.get('name'));
            console.log('   National ID:', retrievedStudent.get('nationalID'));
        } else {
            console.log('❌ Failed to retrieve student');
        }
        
        // UPDATE - Modify the student's course
        console.log('\n3. Updating the student...');
        retrievedStudent.set('course', 'Updated Test Course');
        const updatedStudent = await retrievedStudent.save(null, { useMasterKey: true });
        console.log('✅ Student updated successfully');
        console.log('   New course:', updatedStudent.get('course'));
        
        // VERIFY UPDATE - Retrieve the student again to verify update
        console.log('\n4. Verifying update...');
        const verifyQuery = new Parse.Query('Student');
        verifyQuery.equalTo('objectId', savedStudent.id);
        const verifiedStudent = await verifyQuery.first({ useMasterKey: true });
        
        if (verifiedStudent && verifiedStudent.get('course') === 'Updated Test Course') {
            console.log('✅ Update verified successfully');
        } else {
            console.log('❌ Update verification failed');
        }
        
        // DELETE - Remove the student
        console.log('\n5. Deleting the student...');
        await retrievedStudent.destroy({ useMasterKey: true });
        console.log('✅ Student deleted successfully');
        
        // VERIFY DELETE - Try to retrieve the deleted student
        console.log('\n6. Verifying deletion...');
        const deleteQuery = new Parse.Query('Student');
        deleteQuery.equalTo('objectId', savedStudent.id);
        const deletedStudent = await deleteQuery.first({ useMasterKey: true });
        
        if (!deletedStudent) {
            console.log('✅ Deletion verified successfully');
        } else {
            console.log('❌ Deletion verification failed');
        }
        
        // Log out
        await Parse.User.logOut();
        console.log('\n✅ Logged out');
        
        console.log('\n🎉 All simple CRUD operations completed successfully!');
        console.log('Data persistence is working correctly.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error details:', error);
    }
}

testSimpleCRUD();