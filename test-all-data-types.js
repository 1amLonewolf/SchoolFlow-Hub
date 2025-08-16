// test-all-data-types.js
// Comprehensive test for all data types in the SchoolFlow Hub application

const Parse = require('parse/node');
require('dotenv').config();

// Initialize Parse with environment variables
Parse.initialize(
    process.env.BACK4APP_APP_ID,
    process.env.BACK4APP_JS_KEY,
    process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = process.env.BACK4APP_SERVER_URL;

// Test data for each class
const testData = {
    Student: {
        name: 'Test Student',
        course: 'Test Course',
        season: 1,
        nationalID: 'STU123',
        phone: '123-456-7890',
        location: 'Test Location',
        seasonId: 1,
        isActive: true
    },
    Teacher: {
        name: 'Test Teacher',
        email: 'test@schoolflowhub.com',
        phone: '098-765-4321'
    },
    Course: {
        name: 'Test Course',
        description: 'A test course for verification',
        // assignedTeacher will be set after creating a teacher
    },
    Attendance: {
        // studentId will be set after creating a student
        date: new Date(),
        status: 'Present'
    },
    Exam: {
        // studentId will be set after creating a student
        examType: 'Midterm',
        examCategory: 'General',
        // course will be set after creating a course
        score: 85,
        totalScore: 100,
        date: new Date()
    }
};

async function testAllDataTypes() {
    console.log('Testing data persistence for all data types...\\n');
    
    let testResults = {
        Student: { created: false, retrieved: false, updated: false, deleted: false },
        Teacher: { created: false, retrieved: false, updated: false, deleted: false },
        Course: { created: false, retrieved: false, updated: false, deleted: false },
        Attendance: { created: false, retrieved: false, updated: false, deleted: false },
        Exam: { created: false, retrieved: false, updated: false, deleted: false }
    };
    
    let createdObjects = {};
    
    try {
        // Login as admin
        console.log('1. Logging in as admin...');
        const user = await Parse.User.logIn(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
        console.log('✅ Logged in as admin\\n');
        
        // Test Student CRUD operations
        console.log('2. Testing Student CRUD operations...');
        try {
            // CREATE
            const Student = Parse.Object.extend('Student');
            const student = new Student();
            Object.entries(testData.Student).forEach(([key, value]) => {
                student.set(key, value);
            });
            
            const savedStudent = await student.save(null, { useMasterKey: true });
            testResults.Student.created = true;
            createdObjects.Student = savedStudent;
            console.log(`✅ Created student with ID: ${savedStudent.id}`);
            
            // READ
            const studentQuery = new Parse.Query('Student');
            studentQuery.equalTo('objectId', savedStudent.id);
            const retrievedStudent = await studentQuery.first({ useMasterKey: true });
            if (retrievedStudent) {
                testResults.Student.retrieved = true;
                console.log('✅ Retrieved student successfully');
            }
            
            // UPDATE
            retrievedStudent.set('course', 'Updated Test Course');
            await retrievedStudent.save(null, { useMasterKey: true });
            testResults.Student.updated = true;
            console.log('✅ Updated student successfully');
            
            // Set studentId for Attendance and Exam records
            testData.Attendance.studentId = savedStudent.id;
            testData.Exam.studentId = savedStudent.id;
        } catch (error) {
            console.error('❌ Error with Student operations:', error.message);
        }
        
        // Test Teacher CRUD operations
        console.log('\\n3. Testing Teacher CRUD operations...');
        try {
            // CREATE
            const Teacher = Parse.Object.extend('Teacher');
            const teacher = new Teacher();
            Object.entries(testData.Teacher).forEach(([key, value]) => {
                teacher.set(key, value);
            });
            
            const savedTeacher = await teacher.save(null, { useMasterKey: true });
            testResults.Teacher.created = true;
            createdObjects.Teacher = savedTeacher;
            console.log(`✅ Created teacher with ID: ${savedTeacher.id}`);
            
            // READ
            const teacherQuery = new Parse.Query('Teacher');
            teacherQuery.equalTo('objectId', savedTeacher.id);
            const retrievedTeacher = await teacherQuery.first({ useMasterKey: true });
            if (retrievedTeacher) {
                testResults.Teacher.retrieved = true;
                console.log('✅ Retrieved teacher successfully');
            }
            
            // UPDATE
            retrievedTeacher.set('phone', '111-222-3333');
            await retrievedTeacher.save(null, { useMasterKey: true });
            testResults.Teacher.updated = true;
            console.log('✅ Updated teacher successfully');
            
            // Set assignedTeacher for Course
            testData.Course.assignedTeacher = savedTeacher.id;
        } catch (error) {
            console.error('❌ Error with Teacher operations:', error.message);
        }
        
        // Test Course CRUD operations
        console.log('\\n4. Testing Course CRUD operations...');
        try {
            // CREATE
            const Course = Parse.Object.extend('Course');
            const course = new Course();
            Object.entries(testData.Course).forEach(([key, value]) => {
                course.set(key, value);
            });
            
            const savedCourse = await course.save(null, { useMasterKey: true });
            testResults.Course.created = true;
            createdObjects.Course = savedCourse;
            console.log(`✅ Created course with ID: ${savedCourse.id}`);
            
            // READ
            const courseQuery = new Parse.Query('Course');
            courseQuery.equalTo('objectId', savedCourse.id);
            const retrievedCourse = await courseQuery.first({ useMasterKey: true });
            if (retrievedCourse) {
                testResults.Course.retrieved = true;
                console.log('✅ Retrieved course successfully');
            }
            
            // UPDATE
            retrievedCourse.set('description', 'Updated test course description');
            await retrievedCourse.save(null, { useMasterKey: true });
            testResults.Course.updated = true;
            console.log('✅ Updated course successfully');
            
            // Set course for Exam
            testData.Exam.course = savedCourse.get('name');
        } catch (error) {
            console.error('❌ Error with Course operations:', error.message);
        }
        
        // Test Attendance CRUD operations
        console.log('\\n5. Testing Attendance CRUD operations...');
        try {
            // CREATE (only if we have a student)
            if (testData.Attendance.studentId) {
                const Attendance = Parse.Object.extend('Attendance');
                const attendance = new Attendance();
                Object.entries(testData.Attendance).forEach(([key, value]) => {
                    attendance.set(key, value);
                });
                
                const savedAttendance = await attendance.save(null, { useMasterKey: true });
                testResults.Attendance.created = true;
                createdObjects.Attendance = savedAttendance;
                console.log(`✅ Created attendance record with ID: ${savedAttendance.id}`);
                
                // READ
                const attendanceQuery = new Parse.Query('Attendance');
                attendanceQuery.equalTo('objectId', savedAttendance.id);
                const retrievedAttendance = await attendanceQuery.first({ useMasterKey: true });
                if (retrievedAttendance) {
                    testResults.Attendance.retrieved = true;
                    console.log('✅ Retrieved attendance record successfully');
                }
                
                // UPDATE
                retrievedAttendance.set('status', 'Absent');
                await retrievedAttendance.save(null, { useMasterKey: true });
                testResults.Attendance.updated = true;
                console.log('✅ Updated attendance record successfully');
            } else {
                console.log('⚠️  Skipping Attendance test - no student ID available');
            }
        } catch (error) {
            console.error('❌ Error with Attendance operations:', error.message);
        }
        
        // Test Exam CRUD operations
        console.log('\\n6. Testing Exam CRUD operations...');
        try {
            // CREATE (only if we have a student and course)
            if (testData.Exam.studentId && testData.Exam.course) {
                const Exam = Parse.Object.extend('Exam');
                const exam = new Exam();
                Object.entries(testData.Exam).forEach(([key, value]) => {
                    exam.set(key, value);
                });
                
                const savedExam = await exam.save(null, { useMasterKey: true });
                testResults.Exam.created = true;
                createdObjects.Exam = savedExam;
                console.log(`✅ Created exam record with ID: ${savedExam.id}`);
                
                // READ
                const examQuery = new Parse.Query('Exam');
                examQuery.equalTo('objectId', savedExam.id);
                const retrievedExam = await examQuery.first({ useMasterKey: true });
                if (retrievedExam) {
                    testResults.Exam.retrieved = true;
                    console.log('✅ Retrieved exam record successfully');
                }
                
                // UPDATE
                retrievedExam.set('score', 90);
                await retrievedExam.save(null, { useMasterKey: true });
                testResults.Exam.updated = true;
                console.log('✅ Updated exam record successfully');
            } else {
                console.log('⚠️  Skipping Exam test - missing student ID or course');
            }
        } catch (error) {
            console.error('❌ Error with Exam operations:', error.message);
        }
        
        // CLEANUP - Delete all created objects
        console.log('\\n7. Cleaning up test data...');
        try {
            // Delete in reverse order to avoid foreign key issues
            const deletionOrder = ['Exam', 'Attendance', 'Course', 'Teacher', 'Student'];
            
            for (const className of deletionOrder) {
                if (createdObjects[className]) {
                    try {
                        await createdObjects[className].destroy({ useMasterKey: true });
                        testResults[className].deleted = true;
                        console.log(`✅ Deleted test ${className.toLowerCase()}`);
                    } catch (error) {
                        console.error(`❌ Error deleting test ${className.toLowerCase()}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
        }
        
        // Log out
        await Parse.User.logOut();
        console.log('\\n✅ Logged out\\n');
        
        // Print results summary
        console.log('=== TEST RESULTS SUMMARY ===');
        Object.entries(testResults).forEach(([className, results]) => {
            console.log(`\\n${className}:`);
            console.log(`  Create: ${results.created ? '✅' : '❌'}`);
            console.log(`  Read:   ${results.retrieved ? '✅' : '❌'}`);
            console.log(`  Update: ${results.updated ? '✅' : '❌'}`);
            console.log(`  Delete: ${results.deleted ? '✅' : '❌'}`);
        });
        
        // Calculate overall success
        let totalTests = 0;
        let passedTests = 0;
        
        Object.values(testResults).forEach(results => {
            Object.values(results).forEach(result => {
                totalTests++;
                if (result) passedTests++;
            });
        });
        
        console.log(`\\n=== OVERALL RESULT ===`);
        console.log(`Passed: ${passedTests}/${totalTests} tests`);
        console.log(`Success rate: ${Math.round((passedTests/totalTests)*100)}%`);
        
        if (passedTests === totalTests) {
            console.log('\\n🎉 All tests passed! Data persistence is working correctly for all data types.');
        } else {
            console.log('\\n⚠️  Some tests failed. Data persistence may have issues with certain data types.');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        console.error('Error details:', error);
    }
}

testAllDataTypes();